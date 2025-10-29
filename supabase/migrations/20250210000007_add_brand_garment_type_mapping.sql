-- Migration: Add brand-garment type mapping
-- This allows filtering available brands by garment type

-- Create brand_garment_types junction table
create table if not exists public.brand_garment_types (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  garment_type public.garment_type not null,
  created_at timestamptz not null default timezone('utc'::text, now()),

  -- Ensure each brand-type combination is unique
  unique(brand_id, garment_type)
);

-- Add indexes for performance
create index idx_brand_garment_types_brand_id on public.brand_garment_types(brand_id);
create index idx_brand_garment_types_garment_type on public.brand_garment_types(garment_type);

-- Enable RLS
alter table public.brand_garment_types enable row level security;

-- RLS policy: Anyone authenticated can view brand-garment-type mappings
create policy "Brand-garment type mappings are viewable by authenticated users"
  on public.brand_garment_types
  for select
  using (auth.uid() is not null);

-- Helper function to get brands for a specific garment type
create or replace function public.get_brands_for_garment_type(p_garment_type public.garment_type)
returns table (
  id uuid,
  name text,
  slug text,
  logo_url text,
  website_url text
)
language sql
stable
as $$
  select b.id, b.name, b.slug, b.logo_url, b.website_url
  from public.brands b
  inner join public.brand_garment_types bgt on b.id = bgt.brand_id
  where bgt.garment_type = p_garment_type
  order by b.name;
$$;
