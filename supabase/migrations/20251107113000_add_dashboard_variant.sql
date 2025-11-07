-- Migration: add dashboard_variant to profiles

do $$
begin
  if not exists (
    select 1
    from pg_type t
    where t.typname = 'dashboard_variant'
      and t.typnamespace = 'public'::regnamespace
  ) then
    create type public.dashboard_variant as enum ('full', 'simple');
  end if;
end;
$$;

alter table public.profiles
  add column if not exists dashboard_variant public.dashboard_variant;

update public.profiles
set dashboard_variant = (
  case when floor(random() * 2) = 0 then 'simple' else 'full' end
)::public.dashboard_variant
where dashboard_variant is null;

comment on column public.profiles.dashboard_variant is 'Assigned A/B variant for dashboard experience.';
