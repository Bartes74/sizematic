import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided for edge sync tasks.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false
  }
});

export async function syncMeasurementAverages(profileId: string) {
  const { data, error } = await supabase
    .from("measurements")
    .select("value_cm")
    .eq("profile_id", profileId);

  if (error) {
    throw new Error(`Failed to load measurements: ${error.message}`);
  }

  if (!data?.length) {
    return { profileId, average: null };
  }

  const sum = data.reduce((total, item) => total + Number(item.value_cm ?? 0), 0);
  const average = sum / data.length;

  const { error: upsertError } = await supabase
    .from("measurement_summaries")
    .upsert({ profile_id: profileId, average_value_cm: average, sample_size: data.length });

  if (upsertError) {
    throw new Error(`Failed to update summary: ${upsertError.message}`);
  }

  return { profileId, average };
}
