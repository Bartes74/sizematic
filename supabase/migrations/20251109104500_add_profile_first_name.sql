-- Add first_name column to profiles to capture preferred first name at signup
alter table public.profiles
  add column if not exists first_name text;

comment on column public.profiles.first_name is 'Preferred first name captured during registration.';

