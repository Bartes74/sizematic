'use client';

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { PricingSettings } from '@/lib/types';
import { PRICING_DEFAULTS } from '@/lib/pricing-defaults';

type AdminPricingFormProps = {
  initial: PricingSettings;
};

const CURRENCY_REGEX = /^[A-Z]{3}$/;

export function AdminPricingForm({ initial }: AdminPricingFormProps) {
  const router = useRouter();
  const t = useTranslations('dashboard.admin.pricing');
  const [currency, setCurrency] = useState(initial.currency || PRICING_DEFAULTS.currency);
  const [premiumMonthly, setPremiumMonthly] = useState(initial.premium_monthly.toString());
  const [premiumYearly, setPremiumYearly] = useState(initial.premium_yearly.toString());
  const [sgPack3, setSgPack3] = useState(initial.sg_pack_3.toString());
  const [sgPack10, setSgPack10] = useState(initial.sg_pack_10.toString());

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetFeedback = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const parseAmount = useCallback(
    (value: string, fallback: number) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return fallback;
      }

      const numeric = Number.parseFloat(trimmed.replace(',', '.'));
      if (Number.isNaN(numeric) || numeric < 0) {
        throw new Error(t('errors.invalidNumber'));
      }
      return Number(numeric.toFixed(2));
    },
    [t],
  );

  const previewFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency.trim().toUpperCase() || PRICING_DEFAULTS.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } catch {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: PRICING_DEFAULTS.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
  }, [currency]);

  const computePreview = useCallback(
    (value: string, fallback: number) => {
      try {
        return previewFormatter.format(parseAmount(value, fallback));
      } catch {
        return previewFormatter.format(fallback);
      }
    },
    [parseAmount, previewFormatter],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      resetFeedback();

      const normalizedCurrency = currency.trim().toUpperCase() || PRICING_DEFAULTS.currency;

      if (!CURRENCY_REGEX.test(normalizedCurrency)) {
        setError(t('errors.invalidCurrency'));
        return;
      }

      let nextPremiumMonthly: number;
      let nextPremiumYearly: number;
      let nextSgPack3: number;
      let nextSgPack10: number;

      try {
        nextPremiumMonthly = parseAmount(premiumMonthly, initial.premium_monthly);
        nextPremiumYearly = parseAmount(premiumYearly, initial.premium_yearly);
        nextSgPack3 = parseAmount(sgPack3, initial.sg_pack_3);
        nextSgPack10 = parseAmount(sgPack10, initial.sg_pack_10);
      } catch (parseError) {
        const message = parseError instanceof Error ? parseError.message : null;
        setError(message ?? t('errors.invalidNumber'));
        return;
      }

      setIsSaving(true);

      try {
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from('pricing_settings')
          .update({
            currency: normalizedCurrency,
            premium_monthly: nextPremiumMonthly,
            premium_yearly: nextPremiumYearly,
            sg_pack_3: nextSgPack3,
            sg_pack_10: nextSgPack10,
          })
          .eq('id', true);

        if (updateError) {
          throw updateError;
        }

        setSuccess(t('success'));
        setTimeout(() => {
          router.refresh();
        }, 400);
      } catch (updateError) {
        console.error(updateError);
        const message = updateError instanceof Error ? updateError.message : null;
        setError(message ?? t('errors.saveFailed'));
      } finally {
        setIsSaving(false);
      }
    },
    [
      currency,
      initial.premium_monthly,
      initial.premium_yearly,
      initial.sg_pack_3,
      initial.sg_pack_10,
      parseAmount,
      premiumMonthly,
      premiumYearly,
      router,
      sgPack10,
      sgPack3,
      t,
      resetFeedback,
    ],
  );

  const previewValues = useMemo(
    () => ({
      premiumMonthly: computePreview(premiumMonthly, initial.premium_monthly),
      premiumYearly: computePreview(premiumYearly, initial.premium_yearly),
      sgPack3: computePreview(sgPack3, initial.sg_pack_3),
      sgPack10: computePreview(sgPack10, initial.sg_pack_10),
    }),
    [computePreview, initial.premium_monthly, initial.premium_yearly, initial.sg_pack_10, initial.sg_pack_3, premiumMonthly, premiumYearly, sgPack10, sgPack3],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card/80 shadow-lg shadow-black/5 backdrop-blur p-6 sm:p-8"
    >
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-5">
            <div>
              <label htmlFor="currency" className="text-sm font-semibold text-foreground">
                {t('fields.currency.label')}
              </label>
              <input
                id="currency"
                type="text"
                value={currency}
                onChange={(event) => {
                  resetFeedback();
                  setCurrency(event.target.value.toUpperCase());
                }}
                maxLength={3}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm uppercase tracking-[0.3em] text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('fields.currency.hint')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="premiumMonthly" className="text-sm font-semibold text-foreground">
                  {t('fields.premiumMonthly.label')}
                </label>
                <input
                  id="premiumMonthly"
                  type="number"
                  min={0}
                  step="0.01"
                  value={premiumMonthly}
                  onChange={(event) => {
                    resetFeedback();
                    setPremiumMonthly(event.target.value);
                  }}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={PRICING_DEFAULTS.premium_monthly.toString()}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('fields.premiumMonthly.hint', { preview: previewValues.premiumMonthly })}
                </p>
              </div>

              <div>
                <label htmlFor="premiumYearly" className="text-sm font-semibold text-foreground">
                  {t('fields.premiumYearly.label')}
                </label>
                <input
                  id="premiumYearly"
                  type="number"
                  min={0}
                  step="0.01"
                  value={premiumYearly}
                  onChange={(event) => {
                    resetFeedback();
                    setPremiumYearly(event.target.value);
                  }}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={PRICING_DEFAULTS.premium_yearly.toString()}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('fields.premiumYearly.hint', { preview: previewValues.premiumYearly })}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t('sections.secretGiver')}
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sgPack3" className="text-sm font-semibold text-foreground">
                  {t('fields.sgPack3.label')}
                </label>
                <input
                  id="sgPack3"
                  type="number"
                  min={0}
                  step="0.01"
                  value={sgPack3}
                  onChange={(event) => {
                    resetFeedback();
                    setSgPack3(event.target.value);
                  }}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={PRICING_DEFAULTS.sg_pack_3.toString()}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('fields.sgPack3.hint', { preview: previewValues.sgPack3 })}
                </p>
              </div>

              <div>
                <label htmlFor="sgPack10" className="text-sm font-semibold text-foreground">
                  {t('fields.sgPack10.label')}
                </label>
                <input
                  id="sgPack10"
                  type="number"
                  min={0}
                  step="0.01"
                  value={sgPack10}
                  onChange={(event) => {
                    resetFeedback();
                    setSgPack10(event.target.value);
                  }}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={PRICING_DEFAULTS.sg_pack_10.toString()}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('fields.sgPack10.hint', { preview: previewValues.sgPack10 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 dark:text-emerald-200">
            {success}
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? t('submit.saving') : t('submit.save')}
          </button>
        </div>
      </div>
    </form>
  );
}

