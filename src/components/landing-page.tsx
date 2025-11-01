'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import type { BrandingSettings } from '@/lib/types';
import { MarketingShell, useMarketingShell } from '@/components/marketing/marketing-shell';
import { useLocale } from '@/providers/locale-provider';

const featureConfigs = [
  { id: 'friction', tone: 'rose' as const },
  { id: 'catalog', tone: 'rose' as const },
  { id: 'gifts', tone: 'sky' as const },
  { id: 'secret', tone: 'sky' as const },
  { id: 'share', tone: 'rose' as const },
] as const;

const featureImages: Partial<Record<(typeof featureConfigs)[number]['id'], string>> = {
  friction: '/przestan_zgadywac.jpg',
  catalog: '/katalog.jpg',
  gifts: '/dopasowanie.jpg',
  secret: '/secret_giver.jpg',
  share: '/dziel_sie.jpg',
};

const toneStyles: Record<'rose' | 'sky', string> = {
  rose: 'bg-rose-100/80 text-rose-500 dark:bg-rose-500/10 dark:text-rose-200',
  sky: 'bg-sky-100/70 text-sky-500 dark:bg-sky-500/10 dark:text-sky-200',
};

type LandingPageProps = {
  branding: BrandingSettings;
};

export function LandingPage({ branding }: LandingPageProps) {
  return (
    <MarketingShell branding={branding}>
      <LandingContent />
    </MarketingShell>
  );
}

function LandingContent() {
  const { t } = useLocale();
  const { openModal, isDark } = useMarketingShell();
  const heroParagraphs = useMemo(() => t('landing.hero.body').split('\n\n'), [t]);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-20 px-4 lg:px-6">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-[3.5rem]">
              {t('landing.hero.title')}
            </h1>
            <div className="space-y-4">
              {heroParagraphs.map((paragraph, index) => (
                <p key={index} className="max-w-xl text-base leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => openModal('register')}
              className="rounded-full bg-[#48A9A6] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-[#3c8f8c]"
            >
              {t('landing.hero.cta')}
            </button>
          </div>
        </div>
        <div className="relative flex items-center justify-center">
          <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-border/40 shadow-xl shadow-primary/10 dark:shadow-primary/20 aspect-square">
            <Image
              src="/giftfit.jpg"
              alt={t('landing.hero.cardTitle')}
              fill
              className="object-cover"
              priority
              sizes="(min-width: 1024px) 360px, 80vw"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-10">
        {featureConfigs.map((feature, index) => {
          const title = t(`landing.features.${feature.id}.title`);
          const description = t(`landing.features.${feature.id}.body`);
          const isImageLeft = index % 2 === 0;
          return (
            <section
              key={feature.id}
              className={`flex flex-col items-center gap-10 lg:gap-16 ${
                isImageLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'
              }`}
            >
              <div
                className={`mx-auto flex h-64 w-full max-w-[320px] items-center justify-center rounded-3xl ${toneStyles[feature.tone]} shadow-lg shadow-primary/10 dark:shadow-primary/20 lg:h-72`}
              >
                {featureImages[feature.id] ? (
                  <div className="relative h-full w-full overflow-hidden rounded-3xl">
                    <Image
                      src={featureImages[feature.id]!}
                      alt={t(`landing.features.${feature.id}.title`)}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 320px, 80vw"
                    />
                  </div>
                ) : feature.tone === 'sky' ? (
                  <svg className="h-16 w-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12l5 5L22 4" />
                  </svg>
                ) : (
                  <svg className="h-16 w-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                )}
              </div>
              <div className="max-w-2xl text-center lg:text-left">
                <h3 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h3>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">{description}</p>
              </div>
            </section>
          );
        })}
      </div>

      <section
        className="rounded-3xl border border-primary/30 px-8 py-12 text-center shadow-lg shadow-primary/20 backdrop-blur sm:px-12"
        style={{ backgroundColor: isDark ? '#05111B' : '#E6F0F0' }}
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          {t('landing.cta.kicker')}
        </p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground">{t('landing.cta.heading')}</h2>
        <p className="mt-4 text-base text-muted-foreground">{t('landing.cta.body')}</p>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => openModal('register')}
            className="rounded-full bg-[#48A9A6] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-[#3c8f8c]"
          >
            {t('landing.cta.button')}
          </button>
        </div>
      </section>
    </main>
  );
}
