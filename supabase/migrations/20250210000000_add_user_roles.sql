-- Add user role enum and column to profiles
create type public.user_role as enum ('free', 'premium', 'premium_plus', 'admin');

-- Add role column to profiles table
alter table public.profiles
add column role public.user_role not null default 'free';

-- Add email column to profiles for easier access
alter table public.profiles
add column email text;

-- Create index for role-based queries
create index if not exists idx_profiles_role on public.profiles(role);

-- Function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (owner_id, email, role)
  values (new.id, new.email, 'free');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function to check if user has minimum role
create or replace function public.has_role(required_role public.user_role)
returns boolean as $$
declare
  user_role public.user_role;
begin
  select role into user_role
  from public.profiles
  where owner_id = auth.uid();

  if user_role is null then
    return false;
  end if;

  -- Role hierarchy: admin > premium_plus > premium > free
  case required_role
    when 'free' then
      return true;
    when 'premium' then
      return user_role in ('premium', 'premium_plus', 'admin');
    when 'premium_plus' then
      return user_role in ('premium_plus', 'admin');
    when 'admin' then
      return user_role = 'admin';
    else
      return false;
  end case;
end;
$$ language plpgsql security definer;

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on public.profiles to anon, authenticated;
grant all on public.measurements to authenticated;
grant all on public.measurement_summaries to authenticated;
