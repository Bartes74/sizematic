-- Enable extensions required for UUID generation and row level security helpers
create extension if not exists "pgcrypto";

-- Profiles table storing measurement owners
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  unit_pref text not null default 'metric' check (unit_pref in ('metric', 'imperial')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Measurements table for ZPR entries
create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  label text not null,
  value_cm numeric(6,2) not null check (value_cm > 0),
  notes text,
  recorded_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_measurements_profile_category on public.measurements(profile_id, category);

create table if not exists public.measurement_summaries (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  average_value_cm numeric(6,2),
  sample_size integer not null default 0,
  computed_at timestamptz not null default timezone('utc', now())
);

-- Timestamp maintenance
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

create or replace function public.refresh_measurement_summary()
returns trigger as $$
declare
  target_profile uuid;
begin
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    target_profile := NEW.profile_id;
  else
    target_profile := OLD.profile_id;
  end if;

  insert into public.measurement_summaries (profile_id, average_value_cm, sample_size, computed_at)
  select
    target_profile,
    avg(value_cm)::numeric(6,2),
    count(*),
    timezone('utc', now())
  from public.measurements
  where profile_id = target_profile
  group by profile_id
  on conflict (profile_id) do update
  set average_value_cm = excluded.average_value_cm,
      sample_size = excluded.sample_size,
      computed_at = excluded.computed_at;

  return null;
end;
$$ language plpgsql;

create trigger trg_measurements_refresh_summary
after insert or update or delete on public.measurements
for each row
execute function public.refresh_measurement_summary();

-- Row Level Security policies
alter table public.profiles enable row level security;
alter table public.measurements enable row level security;
alter table public.measurement_summaries enable row level security;

create policy "Profiles are viewable by owner"
on public.profiles
for select using (auth.uid() = owner_id);

create policy "Profiles are updatable by owner"
on public.profiles
for update using (auth.uid() = owner_id);

create policy "Profiles are insertable by owner"
on public.profiles
for insert with check (auth.uid() = owner_id);

create policy "Measurements are managed by profile owner"
on public.measurements
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = measurements.profile_id
    and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = measurements.profile_id
    and p.owner_id = auth.uid()
  )
);

create policy "Measurement summaries visible to profile owner"
on public.measurement_summaries
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = measurement_summaries.profile_id
    and p.owner_id = auth.uid()
  )
);

create policy "Measurement summaries updatable by profile owner"
on public.measurement_summaries
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = measurement_summaries.profile_id
    and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = measurement_summaries.profile_id
    and p.owner_id = auth.uid()
  )
);
