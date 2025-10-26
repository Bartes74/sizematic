export type Profile = {
  id: string;
  display_name: string | null;
  unit_pref: "metric" | "imperial";
};

export type Measurement = {
  id: string;
  profile_id: string;
  label: string;
  value_cm: number;
  category: string;
  notes: string | null;
  recorded_at: string;
};

export type MeasurementSummary = {
  profile_id: string;
  average_value_cm: number | null;
  sample_size: number;
  computed_at: string;
};
