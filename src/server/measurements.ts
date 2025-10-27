import "server-only";

import type {
  Measurement,
  MeasurementSummary,
  Category,
  MeasurementValues,
  SizeSource,
} from "@/lib/types";
import { createSupabaseAdminClient } from "@/lib/supabase";

type MeasurementInsert = {
  profile_id: string;
  category: Category;
  values: MeasurementValues;
  notes?: string | null;
  source?: SizeSource;
};

const DEMO_PROFILE_OWNER = "00000000-0000-0000-0000-000000000000";

async function resolveDemoProfileId() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("owner_id", DEMO_PROFILE_OWNER)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to resolve demo profile: ${error.message}`);
  }

  return data?.id ?? null;
}

export async function listMeasurements(): Promise<Measurement[]> {
  const supabase = createSupabaseAdminClient();
  const profileId = await resolveDemoProfileId();

  if (!profileId) {
    return [];
  }

  const { data, error } = await supabase
    .from("measurements")
    .select("*")
    .eq("profile_id", profileId)
    .order("recorded_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load measurements: ${error.message}`);
  }

  return data as Measurement[];
}

export async function getMeasurementSummary(): Promise<MeasurementSummary | null> {
  const supabase = createSupabaseAdminClient();
  const profileId = await resolveDemoProfileId();

  if (!profileId) {
    return null;
  }

  const { data, error } = await supabase
    .from("measurement_summaries")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load measurement summary: ${error.message}`);
  }

  return (data as MeasurementSummary) ?? null;
}

export async function addMeasurement(payload: Omit<MeasurementInsert, "profile_id">) {
  const supabase = createSupabaseAdminClient();
  const profileId = await resolveDemoProfileId();

  if (!profileId) {
    throw new Error("Demo profile is missing; run supabase db seed to create initial data.");
  }

  const { error } = await supabase.from("measurements").insert({
    profile_id: profileId,
    source: "measurement" as SizeSource,
    ...payload
  });

  if (error) {
    throw new Error(`Failed to insert measurement: ${error.message}`);
  }
}
