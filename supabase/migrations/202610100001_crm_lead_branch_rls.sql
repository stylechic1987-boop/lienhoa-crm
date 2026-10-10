-- Phase 2 / CRM Lead, branch-scoped Sale access and follow-ups.
-- IMPORTANT: Review against the live schema and take a verified backup before applying.
-- This migration is intentionally NOT applied to any Supabase project from this session.

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Precondition failed: public.profiles is missing. Verify the target project and baseline schema first.';
  end if;
  if to_regclass('public.leads') is null then
    raise exception 'Precondition failed: public.leads is missing. Verify the target project and baseline schema first.';
  end if;
  if to_regclass('public.lead_activities') is null then
    raise exception 'Precondition failed: public.lead_activities is missing. Verify the target project and baseline schema first.';
  end if;
end $$;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Supplement the legacy profiles.role enum without forcing a risky enum alteration.
-- Legacy roles director/admin/sale continue to work; new roles are managed here.
create table if not exists private.crm_user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in (
    'company_director','branch_director','center_director',
    'mkt','sale','finance','teacher_chinese','teacher_english','teacher_japanese','teacher_korean','admin'
  )),
  branch text,
  center text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table private.crm_user_access enable row level security;
revoke all on private.crm_user_access from public, anon, authenticated;

create or replace function private.crm_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce(
    (select a.role from private.crm_user_access a where a.user_id = (select auth.uid()) and a.active),
    (select p.role::text from public.profiles p where p.id = (select auth.uid()))
  );
$$;

create or replace function private.crm_branch()
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce(
    (select a.branch from private.crm_user_access a where a.user_id = (select auth.uid()) and a.active),
    (select p.branch from public.profiles p where p.id = (select auth.uid()))
  );
$$;

create or replace function private.crm_center()
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select (select a.center from private.crm_user_access a where a.user_id = (select auth.uid()) and a.active);
$$;

revoke all on function private.crm_role() from public, anon;
revoke all on function private.crm_branch() from public, anon;
revoke all on function private.crm_center() from public, anon;
grant execute on function private.crm_role() to authenticated;
grant execute on function private.crm_branch() to authenticated;
grant execute on function private.crm_center() to authenticated;

alter table public.leads add column if not exists center text;
alter table public.leads add column if not exists assigned_at timestamptz;
alter table public.leads add column if not exists assigned_by uuid references auth.users(id) on delete set null;

create index if not exists leads_branch_status_created_idx
  on public.leads(branch, status, created_at desc);
create index if not exists leads_center_status_created_idx
  on public.leads(center, status, created_at desc);
create index if not exists leads_assigned_status_followup_idx
  on public.leads(assigned_to, status, next_follow_up);

create table if not exists public.lead_follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  due_at timestamptz not null,
  note text not null,
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lead_follow_ups_due_idx
  on public.lead_follow_ups(status, due_at);
create index if not exists lead_follow_ups_assignee_due_idx
  on public.lead_follow_ups(assigned_to, status, due_at);
alter table public.lead_follow_ups enable row level security;

create table if not exists public.lead_assignment_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  previous_assignee uuid references public.profiles(id) on delete set null,
  new_assignee uuid references public.profiles(id) on delete set null,
  previous_branch text,
  new_branch text,
  actor_id uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index if not exists lead_assignment_history_lead_idx
  on public.lead_assignment_history(lead_id, changed_at desc);
alter table public.lead_assignment_history enable row level security;
revoke all on public.lead_assignment_history from anon, authenticated;
grant select on public.lead_assignment_history to authenticated;

create or replace function private.crm_log_lead_assignment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if old.assigned_to is distinct from new.assigned_to
     or old.branch is distinct from new.branch then
    insert into public.lead_assignment_history (
      lead_id, previous_assignee, new_assignee,
      previous_branch, new_branch, actor_id
    ) values (
      new.id, old.assigned_to, new.assigned_to,
      old.branch, new.branch, (select auth.uid())
    );
    if old.assigned_to is distinct from new.assigned_to and new.assigned_to is not null then
      new.assigned_at := now();
      new.assigned_by := (select auth.uid());
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.crm_log_lead_assignment() from public, anon, authenticated;
drop trigger if exists crm_log_lead_assignment on public.leads;
create trigger crm_log_lead_assignment
before update of assigned_to, branch on public.leads
for each row execute function private.crm_log_lead_assignment();

-- Replace the legacy policies with branch-aware policies.
drop policy if exists "leads read assigned or managers" on public.leads;
drop policy if exists "authenticated create leads" on public.leads;
drop policy if exists "sale updates assigned leads" on public.leads;
drop policy if exists "managers delete leads" on public.leads;

create policy crm_leads_select_scoped on public.leads
for select to authenticated
using (
  assigned_to = (select auth.uid())
  or created_by = (select auth.uid())
  or (select private.crm_role()) in ('company_director','director','admin')
  or (
    (select private.crm_role()) in ('branch_director','mkt')
    and branch is not null and branch = (select private.crm_branch())
  )
  or (
    (select private.crm_role()) = 'center_director'
    and center is not null and center = (select private.crm_center())
  )
);

create policy crm_leads_insert_scoped on public.leads
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (
    (select private.crm_role()) in ('company_director','director','admin')
    or (
      (select private.crm_role()) in ('branch_director','mkt')
      and branch is not null and branch = (select private.crm_branch())
    )
    or (
      (select private.crm_role()) = 'center_director'
      and center is not null and center = (select private.crm_center())
    )
    or (
      (select private.crm_role()) = 'sale'
      and branch is not null and branch = (select private.crm_branch())
      and (assigned_to is null or assigned_to = (select auth.uid()))
    )
  )
);

create policy crm_leads_update_management_scope on public.leads
for update to authenticated
using (
  (select private.crm_role()) in ('company_director','director','admin')
  or (
    (select private.crm_role()) = 'branch_director'
    and branch is not null and branch = (select private.crm_branch())
  )
  or (
    (select private.crm_role()) = 'center_director'
    and center is not null and center = (select private.crm_center())
  )
)
with check (
  (select private.crm_role()) in ('company_director','director','admin')
  or (
    (select private.crm_role()) = 'branch_director'
    and branch is not null and branch = (select private.crm_branch())
  )
  or (
    (select private.crm_role()) = 'center_director'
    and center is not null and center = (select private.crm_center())
  )
);

create policy crm_leads_update_own_sale_scope on public.leads
for update to authenticated
using (
  (select private.crm_role()) = 'sale'
  and branch is not null and branch = (select private.crm_branch())
  and (
    assigned_to = (select auth.uid())
    or (created_by = (select auth.uid()) and assigned_to is null)
  )
)
with check (
  (select private.crm_role()) = 'sale'
  and branch is not null and branch = (select private.crm_branch())
  and (
    assigned_to = (select auth.uid())
    or (created_by = (select auth.uid()) and assigned_to is null)
  )
);

create policy crm_leads_delete_director_only on public.leads
for delete to authenticated
using ((select private.crm_role()) in ('company_director','director','admin'));

-- Activity access follows the same scoped access as the parent Lead.
drop policy if exists "activities read lead access" on public.lead_activities;
drop policy if exists "activities create lead access" on public.lead_activities;

create policy crm_activities_select_scoped on public.lead_activities
for select to authenticated
using (
  exists (
    select 1 from public.leads l
    where l.id = lead_id
      and (
        l.assigned_to = (select auth.uid())
        or l.created_by = (select auth.uid())
        or (select private.crm_role()) in ('company_director','director','admin')
        or ((select private.crm_role()) in ('branch_director','mkt')
            and l.branch is not null and l.branch = (select private.crm_branch()))
        or ((select private.crm_role()) = 'center_director'
            and l.center is not null and l.center = (select private.crm_center()))
      )
  )
);

create policy crm_activities_insert_scoped on public.lead_activities
for insert to authenticated
with check (
  actor_id = (select auth.uid())
  and exists (
    select 1 from public.leads l
    where l.id = lead_id
      and (
        l.assigned_to = (select auth.uid())
        or l.created_by = (select auth.uid())
        or (select private.crm_role()) in ('company_director','director','admin')
        or ((select private.crm_role()) in ('branch_director','mkt')
            and l.branch is not null and l.branch = (select private.crm_branch()))
        or ((select private.crm_role()) = 'center_director'
            and l.center is not null and l.center = (select private.crm_center()))
      )
  )
);

create policy crm_followups_select_scoped on public.lead_follow_ups
for select to authenticated
using (
  assigned_to = (select auth.uid())
  or created_by = (select auth.uid())
  or exists (
    select 1 from public.leads l
    where l.id = lead_id
      and (
        (select private.crm_role()) in ('company_director','director','admin')
        or ((select private.crm_role()) in ('branch_director','mkt')
            and l.branch is not null and l.branch = (select private.crm_branch()))
        or ((select private.crm_role()) = 'center_director'
            and l.center is not null and l.center = (select private.crm_center()))
      )
  )
);

create policy crm_followups_insert_scoped on public.lead_follow_ups
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.leads l
    where l.id = lead_id
      and (
        l.assigned_to = (select auth.uid())
        or (select private.crm_role()) in ('company_director','director','admin')
        or ((select private.crm_role()) = 'branch_director'
            and l.branch is not null and l.branch = (select private.crm_branch()))
        or ((select private.crm_role()) = 'center_director'
            and l.center is not null and l.center = (select private.crm_center()))
      )
  )
);

create policy crm_followups_update_scoped on public.lead_follow_ups
for update to authenticated
using (
  assigned_to = (select auth.uid())
  or exists (
    select 1 from public.leads l
    where l.id = lead_id
      and (
        (select private.crm_role()) in ('company_director','director','admin')
        or ((select private.crm_role()) = 'branch_director'
            and l.branch is not null and l.branch = (select private.crm_branch()))
        or ((select private.crm_role()) = 'center_director'
            and l.center is not null and l.center = (select private.crm_center()))
      )
  )
)
with check (
  assigned_to = (select auth.uid())
  or exists (
    select 1 from public.leads l
    where l.id = lead_id
      and (
        (select private.crm_role()) in ('company_director','director','admin')
        or ((select private.crm_role()) = 'branch_director'
            and l.branch is not null and l.branch = (select private.crm_branch()))
        or ((select private.crm_role()) = 'center_director'
            and l.center is not null and l.center = (select private.crm_center()))
      )
  )
);

create policy crm_assignment_history_select_scoped on public.lead_assignment_history
for select to authenticated
using (
  (select private.crm_role()) in ('company_director','director','admin')
  or exists (
    select 1 from public.leads l
    where l.id = lead_id
      and (
        ((select private.crm_role()) = 'branch_director'
          and l.branch is not null and l.branch = (select private.crm_branch()))
        or ((select private.crm_role()) = 'center_director'
          and l.center is not null and l.center = (select private.crm_center()))
      )
  )
);

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert on public.lead_activities to authenticated;
grant select, insert, update on public.lead_follow_ups to authenticated;

-- Do not grant authenticated direct INSERT/UPDATE on private.crm_user_access or
-- INSERT/UPDATE/DELETE on public.lead_assignment_history. Role provisioning must
-- be performed through a trusted admin process / SQL editor until a protected
-- admin API is implemented.
