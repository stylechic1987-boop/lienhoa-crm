-- Liên Hoa CRM - Supabase/Postgres schema
-- Run this file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create type public.user_role as enum ('director','admin','sale');
create type public.lead_status as enum ('new','consulting','interested','follow_up','closed','lost');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role public.user_role not null default 'sale',
  branch text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  course text,
  source text not null default 'manual',
  branch text,
  status public.lead_status not null default 'new',
  assigned_to uuid references public.profiles(id) on delete set null,
  notes text,
  next_follow_up timestamptz,
  meta_page_id text,
  meta_sender_id text,
  meta_lead_id text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  activity_type text not null,
  content text,
  created_at timestamptz not null default now()
);

create index if not exists leads_assigned_to_idx on public.leads(assigned_to);
create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create unique index if not exists leads_meta_unique_idx
  on public.leads(meta_page_id, meta_sender_id)
  where meta_page_id is not null and meta_sender_id is not null;

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_manager()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_role() in ('director','admin') $$;

create policy "profiles self or managers read" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_manager());

create policy "managers manage profiles" on public.profiles
for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy "leads read assigned or managers" on public.leads
for select to authenticated using (assigned_to = auth.uid() or public.is_manager());

create policy "authenticated create leads" on public.leads
for insert to authenticated with check (created_by = auth.uid() or public.is_manager());

create policy "sale updates assigned leads" on public.leads
for update to authenticated using (assigned_to = auth.uid() or public.is_manager())
with check (assigned_to = auth.uid() or public.is_manager());

create policy "managers delete leads" on public.leads
for delete to authenticated using (public.is_manager());

create policy "activities read lead access" on public.lead_activities
for select to authenticated using (
  exists (select 1 from public.leads l where l.id = lead_id and (l.assigned_to = auth.uid() or public.is_manager()))
);

create policy "activities create lead access" on public.lead_activities
for insert to authenticated with check (
  actor_id = auth.uid() and exists (
    select 1 from public.leads l where l.id = lead_id and (l.assigned_to = auth.uid() or public.is_manager())
  )
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'sale')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Optional first director setup: after creating the account, run:
-- update public.profiles set role='director', full_name='Khúc Minh Hải' where id='AUTH_USER_UUID';
