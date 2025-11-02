// Database types

// User role enum matching database
export type UserRole = 'free' | 'premium' | 'premium_plus' | 'admin';

export type BrandingSettings = {
  site_name: string;
  site_claim: string;
  logo_url: string | null;
  logo_path: string | null;
};

export type DashboardSizePreference = {
  quick_category: string;
  product_type: string | null;
  size_label_id: string | null;
};

export type TrustedCircleInvitationStatus = 'pending' | 'accepted' | 'revoked' | 'cancelled';

export type TrustedCircleInvitation = {
  id: string;
  inviter_profile_id: string;
  invitee_profile_id: string | null;
  invitee_email: string;
  status: TrustedCircleInvitationStatus;
  token: string;
  message: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

export type TrustedCircleMembership = {
  id: string;
  owner_profile_id: string;
  member_profile_id: string;
  created_at: string;
};

export type TrustedCirclePermission = {
  id: string;
  owner_profile_id: string;
  member_profile_id: string;
  category: string;
  product_type: string | null;
  created_at: string;
  updated_at: string;
};

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
  product_type?: string | null;
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
  id: string;
  profile_id: string;
  created_at: string;
  updated_at: string;
  height_cm: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  waist_pants_cm: number | null;
  hips_cm: number | null;
  shoulder_cm: number | null;
  sleeve_cm: number | null;
  neck_cm: number | null;
  bust_cm: number | null;
  underbust_cm: number | null;
  torso_girth_cm: number | null;
  inseam_cm: number | null;
  thigh_cm: number | null;
  foot_length_mm: number | null;
  foot_width_cm: number | null;
  finger_circumference_mm: number | null;
  wrist_cm: number | null;
  hand_circumference_cm: number | null;
  hand_length_cm: number | null;
  head_cm: number | null;
  notes: string | null;
};

export type DashboardEventParticipant = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export type DashboardEvent = {
  id: string;
  profile_id: string;
  title: string;
  event_date: string;
  is_recurring: boolean;
  participants: DashboardEventParticipant[];
  created_at: string;
  updated_at: string;
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

export type BrandTypeMapping = {
  brand_id: string;
  garment_type: GarmentType;
};

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
  brands?: {
    name: string | null;
  } | null;
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

export type WishlistStatus = 'draft' | 'active' | 'archived';
export type ItemParseStatus = 'pending' | 'success' | 'failed';
export type SizeMatchConfidence = 'exact' | 'similar' | 'manual' | 'missing';
export type WishlistShareStatus = 'pending' | 'accepted' | 'revoked';
export type ClaimStatus = 'claimed' | 'purchased' | 'cancelled';

export type Wishlist = {
  id: string;
  owner_id: string;
  owner_profile_id: string;
  title: string;
  slug: string;
  status: WishlistStatus;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type WishlistItem = {
  id: string;
  wishlist_id: string;
  url: string;
  product_name: string | null;
  product_brand: string | null;
  image_url: string | null;
  price_snapshot: Record<string, unknown> | null;
  parse_status: ItemParseStatus;
  parse_error: string | null;
  parsed_at: string | null;
  matched_size: string | null;
  size_confidence: SizeMatchConfidence;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WishlistShare = {
  id: string;
  wishlist_id: string;
  recipient_email: string;
  recipient_profile_id: string | null;
  status: WishlistShareStatus;
  invite_token: string;
  invited_by: string;
  notified_at: string | null;
  accepted_at: string | null;
  created_at: string;
};

export type WishlistClaim = {
  id: string;
  wishlist_item_id: string;
  share_id: string;
  claimer_profile_id: string;
  status: ClaimStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
};

export type BrandSizeProfile = {
  id: string;
  profile_id: string;
  brand_name: string;
  preferred_size: string;
  fit_notes: string | null;
  created_at: string;
  updated_at: string;
};
