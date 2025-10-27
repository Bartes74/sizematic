// Database types

// Category enum matching database
export type Category =
  | "tops"
  | "bottoms"
  | "footwear"
  | "headwear"
  | "accessories"
  | "outerwear"
  | "kids";

// Size source enum
export type SizeSource = "measurement" | "label" | "estimated";

// EN 13402 measurement values (flexible JSONB structure)
export type MeasurementValues = {
  // Common body measurements in cm
  chest?: number;
  waist?: number;
  hips?: number;
  inseam?: number;
  height?: number;
  neck?: number;
  shoulder?: number;
  sleeve?: number;
  foot_length?: number;
  head?: number;
  hand?: number;
  // Allow additional custom measurements
  [key: string]: number | undefined;
};

export type Profile = {
  id: string;
  display_name: string | null;
  unit_pref: "metric" | "imperial";
};

export type Measurement = {
  id: string;
  profile_id: string;
  category: Category;
  values: MeasurementValues;
  notes: string | null;
  source: SizeSource;
  recorded_at: string;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
};

export type SizeLabel = {
  id: string;
  profile_id: string;
  brand_id: string | null;
  brand_name: string | null;
  category: Category;
  label: string; // e.g., "M", "42", "10.5"
  notes: string | null;
  source: SizeSource;
  recorded_at: string;
  created_at: string;
};

export type MeasurementHistory = {
  id: string;
  measurement_id: string;
  profile_id: string;
  category: Category;
  values: MeasurementValues;
  notes: string | null;
  source: SizeSource;
  recorded_at: string;
  version_created_at: string;
};

export type MeasurementSummary = {
  profile_id: string;
  average_value_cm: number | null;
  sample_size: number;
  computed_at: string;
};
