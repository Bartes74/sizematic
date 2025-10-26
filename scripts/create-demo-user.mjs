import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(url, serviceRole, {
  auth: {
    persistSession: false
  }
});

const DEMO_EMAIL = 'demo@sizesync.dev';
const DEMO_PASSWORD = 'DemoPass123!';

const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 100
});

if (listError) {
  console.error('Failed to list users:', listError);
  process.exit(1);
}

let demoUser = existingUsers?.users.find((user) => user.email === DEMO_EMAIL);

if (!demoUser) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true
  });

  if (error) {
    console.error('Failed to create demo user:', error);
    process.exit(1);
  }

  demoUser = data?.user ?? null;
}

if (!demoUser) {
  console.error('Demo user not found and could not be created.');
  process.exit(1);
}

const profilePayload = {
  owner_id: demoUser.id,
  display_name: 'Demo Profile',
  unit_pref: 'metric'
};

const { error: upsertProfileError } = await supabase.from('profiles').upsert(profilePayload, {
  onConflict: 'owner_id'
});

if (upsertProfileError) {
  console.error('Failed to upsert profile:', upsertProfileError);
  process.exit(1);
}

const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('owner_id', demoUser.id)
  .maybeSingle();

if (!profile) {
  console.error('Profile not found after upsert.');
  process.exit(1);
}

const measurementPayload = {
  profile_id: profile.id,
  category: 'tops',
  label: 'Chest',
  value_cm: 92,
  notes: 'Baseline value'
};

const { error: insertMeasurementError } = await supabase.from('measurements').insert(measurementPayload);

if (insertMeasurementError && insertMeasurementError.code !== '23505') {
  console.error('Failed to insert measurement:', insertMeasurementError);
  process.exit(1);
}

console.log('Demo user and measurement ensured.');
