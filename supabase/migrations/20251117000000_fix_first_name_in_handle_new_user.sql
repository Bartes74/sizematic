-- Update handle_new_user trigger to extract first_name from user metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (owner_id, email, role, first_name)
  values (
    new.id,
    new.email,
    'free',
    coalesce(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

comment on function public.handle_new_user is 'Automatically create profile on user signup, extracting first_name from user metadata';
