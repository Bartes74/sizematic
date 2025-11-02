import { HomePage } from "@/components/home-page";
import { listMeasurementsForProfile } from "@/server/measurements";
import { createClient } from "@/lib/supabase/server";
import type {
  BrandingSettings,
  DashboardSizePreference,
  Garment,
  Measurement,
  SizeLabel,
  UserRole,
  BodyMeasurements,
} from "@/lib/types";
import { redirect } from "next/navigation";
import { getTrustedCircleSnapshot } from "@/server/trusted-circle";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Get user profile for role and display name
  let userName = user.email?.split("@")[0] || null;
  let userRole: UserRole = "free";
  let avatarUrl: string | null = null;
  type GarmentWithBrand = Garment & {
    brands?: {
      name: string | null;
    } | null;
  };
  let garments: GarmentWithBrand[] = [];
  let sizeLabels: SizeLabel[] = [];
  let measurements: Measurement[] = [];
  let sizePreferences: DashboardSizePreference[] = [];
  let branding: BrandingSettings = {
    site_name: "SizeHub",
    site_claim: "SizeSync",
    logo_url: null,
    logo_path: null,
  };
  let trustedCircleInitial: Awaited<ReturnType<typeof getTrustedCircleSnapshot>> | null = null;
  let bodyMeasurements: BodyMeasurements | null = null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role, avatar_url")
    .eq("owner_id", user.id)
    .single();

  if (!profile) {
    // The profile should exist thanks to auth trigger.
    throw new Error("Profil użytkownika nie istnieje dla zalogowanego konta.");
  }

  userName = profile.display_name || userName;
  userRole = profile.role as UserRole;
  avatarUrl = profile.avatar_url || null;

  measurements = await listMeasurementsForProfile(supabase, profile.id);

  const { data: garmentsData } = await supabase
    .from("garments")
    .select(
      `
          *,
          brands (
            name
          )
        `
    )
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: sizeLabelsData } = await supabase
    .from("size_labels")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  garments = (garmentsData ?? []) as GarmentWithBrand[];
  sizeLabels = (sizeLabelsData ?? []) as SizeLabel[];

  const { data: preferencesData } = await supabase
    .from("dashboard_size_preferences")
    .select("quick_category, product_type, size_label_id")
    .eq("profile_id", profile.id);

  sizePreferences = (preferencesData ?? []) as DashboardSizePreference[];

  const { data: bodyMeasurementsData } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle();

  bodyMeasurements = bodyMeasurementsData as BodyMeasurements | null;

  const { data: brandingData } = await supabase
    .from("branding_settings")
    .select("site_name, site_claim, logo_url, logo_path")
    .single();

  if (brandingData) {
    branding = {
      site_name: brandingData.site_name ?? branding.site_name,
      site_claim: brandingData.site_claim ?? branding.site_claim,
      logo_url: brandingData.logo_url ?? null,
      logo_path: brandingData.logo_path ?? null,
    };
  }

  try {
    trustedCircleInitial = await getTrustedCircleSnapshot(user.id);
  } catch (error) {
    console.warn('Failed to load trusted circle snapshot for dashboard:', error);
  }

  return (
    <HomePage
      measurements={measurements}
      userName={userName}
      userRole={userRole}
      avatarUrl={avatarUrl}
      garments={garments}
      sizeLabels={sizeLabels}
      branding={branding}
      sizePreferences={sizePreferences}
      profileId={profile.id}
      trustedCircleInitial={trustedCircleInitial ?? undefined}
      bodyMeasurements={bodyMeasurements}
    />
  );
}
