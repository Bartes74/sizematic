import { LandingPage } from "@/components/landing-page";
import { getBrandingSettings } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function Home() {
  const branding = await getBrandingSettings();
  return <LandingPage branding={branding} />;
}
