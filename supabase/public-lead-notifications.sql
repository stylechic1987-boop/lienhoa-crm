create table if not exists public.lead_notifications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists lead_notifications_recipient_idx on public.lead_notifications(recipient_id, created_at desc);
alter table public.lead_notifications enable row level security;
create policy "users read own notifications" on public.lead_notifications for select to authenticated using (recipient_id = auth.uid());
create policy "users update own notifications" on public.lead_notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());