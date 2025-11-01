import { createClient } from '@/lib/supabase/server';
import type { BrandingSettings } from '@/lib/types';
import { getTranslations } from 'next-intl/server';

export async function getBrandingSettings(): Promise<BrandingSettings> {
  const t = await getTranslations('common');
  const supabase = await createClient();

  const { data } = await supabase
    .from('branding_settings')
    .select('site_name, site_claim, logo_url, logo_path')
    .single();

  return {
    site_name: data?.site_name ?? t('appName'),
    site_claim: data?.site_claim ?? t('appTagline'),
    logo_url: data?.logo_url ?? null,
    logo_path: data?.logo_path ?? null,
  };
}

