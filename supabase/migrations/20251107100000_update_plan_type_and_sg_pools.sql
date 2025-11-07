-- Migration: introduce plan_type and paid SG pools

-- 1. Define plan type enum if it doesn't exist
do $$
begin
  if not exists (
    select 1
    from pg_type t
    where t.typname = 'plan_type'
      and t.typnamespace = 'public'::regnamespace
  ) then
    create type public.plan_type as enum ('free', 'premium_monthly', 'premium_yearly');
  end if;
end;
$$;

-- 2. Extend profiles with plan management columns
alter table public.profiles
  add column if not exists plan_type public.plan_type not null default 'free',
  add column if not exists iap_sg_pool integer not null default 0;

-- 3. Ensure free SG pool default matches product specification (2 shots)
alter table public.profiles
  alter column free_sg_pool set default 2;

-- 4. Normalize existing data
update public.profiles
set plan_type = (case
    when role in ('premium', 'premium_plus', 'admin') then 'premium_monthly'
    else 'free'
  end)::public.plan_type
where plan_type is distinct from (case
    when role in ('premium', 'premium_plus', 'admin') then 'premium_monthly'
    else 'free'
  end)::public.plan_type;

update public.profiles
set free_sg_pool = 2
where free_sg_pool < 2;

-- 5. Comments for clarity
comment on column public.profiles.plan_type is 'Commercial plan tier for the account (separate from role-based permissions).';
comment on column public.profiles.iap_sg_pool is 'Additional Secret Giver shots purchased via in-app packs.';


