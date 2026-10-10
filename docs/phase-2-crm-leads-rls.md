# Phase 2 — CRM Lead, branch assignment, RLS, follow-ups

Status: **Implementation draft; not applied to any live database**  
Branch: `feat/phase-2-leads-branch-rls`

## Scope implemented in this branch

1. Adds an incremental SQL migration at `supabase/migrations/202610100001_crm_lead_branch_rls.sql`.
2. Adds a private role/scope registry (`private.crm_user_access`) to support company director, branch director, center director, marketing, Sale, finance, and teacher roles without forcing a breaking change to the existing `public.user_role` enum.
3. Replaces legacy Lead policies with scoped policies for company, branch, center, and assigned Sale.
4. Adds `lead_follow_ups` for follow-up scheduling and status.
5. Adds `lead_assignment_history` and trigger-based audit records for initial assignments and subsequent changes.
6. Updates the public Lead Edge Function so it only auto-assigns to an active Sale whose `profiles.branch` exactly matches the submitted branch. If the form does not specify a branch, the Lead remains unassigned rather than being sent to a random branch.

## Important environment findings

- CRM deployment workflow currently sets `VITE_SUPABASE_URL` to project `ivbnnubqeafjkqoeovmk`.
- `frontend/.env.example` points to project `nvjasrrpwhfolnsnwhtr`.
- Both project references returned `INACTIVE` from Supabase management.
- Database table and migration listing timed out for `nvjasrrpwhfolnsnwhtr`; the actual schema and data in either project remain unverified.
- The main-branch CRM build succeeded on 2026-10-02. The Phase 2 PR frontend build also passed in GitHub Actions run [#38016681073](https://github.com/stylechic1987-boop/lienhoa-crm/actions/runs/38016681073). This validates the frontend build only; it does not execute or validate the SQL migration against PostgreSQL.
- Do not merge/deploy the migration to production until the intended project, backup, baseline schema, and existing policies are confirmed.

## Role provisioning

The legacy roles are read as fallback from `public.profiles.role`. New roles should be provisioned in `private.crm_user_access` through a trusted SQL/admin process only; there is deliberately no client write grant to this table.

Example pattern (run only after the target project and user UUIDs have been verified):

```sql
insert into private.crm_user_access (user_id, role, branch, center)
values ('<AUTH_USER_UUID>', 'branch_director', 'Bắc Ninh', null)
on conflict (user_id) do update
set role = excluded.role,
    branch = excluded.branch,
    center = excluded.center,
    active = true,
    updated_at = now();
```

Do not use editable user metadata to assign permissions. Ensure the branch strings in `profiles.branch`, form submissions, and `private.crm_user_access.branch` use the same canonical value.

## Authorization intent

| Role | Read Lead | Create Lead | Update Lead | Delete Lead |
|---|---|---|---|---|
| Company director / legacy director / admin | All branches | All branches | All branches | Yes |
| Branch director | Own branch | Own branch | Own branch | No |
| Center director | Own center | Own center | Own center | No |
| Marketing | Own branch | Own branch | No by default | No |
| Sale | Assigned Lead and own-created unassigned Lead | Own branch | Assigned Lead; cannot reassign or move branch/center | No |
| Finance / teachers | No CRM Lead access in this phase | No | No | No |

Lead activities follow parent Lead visibility. Follow-ups are scoped through their parent Lead. Assignment history is read-only to authenticated clients and visible to company/branch/center management in scope. Only trusted database triggers write assignment history.

## Required verification before applying

1. Confirm the canonical Supabase project ID and that it is active.
2. Take/export a backup and prove the restore path, or use a verified staging clone.
3. Inspect actual `profiles`, `leads`, and `lead_activities` columns, grants, RLS policies, enum values, and existing rows.
4. Confirm canonical branch names (e.g. Bắc Ninh, Lạng Sơn, Online) and ensure form values match them exactly.
5. Apply this migration to staging first; run the authorization matrix below using real test users.
6. Confirm the frontend has UI actions for assignment/follow-ups before enabling the corresponding workflow for users.

## Acceptance test matrix

- Unauthenticated user cannot read or mutate `leads`, `lead_activities`, `lead_follow_ups`, or assignment history.
- Sale A cannot read Sale B's assigned Lead unless Sale A is explicitly allowed by a management scope.
- Sale cannot assign a Lead to another Sale, move a Lead to another branch, or change its center.
- Sale cannot create a Lead for another branch.
- Branch director for Bắc Ninh can read/update Bắc Ninh Leads but cannot read/update Lạng Sơn Leads.
- Center director can only read/update Leads tagged with their assigned center.
- Company director can read/update across branches.
- A manager's reassignment produces an immutable history row with previous/new assignee, branch, actor, and timestamp.
- Initial Lead insertion with an assignee creates an assignment-history row.
- Public form with branch Bắc Ninh can only assign to active Sale profiles whose branch is exactly Bắc Ninh.
- Public form with missing branch leaves the Lead unassigned; it never picks Sale from all branches.
- Follow-up CRUD respects parent Lead scope; a Sale cannot attach a follow-up to an inaccessible Lead or assign it to another user's queue.
- Repeated requests and external webhook retries are checked for duplicate Lead creation before production activation.

## Known remaining work

- End-to-end UI test against a reproducible environment; frontend build passed in PR CI.
- Align the deployed workflow URL, `.env.example`, and actual active Supabase project.
- Confirm/install any missing Facebook tables referenced by the webhook (`facebook_pages`, `facebook_conversations`, `facebook_messages`) before enabling the integration.
- Add a protected role-provisioning/admin endpoint and a controlled Lead reassignment API.
- Implement frontend UI for branch assignment, follow-up scheduling, notification handling, and manager audit view.
- Add automated SQL/RLS tests and idempotency handling for public form/webhook submissions.

## Safety note

This branch contains code and migration files only. The migration has **not** been applied to Supabase. No production data has been changed.
