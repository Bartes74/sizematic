-- Extend size_labels with product_type metadata
alter table if exists public.size_labels
  add column if not exists product_type text;

-- Dashboard size preferences store which quick categories and types to surface
create table if not exists public.dashboard_size_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  quick_category text not null,
  product_type text,
  size_label_id uuid references public.size_labels(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, quick_category)
);

alter table public.dashboard_size_preferences enable row level security;

create trigger trg_dashboard_size_preferences_updated
before update on public.dashboard_size_preferences
for each row
execute function public.touch_updated_at();

create policy "Dashboard size preferences viewable by owner"
on public.dashboard_size_preferences
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = dashboard_size_preferences.profile_id
      and p.owner_id = auth.uid()
  )
);

create policy "Dashboard size preferences manageable by owner"
on public.dashboard_size_preferences
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = dashboard_size_preferences.profile_id
      and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = dashboard_size_preferences.profile_id
      and p.owner_id = auth.uid()
  )
);
