import "server-only";

import type {
  Measurement,
  MeasurementSummary,
  Category,
  MeasurementValues,
  SizeSource,
} from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { processMissionEvent } from "@/lib/missions/events";

type DbClient = SupabaseClient<Record<string, unknown>>;

type MeasurementInsert = {
  category: Category;
  values: MeasurementValues;
  notes?: string | null;
  source?: SizeSource;
};

export async function listMeasurementsForProfile(
  supabase: DbClient,
  profileId: string
): Promise<Measurement[]> {
  const { data, error } = await supabase
    .from("measurements")
    .select("*")
    .eq("profile_id", profileId)
    .order("recorded_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load measurements: ${error.message}`);
  }

  return (data ?? []) as Measurement[];
}

export async function getMeasurementSummaryForProfile(
  supabase: DbClient,
  profileId: string
): Promise<MeasurementSummary | null> {
  const { data, error } = await supabase
    .from("measurement_summaries")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load measurement summary: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data as MeasurementSummary;
}

export async function addMeasurementForProfile(
  supabase: DbClient,
  profileId: string,
  payload: MeasurementInsert
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as SupabaseClient<any>;

  const { error } = await client.from("measurements").insert({
    profile_id: profileId,
    source: (payload.source ?? "measurement") as SizeSource,
    ...payload,
  });

  if (error) {
    throw new Error(`Failed to insert measurement: ${error.message}`);
  }

  const fieldCount = Object.values(payload.values).filter(
    (value) => value !== undefined && value !== null && value !== 0
  ).length;

  await processMissionEvent(
    {
      type: "ITEM_CREATED",
      profileId,
      payload: {
        source: "measurement",
        category: payload.category,
        subtype: null,
        createdAt: new Date().toISOString(),
        fieldCount,
        criticalFieldCompleted: false,
      },
    },
    client
  );
}
