-- Migration: Create body_measurements and garments tables
-- Following the architecture from Rozmiary.pdf:
-- 1. body_measurements = Universal Measurement Profile (one per user, source of truth)
-- 2. garments = User's wardrobe items with their sizes

-- Body measurements table - Universal Size Passport
-- Stores all EN 13402 body measurements in centimeters
create table if not exists public.body_measurements (
  profile_id uuid primary key references public.profiles (id) on delete cascade,

  -- Basic measurements
  height_cm numeric(5,1),

  -- Upper body
  neck_cm numeric(5,1),
  chest_cm numeric(5,1),
  shoulder_cm numeric(5,1),
  sleeve_cm numeric(5,1),

  -- Female-specific measurements
  underbust_cm numeric(5,1),
  bust_cm numeric(5,1),

  -- Waist measurements (critical distinction!)
  waist_natural_cm numeric(5,1),  -- Natural waist (narrowest point)
  waist_pants_cm numeric(5,1),    -- Where pants are worn (usually lower)

  -- Lower body
  hips_cm numeric(5,1),
  inseam_cm numeric(5,1),

  -- Extremities
  head_cm numeric(5,1),
  hand_cm numeric(5,1),
  foot_left_cm numeric(5,1),
  foot_right_cm numeric(5,1),

  -- Metadata
  notes text,
  last_updated timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

-- Function to update last_updated timestamp
create or replace function public.touch_body_measurements_updated()
returns trigger as $$
begin
  new.last_updated = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Trigger to update last_updated
create trigger trg_body_measurements_updated
before update on public.body_measurements
for each row
execute function public.touch_body_measurements_updated();

-- Ring sizes table (special case - one size per finger)
create table if not exists public.ring_sizes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  digit_id text not null,  -- e.g., 'hand_left_ring', 'hand_right_index', 'toe_left_big'
  system text not null,     -- 'PL', 'EU', 'US', 'UK'
  value text not null,      -- e.g., '18', '59', '7.5'
  diameter_mm numeric(5,2), -- Optional: inner diameter
  circumference_mm numeric(5,2), -- Optional: inner circumference
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  unique(profile_id, digit_id)
);

create index idx_ring_sizes_profile on public.ring_sizes(profile_id);

create trigger trg_ring_sizes_updated
before update on public.ring_sizes
for each row
execute function public.touch_updated_at();

-- Garment types enum (more specific than category)
create type public.garment_type as enum (
  -- Tops
  'tshirt', 'shirt_casual', 'shirt_formal', 'sweater', 'hoodie', 'blazer', 'jacket', 'coat',
  -- Bottoms
  'jeans', 'pants_casual', 'pants_formal', 'shorts', 'skirt',
  -- Footwear
  'sneakers', 'dress_shoes', 'boots', 'sandals', 'slippers',
  -- Underwear
  'bra', 'underwear', 'socks',
  -- Accessories
  'hat', 'cap', 'gloves', 'belt', 'scarf',
  -- Other
  'other'
);

-- Garments table - user's wardrobe items
create table if not exists public.garments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,

  -- Item identification
  type public.garment_type not null,
  category public.category not null,
  name text not null,
  brand_id uuid references public.brands (id) on delete set null,
  brand_name text,  -- Denormalized for when brand_id is null

  -- Size information (flexible JSONB structure)
  -- Examples:
  -- Formal shirt: {"collar_cm": 41, "fit_type": "Slim Fit", "height_range": "176-182"}
  -- Jeans: {"waist_inch": 32, "length_inch": 34}
  -- Bra: {"system": "EU", "band": 75, "cup": "D"}
  -- Shoes: {"eu": "42.5", "us": "9", "uk": "8", "foot_length_cm": 27.5}
  -- T-shirt: {"size": "L", "size_eu": "52"}
  size jsonb not null,

  -- Optional details
  color text,
  photo_url text,
  purchase_date date,
  price numeric(10,2),
  currency text default 'PLN',
  notes text,

  -- Status
  is_favorite boolean default false,
  is_archived boolean default false,

  -- Metadata
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index idx_garments_profile on public.garments(profile_id);
create index idx_garments_type on public.garments(type);
create index idx_garments_category on public.garments(profile_id, category);
create index idx_garments_brand on public.garments(brand_id);
create index idx_garments_favorite on public.garments(profile_id, is_favorite) where is_favorite = true;

create trigger trg_garments_updated
before update on public.garments
for each row
execute function public.touch_updated_at();

-- Row Level Security
alter table public.body_measurements enable row level security;
alter table public.ring_sizes enable row level security;
alter table public.garments enable row level security;

-- Body measurements policies
create policy "Body measurements viewable by owner"
on public.body_measurements
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = body_measurements.profile_id
    and p.owner_id = auth.uid()
  )
);

create policy "Body measurements insertable by owner"
on public.body_measurements
for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = body_measurements.profile_id
    and p.owner_id = auth.uid()
  )
);

create policy "Body measurements updatable by owner"
on public.body_measurements
for update using (
  exists (
    select 1 from public.profiles p
    where p.id = body_measurements.profile_id
    and p.owner_id = auth.uid()
  )
);

create policy "Body measurements deletable by owner"
on public.body_measurements
for delete using (
  exists (
    select 1 from public.profiles p
    where p.id = body_measurements.profile_id
    and p.owner_id = auth.uid()
  )
);

-- Ring sizes policies
create policy "Ring sizes managed by owner"
on public.ring_sizes
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = ring_sizes.profile_id
    and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = ring_sizes.profile_id
    and p.owner_id = auth.uid()
  )
);

-- Garments policies
create policy "Garments managed by owner"
on public.garments
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = garments.profile_id
    and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = garments.profile_id
    and p.owner_id = auth.uid()
  )
);

-- Comments for documentation
comment on table public.body_measurements is 'Universal measurement profile - stores all EN 13402 body measurements for a user (source of truth)';
comment on column public.body_measurements.waist_natural_cm is 'Natural waist (narrowest point, above navel) - for upper body garments';
comment on column public.body_measurements.waist_pants_cm is 'Where pants are worn (usually at or below navel) - CRITICAL: different from natural waist!';

comment on table public.ring_sizes is 'Ring sizes for each finger - supports multiple sizing systems (PL, EU, US, UK)';
comment on column public.ring_sizes.digit_id is 'Unique identifier for each finger/toe, e.g., hand_left_ring, hand_right_index';

comment on table public.garments is 'User wardrobe items with their sizes - each item can have different size structure based on type';
comment on column public.garments.size is 'Flexible size structure in JSONB - varies by garment type (e.g., shirt has collar_cm+fit_type, jeans have waist_inch+length_inch)';
