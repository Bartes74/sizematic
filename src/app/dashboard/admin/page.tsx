import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminBrandingForm } from "@/components/admin-branding-form";
import { AdminPricingForm } from "@/components/admin-pricing-form";
import { AdminUsersExplorer } from "@/components/admin-users-explorer";
import { getPricingSettings } from "@/lib/pricing";
import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import type { DashboardVariant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  // Get current user's profile to check if they're admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('owner_id', user.id)
    .single();

  // Only admins can access this page
  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  const adminClient = createSupabaseAdminClient();

  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalUsersRes,
    activeUsersRes,
    premiumUsersRes,
    totalMeasurementsRes,
    totalSizeLabelsRes,
    totalWishlistItemsRes,
    activeSubscriptionsRes,
    brandingDataRes,
  ] = await Promise.all([
    adminClient.from('profiles').select('*', { count: 'exact', head: true }),
    adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', sevenDaysAgoIso),
    adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .neq('plan_type', 'free'),
    adminClient.from('measurements').select('*', { count: 'exact', head: true }),
    adminClient.from('size_labels').select('*', { count: 'exact', head: true }),
    adminClient.from('wishlist_items').select('*', { count: 'exact', head: true }),
    adminClient
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'trialing']),
    adminClient
      .from('branding_settings')
      .select('site_name, site_claim, logo_url, logo_path')
      .single(),
  ]);

  const logCountError = (label: string, response: { error: unknown }) => {
    if (response.error) {
      console.error(`[Admin] Failed to load ${label}`, response.error);
    }
  };

  logCountError('totalUsers', totalUsersRes);
  logCountError('activeUsers', activeUsersRes);
  logCountError('premiumUsers', premiumUsersRes);
  logCountError('measurements', totalMeasurementsRes);
  logCountError('sizeLabels', totalSizeLabelsRes);
  logCountError('wishlistItems', totalWishlistItemsRes);
  logCountError('activeSubscriptions', activeSubscriptionsRes);
  logCountError('brandingSettings', brandingDataRes);

  const stats = {
    totalUsers: totalUsersRes.count ?? 0,
    activeUsers7d: activeUsersRes.count ?? 0,
    premiumUsers: premiumUsersRes.count ?? 0,
    measurementCount: totalMeasurementsRes.count ?? 0,
    sizeLabelCount: totalSizeLabelsRes.count ?? 0,
    wishlistItemCount: totalWishlistItemsRes.count ?? 0,
    activeSubscriptions: activeSubscriptionsRes.count ?? 0,
  };

  const variantKeys: DashboardVariant[] = ['full', 'simple'];
  const variantStats = await Promise.all(
    variantKeys.map(async (variant) => {
      const [totalRes, activeRes, premiumRes] = await Promise.all([
        adminClient
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('dashboard_variant', variant),
        adminClient
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('dashboard_variant', variant)
          .gte('updated_at', sevenDaysAgoIso),
        adminClient
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('dashboard_variant', variant)
          .neq('plan_type', 'free'),
      ]);

      logCountError(`variant:${variant}:total`, totalRes);
      logCountError(`variant:${variant}:active`, activeRes);
      logCountError(`variant:${variant}:premium`, premiumRes);

      return {
        variant,
        total: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        premium: premiumRes.count ?? 0,
      };
    })
  );

  const brandingSettings = {
    site_name: brandingDataRes.data?.site_name ?? 'SizeHub',
    site_claim: brandingDataRes.data?.site_claim ?? 'SizeSync',
    logo_url: brandingDataRes.data?.logo_url ?? null,
    logo_path: brandingDataRes.data?.logo_path ?? null,
  };

  const pricingSettings = await getPricingSettings();
  const t = await getTranslations('dashboard.admin');
  const locale = (await getLocale()) ?? 'en';
  const numberFormatter = new Intl.NumberFormat(locale);
  const percentFormatter = new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const datetimeFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const statsGeneratedAt = datetimeFormatter.format(new Date());

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
              aria-label={t('back')}
            >
              <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium text-muted-foreground">{t('back')}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('pageTitle')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('pageSubtitle')}</p>
        </div>

        <div className="space-y-10">
          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('analytics.title')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('analytics.subtitle')}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                {
                  key: 'totalUsers',
                  label: t('analytics.cards.totalUsers'),
                  value: stats.totalUsers,
                },
                {
                  key: 'activeUsers',
                  label: t('analytics.cards.activeUsers'),
                  value: stats.activeUsers7d,
                },
                {
                  key: 'premiumUsers',
                  label: t('analytics.cards.premiumUsers'),
                  value: stats.premiumUsers,
                },
                {
                  key: 'measurements',
                  label: t('analytics.cards.measurements'),
                  value: stats.measurementCount,
                },
                {
                  key: 'sizeLabels',
                  label: t('analytics.cards.sizeLabels'),
                  value: stats.sizeLabelCount,
                },
                {
                  key: 'wishlistItems',
                  label: t('analytics.cards.wishlistItems'),
                  value: stats.wishlistItemCount,
                },
                {
                  key: 'activeSubscriptions',
                  label: t('analytics.cards.activeSubscriptions'),
                  value: stats.activeSubscriptions,
                },
              ].map((card) => (
                <div key={card.key} className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm shadow-black/5">
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{numberFormatter.format(card.value)}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">{t('analytics.updated', { timestamp: statsGeneratedAt })}</p>
          </section>

          <section className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('abTest.title')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('abTest.subtitle')}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {variantStats.map((item) => {
                const total = item.total;
                const activeRate = total > 0 ? item.active / total : 0;
                const premiumRate = total > 0 ? item.premium / total : 0;

                return (
                  <div key={item.variant} className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm shadow-black/5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{t(`users.variantLabels.${item.variant}`)}</h3>
                        <p className="text-xs text-muted-foreground">{t('abTest.metrics.total', { value: numberFormatter.format(total) })}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t('abTest.metrics.active')}</span>
                          <span className="font-semibold text-foreground">{numberFormatter.format(item.active)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{t('abTest.metrics.activeRate')}</span>
                          <span className="font-medium text-foreground/80">{percentFormatter.format(activeRate)}</span>
                        </div>
                        <div className="relative h-1.5 rounded-full bg-muted/40">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-primary"
                            style={{ width: `${Math.min(100, Math.round(activeRate * 100))}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t('abTest.metrics.premium')}</span>
                          <span className="font-semibold text-foreground">{numberFormatter.format(item.premium)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{t('abTest.metrics.premiumRate')}</span>
                          <span className="font-medium text-foreground/80">{percentFormatter.format(premiumRate)}</span>
                        </div>
                        <div className="relative h-1.5 rounded-full bg-muted/40">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-primary/70"
                            style={{ width: `${Math.min(100, Math.round(premiumRate * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <AdminBrandingForm initial={brandingSettings} />
          <AdminPricingForm initial={pricingSettings} />

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('users.title')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('users.subtitle')}</p>
            </div>
            <AdminUsersExplorer />
          </section>
        </div>
      </main>
    </div>
  );
}
