# NOVA Retail OS

Full-stack TypeScript monorepo for multi-tenant retail and document operations. The web app is Next.js App Router + React, the service API is Node.js + Express, and Supabase provides Auth, Postgres and private object storage.

## Apps and packages

- `apps/web` — tenant workspace, retail operations and document vault.
- `apps/api` — Express API with Supabase JWT verification and tenant-scoped endpoints.
- `packages/core` — database migrations, types and shared domain foundation.

## Roles

- **Platform Admin**: internal NOVA operator; assignment is restricted to trusted database administration and is not self-service.
- **Tenant User**: belongs to one or more organizations; membership and row-level security scope every record and file.

## Modules

Dashboard, POS, sales, products, inventory, purchase orders, returns, customers, suppliers, reports/GST, barcode labels, settings, platform administration, and document vault for receipts, invoices, vendor bills, proofs, statements, tax documents and other files.

## Setup

1. Create a dedicated Supabase project.
2. Apply migrations in `packages/core/supabase/migrations` in order.
3. Create the private `nova-documents` bucket (the migration also provisions it when the Storage schema is available).
4. Copy `apps/web/.env.example` to `apps/web/.env.local`; set the Supabase URL and anon key. Set API env values from the same project.
5. Run `npm install`, `npm run dev`, and separately `npm run dev:api`.

Never commit service-role keys. Promote the first Platform Admin by inserting the authenticated user's UUID into `public.platform_admins` through a trusted SQL/admin workflow. Tenant document upload is limited to authenticated organization members and a private bucket.
