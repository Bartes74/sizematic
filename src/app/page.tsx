import { createClient } from "@/lib/supabase/server";
import type { BrandingSettings } from "@/lib/types";
import { LandingPage } from "@/components/landing-page";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const { data: brandingData } = await supabase
    .from("branding_settings")
    .select("site_name, site_claim, logo_url, logo_path")
    .single();

  const branding: BrandingSettings = {
    site_name: brandingData?.site_name ?? "Gift Fit",
    site_claim: brandingData?.site_claim ?? "Niespodzianka w idealnym rozmiarze!",
    logo_url: brandingData?.logo_url ?? null,
    logo_path: brandingData?.logo_path ?? null,
  };

  return <LandingPage branding={branding} />;
}
