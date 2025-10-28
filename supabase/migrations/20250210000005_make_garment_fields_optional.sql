-- Make garment name optional (can be auto-generated from type if needed)
alter table public.garments
  alter column name drop not null;

-- Make brand_name optional constraint more explicit
comment on column public.garments.name is 'Optional custom name for the garment. If null, can display type + brand';
comment on column public.garments.brand_name is 'Brand name when brand_id is not set. Either brand_id or brand_name should be set, but both are optional';
