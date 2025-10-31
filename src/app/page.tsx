import { LandingPage } from "@/components/landing-page";
import { createClient } from "@/lib/supabase/server";
import type { BrandingSettings } from "@/lib/types";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const t = await getTranslations("common");
  const supabase = await createClient();

  const { data: brandingData } = await supabase
    .from("branding_settings")
    .select("site_name, site_claim, logo_url, logo_path")
    .single();

  const branding: BrandingSettings = {
    site_name: brandingData?.site_name ?? t("appName"),
    site_claim: brandingData?.site_claim ?? t("appTagline"),
    logo_url: brandingData?.logo_url ?? null,
    logo_path: brandingData?.logo_path ?? null,
  };

  return <LandingPage branding={branding} />;
}
