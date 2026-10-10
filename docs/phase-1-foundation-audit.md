# Liên Hoa AI Agent — Phase 1: Audit & Safe Foundation

Status: **Code audit complete; live database verification blocked by inactive projects**  
Target: CRM Lead → Sale → follow-up automation  
Working branch: `feat/phase-1-foundation-audit`  
Production changes: **None**. No database migration or data write was performed during this audit.

## 1. Repository inventory

### Canonical CRM candidate: `stylechic1987-boop/lienhoa-crm`
- Frontend: `frontend/src/main.tsx`, `crm.tsx`, `messenger.tsx`, `finance.tsx`, `tuition.tsx`, `pages/TiengTrungLienHoa.tsx`, `lib/supabase.ts`.
- Supabase SQL: `supabase/schema.sql`, `supabase/public-lead-notifications.sql`.
- Edge Functions: `supabase/functions/public-lead/index.ts`, `facebook-webhook/index.ts`, `meta-webhook/index.ts`.
- Deploy: `.github/workflows/deploy-pages.yml`; deploys the Vite frontend to GitHub Pages.
- No `backend/package.json`, `database/schema.sql`, or `docs/architecture.md` was found at those expected paths. The actual repository tree contains no Express backend despite README wording; the implemented backend integration is primarily Supabase client + Edge Functions.
- Frontend package uses React, Vite, TypeScript, Tailwind, and `@supabase/supabase-js`.

### HR/class attendance app: `stylechic1987-boop/Li-n-Hoa-Connnect---CRM`
- Frontend: `src/App.tsx`, `src/components/Login.tsx`, `src/components/ClassAttendance.tsx`, `src/lib/auth.ts`, `src/lib/backend.ts`.
- Actual `src/lib/backend.ts` imports Appwrite SDK and reads `VITE_APPWRITE_*` variables. `APPWRITE_SETUP.md` confirms Appwrite is the current runtime backend.
- `supabase/migrations/001_hr_schema.sql`, `002_class_attendance.sql`, and `003_monthly_attendance_access.sql` are SQL artifacts but do not establish that the deployed app currently uses Supabase.
- Root `package.json` declares `appwrite`, not `@supabase/supabase-js`. This repository should remain separate from the Lead/Sale CRM until the owner decides to consolidate the apps.

## 2. Build verification evidence

- CRM `lienhoa-crm`: latest visible GitHub Actions build/deploy run on 2026-10-02 completed successfully: [run #36964453279](https://github.com/stylechic1987-boop/lienhoa-crm/actions/runs/36964453279). The feature branches in this audit have not yet had a full build run.
- HR app: latest visible build on 2026-09-28 failed at `src/components/ClassAttendance.tsx(21,426)`. TypeScript reports a cast missing required `totalSessions` while the object has `total_sessions`. See [failed run #36394920033](https://github.com/stylechic1987-boop/Li-n-Hoa-Connnect---CRM/actions/runs/36394920033).
- This is a recorded CI baseline, not a local rebuild in this session.

## 3. Supabase environment findings

Two distinct project references are in source/configuration:

| Source | Project ref | Management status |
|---|---|---|
| CRM deploy workflow `VITE_SUPABASE_URL` | `ivbnnubqeafjkqoeovmk` | `INACTIVE` |
| CRM `frontend/.env.example` | `nvjasrrpwhfolnsnwhtr` | `INACTIVE` |

- `nvjasrrpwhfolnsnwhtr`: project name `lienhoa-crm`, region `ap-southeast-1`; table and migration listing timed out.
- `ivbnnubqeafjkqoeovmk`: region `ap-northeast-1`; table and migration listing also timed out.
- Security advisor calls returned no lint notices, but that does **not** prove the database is healthy or that its tables/policies were inspected.
- The actual active production project, schema, records, Auth users, backups, and recovery eligibility remain **unverified**. Do not restore, recreate, migrate, or switch production traffic until the intended project and backup path are confirmed.

## 4. Existing CRM schema and security findings

- `supabase/schema.sql` defines `profiles`, `leads`, and `lead_activities`; legacy roles are only `director`, `admin`, and `sale`.
- Existing Lead SELECT is limited to assigned Sale or global manager; branch-director and center-director scopes are not implemented in the baseline schema.
- Existing Lead INSERT checks creator identity or manager status but does not enforce branch-matched assignment.
- Existing Lead UPDATE policy does not provide the required branch-scoped model.
- `public-lead/index.ts` previously allowed a form submission with no branch (and branch `Online`) to choose from Sale profiles across branches. A draft Phase 2 change now requires exact branch matching and leaves a Lead unassigned when branch is missing.
- Facebook Edge Function references `facebook_pages`, `facebook_conversations`, and `facebook_messages`, which are not defined in the inspected `supabase/schema.sql`. Verify whether these tables were created elsewhere before enabling the webhook.
- `public-lead-notifications.sql` defines `lead_notifications` separately; verify that it exists in the target environment before using the form endpoint.

## 5. Phase 1 work-item status

- [x] Inspect complete file trees of both repositories.
- [x] Identify CRM frontend entry points, SQL artifacts, Edge Functions, and deployment workflow.
- [x] Confirm HR app runtime backend is Appwrite from source code.
- [x] Record latest available CI build outcomes.
- [x] Inspect the baseline Lead schema and RLS policies.
- [x] Compare configured Supabase project references and record inactive status/timeouts.
- [ ] Verify live database schema, Auth users, data, migrations, backup and restore path.
- [ ] Confirm canonical Supabase project and canonical branch labels.
- [ ] Rebuild feature branches in CI and run the role-by-role RLS test matrix against staging.

## 6. Go/no-go recommendation

**GO for isolated code/migration development in a feature branch. NO-GO for applying migrations to production or activating integrations.**

Phase 2 can be drafted safely in GitHub, but the database migration must remain unapplied until:
1. The owner confirms the correct Supabase project and access is restored.
2. A verified backup/export and restore path exist.
3. The live schema and current policies are compared against the migration.
4. The migration passes in staging with test users for each role and branch.

## 7. Safety requirements

- No secrets, service-role keys, access tokens, passwords, or personal lead exports in Git.
- Frontend must use only a publishable/anon key; privileged keys stay server-side.
- Do not use editable user metadata for authorization.
- Every exposed business table must have RLS enabled and policies aligned to company, branch, center, and assigned-Sale scope.
- UPDATE policies need both `USING` and `WITH CHECK`.
- AI tools must call narrow, permission-checked business functions; never allow arbitrary SQL or unrestricted database access.
- Any outbound message, reassignment affecting ownership, discount, payment change, or destructive operation must be auditable and use approval rules appropriate to the risk.

