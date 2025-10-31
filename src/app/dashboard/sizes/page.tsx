import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listMeasurementsForProfile } from '@/server/measurements';
import type {
  Brand,
  BrandTypeMapping,
  DashboardSizePreference,
  Measurement,
  SizeLabel,
} from '@/lib/types';
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
  let sizeLabels: SizeLabel[] = [];
  let sizePreferences: DashboardSizePreference[] = [];
  let brands: Brand[] = [];
  let brandMappings: BrandTypeMapping[] = [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
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

  const { data: preferencesData } = await supabase
    .from('dashboard_size_preferences')
    .select('quick_category, product_type, size_label_id')
    .eq('profile_id', profile.id);

  sizePreferences = (preferencesData ?? []) as DashboardSizePreference[];

  const { data: brandsData } = await supabase
    .from('brands')
    .select('id, name, logo_url, website_url, created_at, updated_at, slug')
    .order('name', { ascending: true });

  brands = (brandsData ?? []) as Brand[];

  const { data: brandMappingsData } = await supabase
    .from('brand_garment_types')
    .select('brand_id, garment_type');

  brandMappings = (brandMappingsData ?? []) as BrandTypeMapping[];

  return (
    <SizesDirectory
      measurements={measurements}
      sizeLabels={sizeLabels}
      sizePreferences={sizePreferences}
      brands={brands}
      brandMappings={brandMappings}
      profileId={profile.id}
    />
  );
}
