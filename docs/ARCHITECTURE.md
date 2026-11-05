# NOVA Architecture

## Trust boundaries

Platform administrators are NOVA internal operators and are assigned only through trusted administrative database access. Tenant users authenticate with Supabase Auth and operate inside an organization through an active membership. Browser-provided organization IDs are never treated as authorization; RLS is the final gate.

## Documents

Object paths use `organization_uuid/document_uuid/sanitized_filename` in private bucket `nova-documents`. Allowed types are PDF, JPEG, PNG and WEBP, up to 25 MB. Store metadata in `public.documents`; never expose public object URLs. Create short-lived signed URLs only after checking tenant membership.

## Deployment prerequisites

A dedicated Supabase project, the ordered SQL migration, environment variables, configured Auth redirect URLs, and a private Storage bucket. Never ship a service-role key to the browser. Platform admin bootstrap must be performed in a trusted administrative context.
