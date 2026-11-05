# NOVA Retail OS — AGENTS Guide

This file captures high-signal, repo-specific guidance that an agent would likely miss or get wrong without prior context. Every line has been verified against the codebase.

## Monorepo structure

- **`apps/web`** — Next.js App Router frontend (React 19, TypeScript). Entrypoint: `src/app/layout.tsx`. Route segments under `src/app/` map to `/` prefix.
- **`apps/api`** — Express API (NodeNext/ES2022, TypeScript). Entrypoint: `src/server.ts`. All routes prefixed with `/v1/`.
- **`packages/core`** — Database migrations, shared types, and foundation scripts (`smoke-check.mjs`).
- **`packages/ui`** — UI component library (currently minimal; `package.json` only).

Package name scopes: `@nova/web`, `@nova/api`, `@nova/core`, `@nova/ui`.

## Root-level npm scripts (from `package.json`)

| Command | What it does |
|---|---|
| `npm run dev` | Starts the web dev server (`next dev`) |
| `npm run dev:api` | Starts the API dev server (`tsx watch src/server.ts`) |
| `npm run dev` then separately `npm run dev:api` | **Both servers must run separately**. `turbo.json` `dev` tasks are `persistent` and `cache: false`. |
| `npm run build` | Builds web first, then API (`next build` then `tsc -p`) |
| `npm run lint` | Lints web workspace only (`eslint .`). The API has no ESLint config. |
| `npm run typecheck` | Typechecks **both** `@nova/web` and `@nova/api` workspaces. If either fails, the whole command fails (turbo `dependsOn` chain). |
| `npm run test` | Runs the **smoke-check** script (`node packages/core/scripts/smoke-check.mjs`), **not** a test suite. Fails if required files are missing or database security controls are absent. |

**Order matters**: `lint → typecheck → test`. typecheck validates both workspaces; do not run typecheck for just one workspace expecting the other to pass.

## Environment setup

1. Create a dedicated Supabase project.
2. Apply migrations in `packages/core/supabase/migrations/` **in order** (currently only `001_nova_core.sql`).
3. Create the private Supabase storage bucket `nova-documents` (the migration provisions it, but the bucket must exist in the Supabase project dashboard; without it, storage operations will fail).
4. Copy `apps/web/.env.example` → `apps/web/.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_URL` / `SUPABASE_ANON_KEY`
   - `NOVA_WEB_ORIGIN` (default `http://localhost:3000`)
   - `PORT` (default `4000`)
5. **Never commit service-role keys**. Do not check `.env.local` into git.

> `.env.*` is gitignored (per `.gitignore`). `.env.example` is the source of truth for required vars. The `! .env.example` line in `.gitignore` ensures the example file is tracked.

## Authentication & login flow

The app uses **Supabase Auth** with JWT-based authentication. Key points:

- **Login**: Users authenticate via Supabase auth flow (the UI has a `login` page at `apps/web/src/app/login/` — read that file for the exact implementation). The frontend creates a Supabase browser client (`createSupabaseBrowserClient`) and calls `sb.auth.signInWithPassword()`.
- **API auth**: The Express server (`apps/api/src/server.ts`) verifies Supabase JWTs via a middleware function (`auth` in `server.ts`). The `authorization` header must contain `Bearer <supabase-jwt>`.
- **`GET /v1/me`**: Requires a valid Bearer token. Returns the user's active memberships (`organization_id`, `role`, `is_active`) or `401` if session is invalid.
- **`GET /health`**: No auth required; returns `{status: "ok", service: "nova-api", version: "1.0.0"}`.
- **Session persistence**: The API client (`createClient` with `global.headers.Authorization`) persists the session per-request; do not rely on browser-side session storage for API calls.
- **Token refresh**: Supabase client handles auto-refresh, but the API expects a fresh JWT on each request. If the token is expired, the API returns `503 "Supabase is not configured"` or `401 "Invalid session"`.

**Common agent pitfall**: Forgetting to include the `authorization: `Bearer <token>`` header on API requests, or trying to use Supabase browser client methods on the server side.

## API routes (key endpoints)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET /health` | No | Returns service health |
| `GET /v1/me` | Bearer token | Verifies Supabase JWT, returns user's active memberships |
| `POST /v1/documents/upload-url` | Bearer token | Validates document metadata (Zod schema), checks active tenant membership, creates signed Supabase Storage upload URL, returns `{documentId, storagePath, signedUrl, token, expiresInSeconds: 120}` |

**Upload URL flow** (see "Document upload flow" section below for the full split between frontend/backend).

## Database & migrations

- Migrations live in `packages/core/supabase/migrations/001_nova_core.sql`.
- **Apply in order** via the Supabase CLI or dashboard SQL editor:
  ```bash
  supabase migration up --project-ref <ref>
  ```
  or apply the SQL file directly via the Supabase dashboard.
- The migration enables RLS on all tables and creates security definer functions (`is_org_member`, `is_platform_admin`).
- **Critical**: The migration contains RLS policies that gate tenant access. Do not delete or reorder them.
- After applying the migration, run the smoke check: `npm run test`. It verifies that required tokens exist in the migration SQL and source files.

**Storage bucket**: `nova-documents` is a private bucket with:
- 25 MB file size limit
- Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`
- File path pattern: `<org_uuid>/<document_uuid>/<safe_filename>`

**Important**: The bucket name must match `nova-documents` exactly, and the migration's `insert into storage.buckets(...)` must have been applied. If the bucket was created manually before the migration, the migration's `on conflict` update will overwrite the config.

## Document upload flow (agent common pitfall)

The upload flow is split across frontend and backend. **Without help, agents commonly try to use `createSignedUrl` on the frontend instead of the backend endpoint.**

1. **Frontend** (`apps/web/src/app/documents/page.tsx`): User selects a file → the component calls `POST /v1/documents/upload-url` on the API. The frontend does NOT use `createSignedUrl` directly for initial upload.
2. **Backend** (`apps/api/src/server.ts`): `POST /v1/documents/upload-url`:
   - Validates metadata via Zod schema (`organizationId` must be a UUID, `category` must be one of the allowed enums, `sizeBytes` must be `< 25*1024*1024`).
   - Checks that the user has an active membership in the requested organization.
   - Creates a **signed upload URL** via Supabase Storage `createSignedUploadUrl(path, {upsert:false})`.
   - Returns `{documentId, storagePath, signedUrl, token, expiresInSeconds: 120}`.
3. **Frontend then uploads** the file content to the returned `signedUrl`. The `FileUp` component handles this automatically if passed the `signedUrl`; otherwise, use `fetch('signedUrl', {method: 'PUT', body: file})`.
4. After successful storage upload, the frontend inserts a record into the `documents` table via `sb.from("documents").insert({...})`.

**Without help, an agent might**: try to use `storage.from("nova-documents").createSignedUrl()` on the frontend, or skip the backend signed-url step entirely and try to upload directly to Supabase Storage.

## Typecheck & lint quirks

- `npm run typecheck` runs `tsc --noEmit -p tsconfig.json` for **both** `@nova/web` and `@nova/api`. If either fails, the whole command fails. Do not run typecheck on a single workspace expecting the other to pass.
- `npm run lint` only lints the web workspace (`eslint .`). The API has no ESLint config.
- The web `tsconfig.json` has path mappings: `@/*` → `src/*`. Import aliases must use `@/...` (e.g., `@/lib/supabase`, `@/components/ui/...`).
- `@nova/api` uses `module: NodeNext` with `tsconfig.json` `moduleResolution: NodeNext`. No path mappings; imports use relative or node_modules paths.

## Testing

- The only test command is `npm run test`, which executes the **smoke-check** script.
- The smoke check (`packages/core/scripts/smoke-check.mjs`) verifies:
  1. Required files exist at the repo root (`package.json`, `turbo.json`, `apps/web/package.json`, key source files, `packages/core/supabase/migrations/001_nova_core.sql`).
  2. The migration SQL contains required database security tokens: `platform_admins`, `is_platform_admin`, `nova-documents`, `storage.objects`, `documents_member_insert`, `is_org_member`.
  3. The documents page contains expected workflow tokens: `nova-documents`, `createSignedUrl`, `organization_id`, `25*1024*1024`.
- If any required file is missing or a token is absent, the smoke check throws and `npm run test` fails.

**Do not remove or modify the smoke-check script** — it is the repo's verification gate.

## Platform admin setup

- Platform admins are managed via the `public.platform_admins` table.
- To assign the first platform admin, insert the authenticated user's UUID through a SQL admin workflow:
  ```sql
  INSERT INTO public.platform_admins (user_id, access_level, created_by)
  VALUES ('<user-uuid>', 'admin', '<user-uuid>');
  ```
- The `is_platform_admin()` function checks this table. Without at least one row with `access_level='admin'`, the platform admin UI (`apps/web/src/app/admin/page.tsx`) will show `"config"` state and all admin features will be inaccessible.
- Only assign platform admin via trusted SQL/admin workflow; never expose a self-promotion endpoint.

## UI/UX considerations

- The app uses a **metric-grid** pattern throughout panels (see `apps/web/src/app/documents/page.tsx`, `apps/web/src/app/page.tsx`). When adding new pages or panels, follow the same structure: panel head + metric rows with icons, values, and footnotes.
- **Document page** (`apps/web/src/app/documents/page.tsx`):
  - Uses `FileUp` component from `lucide-react` for drag-and-drop/file selection.
  - Validates file size (< 25 MB) and type (PDF, JPG, PNG, WEBP) before upload.
  - Shows organization context (`org` state from membership query).
  - Displays document counts by category.
  - Uses `createSupabaseBrowserClient` for all Supabase operations in the browser.
- **Admin page** (`apps/web/src/app/admin/page.tsx`):
  - Restricted to users with `access_level='admin'` in `platform_admins`.
  - Shows counts of organizations, documents, and users.
  - Displays `"Restricted access"` pill and access-denied messaging if not authenticated as platform admin.
- **Responsive design**: Panels stack vertically on mobile; the layout uses `dashboard-grid` with `grid-cols-1` → `grid-cols-2` → `grid-cols-3` breakpoints.
- **Color palette**: Uses `lucide-react` icons, `#[46564b]` dark text, `#[b6c8bb]` accent teal. globals.css contains base styles; do not override without reading globals.css first.
- **State management**: Minimal; uses React `useState` and `useEffect`. `PlatformAdmin` component shows `"loading" → "allowed"|"config"|"denied"` state transitions based on Supabase auth and database checks.

## Things an agent would likely miss

- Both `npm run dev` **and** `npm run dev:api` must run in separate terminals; there is no single-command full-stack dev startup.
- The smoke-check script is the **only** test runner; there is no Jest/Vitest configuration in the repo.
- `npm run typecheck` checks both workspaces; a common mistake is running it for just one workspace and wondering why the other isn't validated.
- The Express server uses `tsx watch` (not `tsc` + `node`), so types are checked on the fly and hot-reloading works.
- `.env.*` is gitignored **except** `.env.example`. Copying `.env.example` to `.env.local` is a manual step that the README mentions but an agent might forget.
- The API `PORT` env var defaults to `4000` if not set; the web dev server defaults to `3000` (Next.js).
- Migrations must be applied to a **dedicated** Supabase project; running against an existing project with data may cause conflicts.
- The `auth` middleware in `server.ts` checks `url` and `anon` env vars; if they are missing, the API returns `503 "Supabase is not configured"` on every auth-required route.
- Storage bucket `nova-documents` must be created in the Supabase dashboard **and** the migration's `insert into storage.buckets` must have been applied. If the bucket exists but the migration hasn't run, the migration will update it (safe because of `on conflict`).
- The Zod upload-schema in `server.ts` line 11 validates `organizationId` as UUID, `category` enum, `sizeBytes` max `25*1024*1024` (25 MB), and `mimeType` enum. If the frontend sends malformed metadata, the API returns `400 "Invalid document metadata"` with `details: parsed.error.flatten()`.
- Import aliases: `@/lib/supabase` resolves to `src/lib/supabase` (per web tsconfig paths). API imports do not have this alias; use relative paths or node_modules.
- The `is_org_member()` SQL function uses `auth.uid()` which requires the request to be made as an authenticated Supabase user. If calling RLS policies from a non-auth context (e.g., service-role key), the function will behave unexpectedly.
- `npm run build` builds Next.js first, then runs `tsc -p` for the API. If web build fails, API build still runs (but will likely have missing peer dependencies or type errors).