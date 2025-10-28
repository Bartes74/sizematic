-- Add avatar_url column to profiles table
alter table public.profiles
add column avatar_url text;

-- Add comment
comment on column public.profiles.avatar_url is 'URL to user avatar image stored in Supabase Storage';
