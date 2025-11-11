-- Migration: allow profiles to opt out of Secret Giver requests

alter table public.profiles
  add column if not exists allow_secret_giver boolean not null default true;

update public.profiles
set allow_secret_giver = true
where allow_secret_giver is null;

comment on column public.profiles.allow_secret_giver is 'When false, the account opts out of receiving Secret Giver requests.';

