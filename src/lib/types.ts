// Database types

// User role enum matching database
export type UserRole = 'free' | 'premium' | 'premium_plus' | 'admin';

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
  owner_id: string;
  email: string | null;
  display_name: string | null;
  unit_pref: "metric" | "imperial";
  role: UserRole;
  created_at: string;
  updated_at: string;
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

// Body Measurements - Universal Size Passport (one per user)
export type BodyMeasurements = {
  profile_id: string;
  // Basic measurements
  height_cm: number | null;
  // Upper body
  neck_cm: number | null;
  chest_cm: number | null;
  shoulder_cm: number | null;
  sleeve_cm: number | null;
  // Female-specific
  underbust_cm: number | null;
  bust_cm: number | null;
  // Waist (critical distinction!)
  waist_natural_cm: number | null;  // Natural waist (narrowest point)
  waist_pants_cm: number | null;    // Where pants are worn
  // Lower body
  hips_cm: number | null;
  inseam_cm: number | null;
  // Extremities
  head_cm: number | null;
  hand_cm: number | null;
  foot_left_cm: number | null;
  foot_right_cm: number | null;
  // Metadata
  notes: string | null;
  last_updated: string;
  created_at: string;
};

// Ring sizes (per finger)
export type RingSize = {
  id: string;
  profile_id: string;
  digit_id: string;  // e.g., 'hand_left_ring', 'hand_right_index'
  system: string;     // 'PL', 'EU', 'US', 'UK'
  value: string;      // e.g., '18', '59', '7.5'
  diameter_mm: number | null;
  circumference_mm: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// Garment types
export type GarmentType =
  // Tops
  | 'tshirt' | 'shirt_casual' | 'shirt_formal' | 'sweater' | 'hoodie' | 'blazer' | 'jacket' | 'coat'
  // Bottoms
  | 'jeans' | 'pants_casual' | 'pants_formal' | 'shorts' | 'skirt'
  // Footwear
  | 'sneakers' | 'dress_shoes' | 'boots' | 'sandals' | 'slippers'
  // Underwear
  | 'bra' | 'underwear' | 'socks'
  // Accessories
  | 'hat' | 'cap' | 'gloves' | 'belt' | 'scarf' | 'jewelry' | 'necklace' | 'bracelet' | 'ring' | 'earrings'
  // Other
  | 'other';

// Size structures for different garment types
export type FormalShirtSize = {
  collar_cm: number;
  fit_type: 'Slim Fit' | 'Tapered Fit' | 'Regular Fit' | 'Classic Fit';
  height_range?: string; // e.g., "176-182"
};

export type JeansSize = {
  waist_inch: number;
  length_inch: number;
};

export type BraSize = {
  system: 'EU' | 'UK';
  band: number;
  cup: string;
};

export type ShoeSize = {
  eu?: string;
  us?: string;
  uk?: string;
  foot_length_cm?: number;
};

export type GenericSize = {
  size?: string;  // e.g., "M", "L", "XL"
  size_eu?: string;  // e.g., "42", "48"
  [key: string]: string | number | undefined;
};

// Garment with flexible size structure
export type Garment = {
  id: string;
  profile_id: string;
  type: GarmentType;
  category: Category;
  name: string;
  brand_id: string | null;
  brand_name: string | null;
  size: FormalShirtSize | JeansSize | BraSize | ShoeSize | GenericSize | Record<string, any>;
  color: string | null;
  photo_url: string | null;
  purchase_date: string | null;
  price: number | null;
  currency: string | null;
  notes: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};
