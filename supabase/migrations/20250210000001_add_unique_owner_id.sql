-- Fix duplicate profiles and add unique constraint on owner_id

-- First, delete duplicate profiles, keeping only the oldest one for each owner_id
delete from public.profiles
where id in (
  select p2.id
  from public.profiles p1
  join public.profiles p2 on p1.owner_id = p2.owner_id and p1.id < p2.id
);

-- Now add unique constraint on owner_id to prevent future duplicates
alter table public.profiles
add constraint profiles_owner_id_key unique (owner_id);

-- Update the seed.sql profile inserts to use the unique constraint
-- The seed.sql already has "on conflict do nothing" but it wasn't working
-- because there was no constraint. Now it will work properly.
