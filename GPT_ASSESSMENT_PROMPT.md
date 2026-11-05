# Prompt for GPT Assessment of NOVA Retail OS

## Context
You have MCP access to Supabase for this repository: NOVA Retail OS (C:\Users\shrir\OneDrive\Desktop\CODE\nova\NOVA)

This prompt guides assessment of the codebase against the AGENTS.md guidance and Supabase setup.

## AGENTS.md Verification

### Check 1: AGENTS.md exists and is complete
- [ ] Verify AGENTS.md exists at repo root
- [ ] Verify it covers: monorepo structure, npm scripts, env setup, auth flow, API routes, migrations, document upload flow, typecheck/lint quirks, testing, platform admin, common pitfalls
- [ ] Check all commands are accurate against current package.json, turbo.json, tsconfig.json

### Check 2: Key software verifications
- [ ] `npm run test` (smoke-check) passes: all required files exist, migration SQL has required tokens, documents page has workflow tokens
- [ ] `npm run typecheck` runs for both web and API workspaces without errors
- [ ] `npm run lint` lints web workspace (API has no ESLint - verify this is intentional)
- [ ] `npm run dev` starts Next.js at http://localhost:3000
- [ ] `npm run dev:api` starts Express at http://localhost:4000
- [ ] API health: `GET http://localhost:4000/health` returns `{status: "ok", service: "nova-api", version: "1.0.0"}`
- [ ] API me endpoint: `GET http://localhost:4000/v1/me` with valid Bearer token returns user memberships

## Supabase Database Verification (via MCP)

### Check 3: Migrations
- [ ] Migration `001_nova_core.sql` has been applied to Supabase project
- [ ] RLS is enabled on all tables (the migration does this via `do $$ ... end $$`)
- [ ] `is_org_member()` function works: authenticated user can check membership
- [ ] `is_platform_admin()` function works: checks `public.platform_admins` table
- [ ] All required tokens present in migration SQL (verify against smoke-check: platform_admins, is_platform_admin, nova-documents, storage.objects, documents_member_insert, is_org_member)

### Check 4: Storage bucket
- [ ] Bucket `nova-documents` exists in Supabase project
- [ ] Bucket is private (public=false)
- [ ] File size limit: 26214400 (25 MB)
- [ ] Allowed MIME types: application/pdf, image/jpeg, image/png, image/webp
- [ ] File path pattern: `<org_uuid>/<document_uuid>/<safe_filename>`

### Check 5: Authentication
- [ ] Supabase project has anon key and service-role key (do not expose service-role key)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `apps/web/.env.local`
- [ ] `SUPABASE_URL` and `SUPABASE_ANON_KEY` are available for API usage
- [ ] API auth middleware (`auth` in `server.ts`) works with valid JWT Bearer tokens
- [ ] Without Supabase URL/anon key, API returns 503 on auth-required routes

### Check 6: Platform admin
- [ ] `public.platform_admins` table has at least one row with `access_level='admin'`
- [ ] `is_platform_admin()` function returns true for that user
- [ ] Platform admin UI (`/admin`) shows "allowed" state, not "config" or "denied"

## Code Quality Checks

### Check 7: API server (`apps/api/src/server.ts`)
- [ ] Express server starts without errors
- [ ] Zod upload schema validates correctly (organizationId UUID, category enum, sizeBytes max 25MB, mimeType enum)
- [ ] `/v1/documents/upload-url` endpoint returns `{documentId, storagePath, signedUrl, token, expiresInSeconds: 120}`
- [ ] `/v1/me` endpoint verifies JWT and returns memberships
- [ ] `/health` endpoint works without auth

### Check 8: Web app (`apps/web/`)
- [ ] `npm run dev` starts successfully
- [ ] Document page uploads work via `/v1/documents/upload-url` → signed URL → Supabase Storage
- [ ] Document page lists documents with categories
- [ ] Admin page checks platform admin status correctly
- [ ] Path aliases `@/` resolve correctly (tsconfig paths mapping)
- [ ] `.env.local` is NOT gitignored (per `.gitignore` `! .env.example`)

### Check 9: Common pitfalls verified
- [ ] Both `npm run dev` AND `npm run dev:api` must run in separate terminals
- [ ] `npm run typecheck` checks both workspaces - failing one fails both
- [ ] `.env.*` is gitignored except `.env.example` (which has `! .env.example` in gitignore)
- [ ] API PORT defaults to 4000, web defaults to 3000
- [ ] Migrations must be applied to dedicated Supabase project
- [ ] Storage bucket must exist AND migration must have been applied
- [ ] Import aliases: `@/lib/supabase` only in web, not in API
- [ ] `is_org_member()` requires authenticated context (service-role key behaves differently)

## Assessment Output Format

Please provide:
1. **Status**: PASS/FAIL for each check above
2. **Errors**: Any error messages encountered
3. **Missing**: Any AGENTS.md guidance that doesn't match the actual code
4. **Fixes needed**: Commands or changes to make everything work
5. **GPT prompt assessment**: How well the AGENTS.md would help a new agent ramp up

This assessment will help verify the repository is in a working state that matches the AGENTS.md documentation.