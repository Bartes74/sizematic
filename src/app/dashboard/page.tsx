import { HomePage } from "@/components/home-page";
import { listMeasurementsForProfile } from "@/server/measurements";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  BrandingSettings,
  DashboardSizePreference,
  Garment,
  Measurement,
  SizeLabel,
  UserRole,
  BodyMeasurements,
  DashboardEvent,
  WishlistStatus,
} from "@/lib/types";
import { redirect } from "next/navigation";
import { getTrustedCircleSnapshot } from "@/server/trusted-circle";

export const dynamic = "force-dynamic";

type PageSearchParams = {
  edit?: string | string[];
  upsell?: string | string[];
  section?: string | string[];
};

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const supabase = await createClient();
  const adminSupabase = createSupabaseAdminClient();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
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
  let events: DashboardEvent[] = [];
  let wishlistItems: {
    id: string;
    productName: string | null;
    productBrand: string | null;
    imageUrl: string | null;
    url: string | null;
    wishlistTitle: string;
    status: WishlistStatus | null;
  priceSnapshot: Record<string, unknown> | null;
  }[] = [];
  let dashboardVariant: 'full' | 'simple' = 'full';

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role, plan_type, dashboard_variant, avatar_url")
    .eq("owner_id", user.id)
    .single();

  if (!profile) {
    // The profile should exist thanks to auth trigger.
    throw new Error("Profil użytkownika nie istnieje dla zalogowanego konta.");
  }

  userName = profile.display_name || userName;
  userRole = profile.role as UserRole;
  avatarUrl = profile.avatar_url || null;

  dashboardVariant = (profile.dashboard_variant as 'full' | 'simple' | null) ?? 'full';
  if (!profile.dashboard_variant) {
    const assignedVariant: 'full' | 'simple' = Math.random() < 0.5 ? 'simple' : 'full';
    const { error: variantError } = await adminSupabase
      .from('profiles')
      .update({ dashboard_variant: assignedVariant })
      .eq('id', profile.id);

    if (variantError) {
      console.error('Failed to assign dashboard variant:', variantError.message);
    } else {
      dashboardVariant = assignedVariant;
    }
  }

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

  const { data: eventsData } = await supabase
    .from('dashboard_events')
    .select('*')
    .eq('profile_id', profile.id)
    .order('event_date', { ascending: true })
    .order('created_at', { ascending: true });

  events = ((eventsData ?? []) as Record<string, unknown>[]).map((event) => {
    const participants = (Array.isArray(event.participants)
      ? event.participants
      : []) as DashboardEvent['participants'];
    const notes = typeof event.notes === 'string' ? event.notes : null;

    return {
      ...event,
      participants,
      notes,
    } as DashboardEvent;
  });

  const { data: wishlistItemsData } = await adminSupabase
    .from('wishlist_items')
    .select(
      `
        id,
        product_name,
        product_brand,
        image_url,
        url,
        price_snapshot,
        wishlists!inner (
          id,
          title,
          status,
          owner_profile_id
        )
      `
    )
    .eq('wishlists.owner_profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(6);

  wishlistItems = ((wishlistItemsData ?? []) as Record<string, unknown>[]).map((raw) => {
    const row = raw as {
      id: string;
      product_name: string | null;
      product_brand: string | null;
      image_url: string | null;
      url: string | null;
    price_snapshot: Record<string, unknown> | null;
      wishlists: {
        id: string;
        title: string | null;
        status: WishlistStatus | null;
      } | null;
    };

    return {
      id: row.id,
      productName: row.product_name ?? null,
      productBrand: row.product_brand ?? null,
      imageUrl: row.image_url ?? null,
      url: row.url ?? null,
      wishlistTitle: row.wishlists?.title ?? 'Lista marzeń',
      status: row.wishlists?.status ?? null,
    priceSnapshot: row.price_snapshot ?? null,
    };
  });

  const upsellParam = resolvedSearchParams?.upsell;
  const upsellReasonRaw = Array.isArray(upsellParam)
    ? upsellParam[0] ?? null
    : upsellParam ?? null;

  const sectionParam = resolvedSearchParams?.section;
  const initialSection = Array.isArray(sectionParam)
    ? (sectionParam[0] as 'events' | 'trusted-circle' | 'wishlist' | undefined)
    : (sectionParam as 'events' | 'trusted-circle' | 'wishlist' | undefined);

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
      events={events}
      wishlistItems={wishlistItems}
      trustedCircleInitial={trustedCircleInitial ?? undefined}
      bodyMeasurements={bodyMeasurements}
      dashboardVariant={dashboardVariant}
      upsellReason={upsellReasonRaw}
      initialSection={initialSection ?? null}
    />
  );
}
