'use client';

import { useMemo, useState } from 'react';
import { useLocale as useIntlLocale, useTranslations } from 'next-intl';
import { usePricingSettings } from '@/hooks/use-pricing-settings';
import { PRICING_DEFAULTS } from '@/lib/pricing-defaults';

type UpsellReason = 'wishlist' | 'max_circles' | 'max_members' | 'no_sg_pool' | 'general';

type UpsellModalProps = {
  isOpen: boolean;
  reason: UpsellReason;
  onClose: () => void;
};

type LoadingState = 'premium_monthly' | 'premium_yearly' | 'sg_pack' | null;

const PLAN_KEYS = {
  premium_monthly: 'premium_monthly',
  premium_yearly: 'premium_yearly',
} as const;

export function UpsellModal({ isOpen, reason, onClose }: UpsellModalProps) {
  const t = useTranslations('upsell');
  const locale = useIntlLocale();
  const [loading, setLoading] = useState<LoadingState>(null);
  const showSgPack = reason === 'no_sg_pool';
  const { data: pricing } = usePricingSettings();
  const activeCurrency = pricing.currency || PRICING_DEFAULTS.currency;

  const priceFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(locale ?? 'en-US', {
        style: 'currency',
        currency: activeCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } catch {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: PRICING_DEFAULTS.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
  }, [activeCurrency, locale]);

  const monthlyPriceLabel = t('plans.monthly.price', {
    amount: priceFormatter.format(pricing.premium_monthly ?? PRICING_DEFAULTS.premium_monthly),
  });
  const yearlyPriceLabel = t('plans.yearly.price', {
    amount: priceFormatter.format(pricing.premium_yearly ?? PRICING_DEFAULTS.premium_yearly),
  });
  const sgPackPriceLabel = t('sgPack.price', {
    amount: priceFormatter.format(pricing.sg_pack_10 ?? PRICING_DEFAULTS.sg_pack_10),
  });

  if (!isOpen) {
    return null;
  }

  const handlePlanCheckout = async (planKey: keyof typeof PLAN_KEYS) => {
    setLoading(planKey);
    try {
      const res = await fetch('/api/v1/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_key: planKey }),
      });

      const data = await res.json();
      if (res.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      alert(data.error || t('errors.checkoutFailed'));
    } catch (error) {
      console.error('Subscription checkout failed:', error);
      alert(t('errors.checkoutError'));
    } finally {
      setLoading(null);
    }
  };

  const handleSgPackCheckout = async () => {
    setLoading('sg_pack');
    try {
      const res = await fetch('/api/v1/secret-giver/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_key: 'sg_10_pack' }),
      });

      const data = await res.json();
      if (res.ok && data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      alert(data.error || t('errors.checkoutFailed'));
    } catch (error) {
      console.error('Secret Giver pack checkout failed:', error);
      alert(t('errors.checkoutError'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-border/40 bg-card/95 p-8 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              {t(`reasons.${reason}.kicker`, { defaultMessage: t('reasons.general.kicker') })}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-foreground">
              {t(`reasons.${reason}.title`, { defaultMessage: t('reasons.general.title') })}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {t(`reasons.${reason}.body`, { defaultMessage: t('reasons.general.body') })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-border/60 p-2 text-muted-foreground transition hover:bg-surface-muted/60 hover:text-foreground"
            aria-label={t('close')}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={() => handlePlanCheckout(PLAN_KEYS.premium_monthly)}
            disabled={loading !== null}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-surface-interactive/50 p-6 text-left transition hover:border-primary/40 hover:shadow-lg disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {t('plans.monthly.badge')}
            </span>
            <h3 className="mt-3 text-xl font-semibold text-foreground">{t('plans.monthly.title')}</h3>
            <p className="mt-2 text-2xl font-bold text-primary">{monthlyPriceLabel}</p>
            <p className="mt-4 text-sm text-muted-foreground">{t('plans.monthly.body')}</p>
            {loading === 'premium_monthly' && <LoadingOverlay label={t('processing')} />}
          </button>

          <button
            onClick={() => handlePlanCheckout(PLAN_KEYS.premium_yearly)}
            disabled={loading !== null}
            className="group relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 text-left transition hover:border-primary/60 hover:shadow-lg disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {t('plans.yearly.badge')}
            </span>
            <h3 className="mt-3 text-xl font-semibold text-foreground">{t('plans.yearly.title')}</h3>
            <p className="mt-2 text-2xl font-bold text-primary">{yearlyPriceLabel}</p>
            <p className="mt-4 text-sm text-muted-foreground">{t('plans.yearly.body')}</p>
            {loading === 'premium_yearly' && <LoadingOverlay label={t('processing')} />}
          </button>
        </div>

        {showSgPack ? (
          <button
            onClick={handleSgPackCheckout}
            disabled={loading !== null}
            className="mt-4 w-full rounded-2xl border border-border/60 bg-surface-muted/60 px-6 py-4 text-left transition hover:border-primary/40 hover:shadow disabled:opacity-60"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{t('sgPack.title')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('sgPack.body')}</p>
              </div>
              <p className="text-xl font-bold text-primary">{sgPackPriceLabel}</p>
            </div>
            {loading === 'sg_pack' && <LoadingOverlay label={t('processing')} />}
          </button>
        ) : null}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t('legal')}
        </p>
      </div>
    </div>
  );
}

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

export type { UpsellReason };
