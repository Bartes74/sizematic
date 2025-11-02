-- Ensure dashboard_events table and policies exist

create table if not exists public.dashboard_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  event_date date not null,
  is_recurring boolean not null default false,
  participants jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists dashboard_events_profile_event_date_idx
  on public.dashboard_events (profile_id, event_date);

create index if not exists dashboard_events_created_at_idx
  on public.dashboard_events (created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger dashboard_events_touch_updated_at
  before update on public.dashboard_events
  for each row
  execute function public.touch_updated_at();

alter table public.dashboard_events enable row level security;

drop policy if exists "dashboard_events_select_own" on public.dashboard_events;
drop policy if exists "dashboard_events_insert_own" on public.dashboard_events;
drop policy if exists "dashboard_events_update_own" on public.dashboard_events;
drop policy if exists "dashboard_events_delete_own" on public.dashboard_events;

create policy "dashboard_events_select_own"
  on public.dashboard_events
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = public.dashboard_events.profile_id
        and p.owner_id = auth.uid()
    )
  );

create policy "dashboard_events_insert_own"
  on public.dashboard_events
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = public.dashboard_events.profile_id
        and p.owner_id = auth.uid()
    )
  );

create policy "dashboard_events_update_own"
  on public.dashboard_events
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = public.dashboard_events.profile_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = public.dashboard_events.profile_id
        and p.owner_id = auth.uid()
    )
  );

create policy "dashboard_events_delete_own"
  on public.dashboard_events
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = public.dashboard_events.profile_id
        and p.owner_id = auth.uid()
    )
  );

grant usage on schema public to authenticated;
grant usage on schema public to anon;

grant select, insert, update, delete on public.dashboard_events to authenticated;
grant select on public.dashboard_events to anon;
