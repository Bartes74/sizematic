-- Migration: Align pricing settings with PLN specification

alter table public.pricing_settings
  add column if not exists sg_pack_5 numeric(10, 2) not null default 49.99;

update public.pricing_settings
set sg_pack_5 = coalesce(sg_pack_5, sg_pack_10, sg_pack_3, 49.99);

alter table public.pricing_settings
  drop column if exists sg_pack_3,
  drop column if exists sg_pack_10;

alter table public.pricing_settings
  alter column currency set default 'PLN',
  alter column premium_monthly set default 29.99,
  alter column premium_yearly set default 99.99,
  alter column sg_pack_5 set default 49.99;

update public.pricing_settings
set currency = 'PLN',
    premium_monthly = 29.99,
    premium_yearly = 99.99,
    sg_pack_5 = 49.99;

comment on column public.pricing_settings.sg_pack_5 is 'Price (in currency units) for the Secret Giver 5-shot pack.';

