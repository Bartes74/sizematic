-- Create a demo user in auth.users first
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'demo@sizehub.local',
    crypt('demo123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    'authenticated',
    'authenticated'
  )
on conflict (id) do nothing;

-- Create corresponding profile
insert into public.profiles (owner_id, display_name, unit_pref)
values
  ('00000000-0000-0000-0000-000000000000', 'Demo Profile', 'metric')
on conflict do nothing;

-- Add demo measurements
insert into public.measurements (profile_id, category, label, value_cm, notes)
select id, 'tops', 'Chest', 92.0, 'Baseline value'
from public.profiles
where owner_id = '00000000-0000-0000-0000-000000000000'
on conflict do nothing;

insert into public.measurement_summaries (profile_id, average_value_cm, sample_size)
select id, 92.0, 1
from public.profiles
where owner_id = '00000000-0000-0000-0000-000000000000'
on conflict (profile_id) do update set average_value_cm = excluded.average_value_cm, sample_size = excluded.sample_size;
