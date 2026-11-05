import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const root=process.cwd();const required=["package.json","turbo.json","apps/web/package.json","apps/web/src/app/layout.tsx","apps/web/src/app/page.tsx","apps/web/src/app/documents/page.tsx","apps/web/src/app/admin/page.tsx","apps/api/src/server.ts","packages/core/supabase/migrations/001_nova_core.sql"];
for(const file of required)if(!existsSync(resolve(root,file)))throw new Error(`Missing required file: ${file}`);
const sql=readFileSync(resolve(root,"packages/core/supabase/migrations/001_nova_core.sql"),"utf8");for(const token of ["platform_admins","is_platform_admin","nova-documents","storage.objects","documents_member_insert","is_org_member"])if(!sql.includes(token))throw new Error(`Missing database security control: ${token}`);
const page=readFileSync(resolve(root,"apps/web/src/app/documents/page.tsx"),"utf8");for(const token of ["nova-documents","createSignedUrl","organization_id","25*1024*1024"])if(!page.includes(token))throw new Error(`Missing document vault workflow: ${token}`);
console.log(`NOVA source smoke check passed (${required.length} files, tenant RLS, platform admin gate, private document storage).`);
