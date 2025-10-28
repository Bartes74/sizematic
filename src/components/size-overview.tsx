'use client';

import Link from 'next/link';
import { useLocale } from "@/providers/locale-provider";
import type { Category } from "@/lib/types";

type SizeData = {
  category: Category;
  value: string;
  isOutdated?: boolean;
  garmentTypeName?: string;
};

type SizeOverviewProps = {
  sizes: SizeData[];
  plan?: 'free' | 'premium' | 'premium_plus';
};

export function SizeOverview({ sizes, plan = 'free' }: SizeOverviewProps) {
  const { t } = useLocale();

  const categories: Category[] = ['tops', 'bottoms', 'footwear', 'headwear', 'accessories', 'outerwear', 'kids'];

  return (
    <section className="animate-fade-in-up space-y-6 stagger-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {t('sizeOverview.title')}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t('sizeOverview.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {sizes.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
            <p className="text-sm text-muted-foreground">{t('sizeOverview.noData')}</p>
          </div>
        ) : (
          categories.map((category) => {
            const sizeData = sizes.find((s) => s.category === category);

            if (!sizeData) {
              return (
                <Link
                  key={category}
                  href={`/dashboard/garments/add/${category}`}
                  className="group relative overflow-hidden rounded-2xl border border-dashed border-border bg-muted/10 p-6 transition-all hover:bg-muted/20 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t(`sizeOverview.categories.${category}`)}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">—</p>
                    </div>
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={category}
                href={`/dashboard/garments/add/${category}`}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-lg shadow-black/5 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/10 cursor-pointer block"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t(`sizeOverview.categories.${category}`)}
                    </p>
                    {sizeData.isOutdated && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-medium text-accent">
                        {t('sizeOverview.outdatedBadge')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold leading-tight text-primary break-words">{sizeData.value}</p>
                  {sizeData.garmentTypeName && (
                    <p className="text-[10px] text-muted-foreground">{sizeData.garmentTypeName}</p>
                  )}
                </div>
              </Link>
            );
          })
        )}

        {/* Premium-locked cards */}
        {plan === 'free' && (
          <>
            <div className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 opacity-60">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="h-8 w-8 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="relative z-10 opacity-50">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('sizeOverview.addPartner')}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{t('sizeOverview.premiumOnly')}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Manage favorites link */}
      {sizes.length > 0 && (
        <div className="text-center">
          <Link
            href="/dashboard/sizes/manage"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Zarządzaj rozmiarami
          </Link>
        </div>
      )}
    </section>
  );
}
