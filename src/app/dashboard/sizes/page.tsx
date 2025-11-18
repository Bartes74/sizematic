import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listMeasurementsForProfile } from '@/server/measurements';
import type {
  BrandingSettings,
  DashboardSizePreference,
  Garment,
  Measurement,
  SizeLabel,
  UserRole,
} from '@/lib/types';
import { GlobalHeader } from '@/components/global-header';
import { SizesDirectory } from '@/components/sizes-directory';

export const dynamic = 'force-dynamic';

export default async function SizesDirectoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  let measurements: Measurement[] = [];
  let garments: (Garment & {
    brands?: {
      name: string | null;
    } | null;
  })[] = [];
  let sizeLabels: SizeLabel[] = [];
  let sizePreferences: DashboardSizePreference[] = [];
  let userName = user.email?.split('@')[0] ?? null;
  let userRole: UserRole = 'free';
  let avatarUrl: string | null = null;
  let branding: BrandingSettings = {
    site_name: 'SizeHub',
    site_claim: 'SizeSync',
    logo_url: null,
    logo_path: null,
  };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, role, avatar_url')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!profile) {
    throw new Error('Profil użytkownika nie istnieje.');
  }

  measurements = await listMeasurementsForProfile(supabase, profile.id);

  const { data: sizeLabelsData } = await supabase
    .from('size_labels')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false });

  sizeLabels = (sizeLabelsData ?? []) as SizeLabel[];

  const { data: garmentsData } = await supabase
    .from('garments')
    .select(
      `
        *,
        brands (
          name
        )
      `
    )
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false });

  garments = (garmentsData ?? []) as (Garment & {
    brands?: {
      name: string | null;
    } | null;
  })[];

  const { data: preferencesData } = await supabase
    .from('dashboard_size_preferences')
    .select('quick_category, product_type, size_label_id')
    .eq('profile_id', profile.id);

  sizePreferences = (preferencesData ?? []) as DashboardSizePreference[];

  userName = profile.first_name ?? userName;
  userRole = profile.role as UserRole;
  avatarUrl = profile.avatar_url ?? null;

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
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-surface-elevated via-background to-background dark:from-[#08142a] dark:via-[#071225] dark:to-[#071225]" />
      <GlobalHeader
        userName={userName}
        role={userRole}
        avatarUrl={avatarUrl}
        branding={branding}
      />
      <SizesDirectory
        measurements={measurements}
        garments={garments}
        sizeLabels={sizeLabels}
        sizePreferences={sizePreferences}
        profileId={profile.id}
      />
    </div>
  );
}
