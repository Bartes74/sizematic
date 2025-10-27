-- Migration: Add full ZPR categories and EN 13402 fields
-- This migration extends the basic measurements system to support:
-- 1. Structured category types (enum)
-- 2. Multiple EN 13402 measurements per entry (JSONB)
-- 3. Size labels (quick tag entries with brand + size)
-- 4. Measurement history (versioning)

-- Create category enum matching BUILD_PLAN.md
create type public.category as enum (
  'tops',           -- Odzież górna (upper body clothing)
  'bottoms',        -- Odzież dolna (lower body clothing)
  'footwear',       -- Obuwie
  'headwear',       -- Nakrycia głowy
  'accessories',    -- Akcesoria
  'outerwear',      -- Odzież wierzchnia
  'kids'            -- Dzieci
);

-- Create size source enum (how the size was obtained)
create type public.size_source as enum (
  'measurement',    -- From body measurements (EN 13402)
  'label',          -- From garment label/tag
  'estimated'       -- Estimated/calculated
);

-- Brands table (for size label entries and conversions)
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  website_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_brands_slug on public.brands(slug);

-- Modify measurements table structure
-- Step 1: Add new columns
alter table public.measurements
  add column if not exists values jsonb,
  add column if not exists source public.size_source default 'measurement',
  add column if not exists category_new public.category;

-- Step 2: Migrate existing data
-- Convert old text category to new enum (map 'tops' text to 'tops' enum, default to 'tops' for unknown)
update public.measurements
set category_new =
  case
    when lower(category) in ('tops', 'top', 'górna', 'upper') then 'tops'::public.category
    when lower(category) in ('bottoms', 'bottom', 'dolna', 'lower', 'pants', 'spodnie') then 'bottoms'::public.category
    when lower(category) in ('footwear', 'shoes', 'obuwie', 'buty') then 'footwear'::public.category
    when lower(category) in ('headwear', 'head', 'hat', 'nakrycia') then 'headwear'::public.category
    when lower(category) in ('accessories', 'accessory', 'akcesoria') then 'accessories'::public.category
    when lower(category) in ('outerwear', 'outer', 'wierzchnia', 'jacket', 'kurtka') then 'outerwear'::public.category
    when lower(category) in ('kids', 'dzieci', 'child', 'children') then 'kids'::public.category
    else 'tops'::public.category
  end
where category_new is null;

-- Convert single value_cm to JSONB values format
-- For existing entries, we'll store as generic 'chest' measurement
update public.measurements
set values = jsonb_build_object('chest', value_cm)
where values is null and value_cm is not null;

-- Step 3: Drop old columns and rename new category
alter table public.measurements drop column category;
alter table public.measurements drop column label;  -- Will be moved to size_labels table for tag entries
alter table public.measurements drop column value_cm;
alter table public.measurements rename column category_new to category;

-- Step 4: Make category and values required
alter table public.measurements
  alter column category set not null,
  alter column values set not null;

-- Update the index to use new category column
drop index if exists public.idx_measurements_profile_category;
create index idx_measurements_profile_category on public.measurements(profile_id, category);

-- Size labels table (for quick "tag" entries: brand + size)
create table if not exists public.size_labels (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  brand_id uuid references public.brands (id) on delete set null,
  brand_name text,  -- Denormalized for when brand_id is null (user-entered brand)
  category public.category not null,
  label text not null,  -- e.g., "M", "42", "10.5"
  notes text,
  source public.size_source not null default 'label',
  recorded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_size_labels_profile on public.size_labels(profile_id);
create index if not exists idx_size_labels_brand on public.size_labels(brand_id);
create index if not exists idx_size_labels_category on public.size_labels(profile_id, category);

-- Measurement history table (versioning for measurements)
create table if not exists public.measurement_history (
  id uuid primary key default gen_random_uuid(),
  measurement_id uuid not null,  -- Reference to current measurement (can be deleted)
  profile_id uuid not null references public.profiles (id) on delete cascade,
  category public.category not null,
  values jsonb not null,
  notes text,
  source public.size_source not null default 'measurement',
  recorded_at timestamptz not null,
  version_created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_measurement_history_measurement on public.measurement_history(measurement_id);
create index if not exists idx_measurement_history_profile on public.measurement_history(profile_id);
create index if not exists idx_measurement_history_recorded on public.measurement_history(recorded_at desc);

-- Trigger to automatically create history entries on measurement updates
create or replace function public.archive_measurement_change()
returns trigger as $$
begin
  -- Only archive on UPDATE, not INSERT
  if (TG_OP = 'UPDATE') then
    insert into public.measurement_history (
      measurement_id,
      profile_id,
      category,
      values,
      notes,
      source,
      recorded_at
    ) values (
      old.id,
      old.profile_id,
      old.category,
      old.values,
      old.notes,
      old.source,
      old.recorded_at
    );
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_measurements_archive
before update on public.measurements
for each row
execute function public.archive_measurement_change();

-- Add trigger to brands table for updated_at
create trigger trg_brands_updated_at
before update on public.brands
for each row
execute function public.touch_updated_at();

-- Row Level Security for new tables
alter table public.brands enable row level security;
alter table public.size_labels enable row level security;
alter table public.measurement_history enable row level security;

-- Brands are publicly readable (for logged-in users)
create policy "Brands are viewable by authenticated users"
on public.brands
for select using (auth.uid() is not null);

-- Brands can only be managed by service role (via admin functions)
-- No insert/update/delete policies for regular users

-- Size labels are managed by profile owner
create policy "Size labels are managed by profile owner"
on public.size_labels
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = size_labels.profile_id
    and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = size_labels.profile_id
    and p.owner_id = auth.uid()
  )
);

-- Measurement history is read-only and visible only to profile owner
create policy "Measurement history visible to profile owner"
on public.measurement_history
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = measurement_history.profile_id
    and p.owner_id = auth.uid()
  )
);

-- No direct insert/update/delete on history - managed by trigger

-- Update measurement_summaries to work with new JSONB values
-- The trigger still works, but we'll update it to average all values in the JSONB
create or replace function public.refresh_measurement_summary()
returns trigger as $$
declare
  target_profile uuid;
  avg_values numeric;
begin
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    target_profile := NEW.profile_id;
  else
    target_profile := OLD.profile_id;
  end if;

  -- Calculate average across all numeric values in the JSONB values field
  select avg(value::numeric)::numeric(6,2)
  into avg_values
  from public.measurements m,
  lateral jsonb_each_text(m.values) as kv(key, value)
  where m.profile_id = target_profile
  and value ~ '^\d+\.?\d*$';  -- Only numeric values

  insert into public.measurement_summaries (profile_id, average_value_cm, sample_size, computed_at)
  values (
    target_profile,
    avg_values,
    (select count(*) from public.measurements where profile_id = target_profile),
    timezone('utc', now())
  )
  on conflict (profile_id) do update
  set average_value_cm = excluded.average_value_cm,
      sample_size = excluded.sample_size,
      computed_at = excluded.computed_at;

  return null;
end;
$$ language plpgsql;

-- Add some demo brands for testing
insert into public.brands (name, slug) values
  ('H&M', 'hm'),
  ('Zara', 'zara'),
  ('Nike', 'nike'),
  ('Adidas', 'adidas'),
  ('Levi''s', 'levis'),
  ('Uniqlo', 'uniqlo')
on conflict (slug) do nothing;

-- Comments for documentation
comment on type public.category is 'EN 13402 clothing categories for size classification';
comment on type public.size_source is 'Indicates how a size/measurement was obtained';
comment on column public.measurements.values is 'EN 13402 measurements stored as JSONB (e.g., {"chest": 92, "waist": 76})';
comment on table public.size_labels is 'Quick size entries from garment labels (brand + size like "M" or "42")';
comment on table public.measurement_history is 'Version history for measurements, automatically populated on updates';
