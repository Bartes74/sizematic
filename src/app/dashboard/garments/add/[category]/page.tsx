import { createClient } from "@/lib/supabase/server";
import { GarmentForm } from "@/components/garment-form";
import { GlobalHeader } from "@/components/global-header";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { BodyMeasurements, BrandingSettings, Category, UserRole } from "@/lib/types";
import { QUICK_CATEGORY_CONFIGS } from "@/data/product-tree";
import type { QuickCategoryId } from "@/data/product-tree";

export const dynamic = "force-dynamic";

const CATEGORY_NAMES: Record<Category, string> = {
  tops: 'Góra',
  bottoms: 'Dół',
  footwear: 'Buty',
  outerwear: 'Odzież wierzchnia',
  headwear: 'Bielizna',
  accessories: 'Akcesoria',
  kids: 'Dzieci',
};

export default async function AddGarmentByCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ productType?: string; quickCategory?: string }>;
}) {
  const { category } = await params;
  const resolvedSearchParams = await searchParams;
  const productType = resolvedSearchParams?.productType ?? null;
  const quickCategoryParam = resolvedSearchParams?.quickCategory ?? null;
  const validQuickCategories = new Set<QuickCategoryId>(
    QUICK_CATEGORY_CONFIGS.map((item) => item.id)
  );
  const quickCategoryList: QuickCategoryId[] = quickCategoryParam
    ? quickCategoryParam
        .split(',')
        .map((item) => item.trim())
        .filter((item): item is QuickCategoryId =>
          Boolean(item) && validQuickCategories.has(item as QuickCategoryId)
        )
    : [];

  const displayHeading = quickCategoryList.length
    ? QUICK_CATEGORY_CONFIGS.find((item) => quickCategoryList.includes(item.id))?.label ?? CATEGORY_NAMES[category as Category]
    : CATEGORY_NAMES[category as Category];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  let userName = user.email?.split('@')[0] ?? null;
  let userRole: UserRole = 'free';
  let avatarUrl: string | null = null;
  let branding: BrandingSettings = {
    site_name: 'SizeHub',
    site_claim: 'SizeSync',
    logo_url: null,
    logo_path: null,
  };

  // Validate category
  if (!Object.keys(CATEGORY_NAMES).includes(category)) {
    redirect('/dashboard/garments/add');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, role, avatar_url')
    .eq('owner_id', user.id)
    .single();

  if (!profile) {
    redirect('/');
  }

  userName = profile.display_name ?? userName;
  userRole = profile.role as UserRole;
  avatarUrl = profile.avatar_url ?? null;

  // Get available brands
  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .order('name');

  // Get brand-garment-type mappings
  const { data: brandMappings } = await supabase
    .from('brand_garment_types')
    .select('brand_id, garment_type');

  const { data: bodyMeasurements } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('profile_id', profile.id)
    .maybeSingle();

  const { data: brandingData } = await supabase
    .from('branding_settings')
    .select('site_name, site_claim, logo_url, logo_path')
    .maybeSingle();

  if (brandingData) {
    branding = {
      site_name: brandingData.site_name ?? branding.site_name,
      site_claim: brandingData.site_claim ?? branding.site_claim,
      logo_url: brandingData.logo_url ?? null,
      logo_path: brandingData.logo_path ?? null,
    };
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <GlobalHeader
        userName={userName}
        role={userRole}
        avatarUrl={avatarUrl}
        branding={branding}
      />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {displayHeading}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Dodaj przedmiot do swojej garderoby
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Wróć do dashboardu
          </Link>
        </div>

        <div className="mt-10">
          <GarmentForm
            profileId={profile.id}
            category={category as Category}
            brands={brands || []}
            brandMappings={brandMappings || []}
            bodyMeasurements={(bodyMeasurements as BodyMeasurements) || null}
            initialProductTypeId={productType ?? null}
            extraQuickCategories={quickCategoryList}
          />
        </div>
      </main>
    </div>
  );
}
