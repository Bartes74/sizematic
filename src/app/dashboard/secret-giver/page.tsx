import { SecretGiverDashboard } from '@/components/secret-giver/secret-giver-dashboard';
import { GlobalHeader } from '@/components/global-header';
import { SiteFooter } from '@/components/site-footer';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { BrandingSettings, UserRole } from '@/lib/types';

export default async function SecretGiverPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, role, avatar_url')
    .eq('owner_id', user.id)
    .single();

  if (!profile) {
    throw new Error('Profil użytkownika nie istnieje.');
  }

  const userName = profile.display_name || user.email?.split('@')[0] || null;
  const userRole = profile.role as UserRole;
  const avatarUrl = profile.avatar_url || null;

  // Get branding
  const { data: brandingData } = await supabase
    .from('branding_settings')
    .select('site_name, site_claim, logo_url, logo_path')
    .single();

  const branding: BrandingSettings = {
    site_name: brandingData?.site_name ?? 'SizeHub',
    site_claim: brandingData?.site_claim ?? 'SizeSync',
    logo_url: brandingData?.logo_url ?? null,
    logo_path: brandingData?.logo_path ?? null,
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <GlobalHeader
        userName={userName}
        role={userRole}
        avatarUrl={avatarUrl}
        branding={branding}
      />
      <main className="flex-1">
        <SecretGiverDashboard />
      </main>
      <SiteFooter />
    </div>
  );
}

