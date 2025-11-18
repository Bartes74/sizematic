-- Backfill first_name from display_name for existing users
-- This migration populates first_name for users who registered before the fix
update public.profiles
set first_name = coalesce(
  first_name,
  display_name,
  split_part(email, '@', 1)
)
where first_name is null;

comment on column public.profiles.first_name is 'Preferred first name captured during registration or from display_name migration';
