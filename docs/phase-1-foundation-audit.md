# Liên Hoa AI Agent — Phase 1: Audit & Safe Foundation

Status: **Discovery in progress**  
Target: CRM Lead → Sale → follow-up automation  
Working branch: `feat/phase-1-foundation-audit`  
Production changes: **None**. No database migration or data write was performed during this audit.

## 1. Verified repository findings

### `stylechic1987-boop/lienhoa-crm`
- README describes a CRM workflow: Facebook Page/Inbox → Lead → Sale assignment → follow-up → close → tuition collection → KPI/reporting.
- README describes React + TypeScript + Vite, Tailwind, Node.js/Express API, PostgreSQL, and Meta Graph API/webhooks.
- `frontend/package.json` includes React, Vite, TypeScript, Tailwind, and `@supabase/supabase-js`.
- The following paths could not be found at the expected locations during this pass: `backend/package.json`, `database/schema.sql`, `docs/architecture.md`. This is not proof they do not exist under different names or directories; inventory the full repository tree before changing code.

### `stylechic1987-boop/Li-n-Hoa-Connnect---CRM`
- README describes a React/Vite HR app with Supabase login and HR tables.
- Root `package.json` lists `appwrite` but does not list `@supabase/supabase-js`; this conflicts with the README's Supabase description and must be reconciled against actual imports/config before selecting a backend.
- `supabase/migrations/001_hr_schema.sql` defines HR-specific tables and RLS policies. Do not repurpose HR tables as CRM Lead tables without a separate data-model review.

### Supabase project
- Project reference: `nvjasrrpwhfolnsnwhtr`
- Project name: `lienhoa-crm`
- Region: `ap-southeast-1`
- Current management status returned: `INACTIVE`
- Read-only attempts to list tables and migrations timed out. Database schema, data availability, Auth users, and migration history remain **unverified**.
- Do not restore, recreate, migrate, or point production traffic at this project until the owner confirms the intended environment and backup/recovery requirements.

## 2. Phase 1 work items

- [x] Inspect CRM README and frontend dependency manifest.
- [x] Inspect HR repository README, dependency manifest, and HR migration.
- [x] Check the configured Supabase project status.
- [x] Attempt read-only table/migration inventory; record timeout.
- [ ] Inventory the complete CRM repository tree and identify the actual app entry points, API routes, schema, tests, and deployment configuration.
- [ ] Trace every Supabase/Appwrite/PostgreSQL reference and determine which backend is actually used by each deployable app.
- [ ] Confirm the intended canonical repository and environment (development/staging/production).
- [ ] Confirm backup/export and restore strategy before any database activation or migration.
- [ ] Establish a baseline build/test result and record existing failures.
- [ ] Review all existing RLS policies and run a role-by-role access matrix before expanding the schema.

## 3. Decisions pending verification

1. **Canonical app:** likely `lienhoa-crm` for Lead/Sale; the other repository currently documents HR functionality. Confirm whether they should be integrated or remain separate apps.
2. **Canonical database:** Supabase is the target architecture, but the inspected project is inactive and schema access timed out. Do not assume it contains the latest CRM data.
3. **API layer:** README mentions Express, but the expected backend manifest was not found. Verify the actual directory tree before adding endpoints.
4. **Lead data model:** inspect current schema and sample data before creating or renaming tables. Prefer extending equivalent tables rather than duplicating them.

## 4. Safety requirements

- No secrets, service-role keys, access tokens, passwords, or personal lead exports in Git.
- Frontend must use only a publishable/anon key; privileged keys stay server-side.
- Do not use editable user metadata for authorization.
- Every exposed business table must have RLS enabled and policies aligned to company, branch, center, and assigned-Sale scope.
- UPDATE policies need both `USING` and `WITH CHECK`.
- AI tools must call narrow, permission-checked business functions; never allow arbitrary SQL or unrestricted database access.
- Any outbound message, reassignment affecting ownership, discount, payment change, or destructive operation must be auditable and use approval rules appropriate to the risk.

## 5. Phase 1 acceptance criteria

Phase 1 is complete only when:
- A repository map identifies frontend, backend/API, database migrations, tests, and deployment paths.
- The actual backend and canonical environment are documented with evidence from code/configuration.
- Existing tables, RLS policies, migrations, and available backup/restore path are inventoried.
- A baseline build/test run is recorded.
- No production data was changed during the audit.
- A go/no-go recommendation is recorded for Phase 2 (CRM Lead and role-based access).

## 6. Next action

Complete the full repository inventory and recover read-only visibility into the intended Supabase environment. After verification, implement Phase 2 in a separate feature branch and test against development/staging data first.
