'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import type { BrandingSettings } from '@/lib/types';
import { useLocale } from '@/providers/locale-provider';
import { useTheme } from 'next-themes';

type ModalMode = 'none' | 'login' | 'register';

const featureConfigs = [
  { id: 'friction', tone: 'rose' as const },
  { id: 'catalog', tone: 'rose' as const },
  { id: 'secret', tone: 'sky' as const },
  { id: 'share', tone: 'sky' as const },
] as const;

const toneStyles: Record<'rose' | 'sky', string> = {
  rose: 'bg-rose-100/80 text-rose-500 dark:bg-rose-500/10 dark:text-rose-200',
  sky: 'bg-sky-100/70 text-sky-500 dark:bg-sky-500/10 dark:text-sky-200',
};

type LandingPageProps = {
  branding: BrandingSettings;
};

export function LandingPage({ branding }: LandingPageProps) {
  const [modalMode, setModalMode] = useState<ModalMode>('none');
  const { t } = useLocale();
  const { resolvedTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (modalMode !== 'none') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalMode]);

  const heroParagraphs = t('landing.hero.body').split('\n\n');

  const isDark = mounted ? (theme === 'system' ? resolvedTheme === 'dark' : theme === 'dark') : false;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-surface-elevated via-background to-background dark:from-[#08142a] dark:via-[#071225] dark:to-[#071225]" />
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur dark:bg-background/60">
        <div className="mx-auto flex h-[100px] max-w-6xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-primary/15 text-primary">
              {branding.logo_url ? (
                <Image
                  src={branding.logo_url}
                  alt={`${branding.site_name} logo`}
                  fill
                  className="object-contain"
                  sizes="40px"
                  priority
                />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16l-1 11H9l-1 3-2-3H5L4 7z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-lg font-semibold leading-tight text-foreground">{branding.site_name}</p>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                {branding.site_claim}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setModalMode('login')}
              className="rounded-full bg-[#48A9A6] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3c8f8c]"
            >
              {t('landing.header.login')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-20 px-4 pb-24 pt-16 lg:px-6">
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
                onClick={() => setModalMode('register')}
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
            const isEven = index % 2 === 0;
            const title = t(`landing.features.${feature.id}.title`);
            const description = t(`landing.features.${feature.id}.body`);
            return (
              <section
                key={feature.id}
                className={`flex flex-col items-center gap-10 lg:gap-16 ${
                  isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
                }`}
              >
                <div
                  className={`mx-auto flex h-64 w-full max-w-[320px] items-center justify-center rounded-3xl ${toneStyles[feature.tone]} lg:h-72`}
                >
                  {feature.tone === 'sky' ? (
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
              onClick={() => setModalMode('register')}
              className="rounded-full bg-[#48A9A6] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-[#3c8f8c]"
            >
              {t('landing.cta.button')}
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-background/80 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground lg:flex-row lg:px-6">
          <div className="flex gap-6">
            <a className="transition hover:text-foreground" href="#privacy">
              Privacy Policy
            </a>
            <a className="transition hover:text-foreground" href="#terms">
              Terms of Service
            </a>
            <a className="transition hover:text-foreground" href="#contact">
              Contact Us
            </a>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} GiftFit. All rights reserved.</p>
        </div>
      </footer>

      {modalMode !== 'none' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-12 backdrop-blur">
          <div className="absolute inset-0" onClick={() => setModalMode('none')} aria-hidden="true" />
          <div className="relative z-50 w-full max-w-lg">
            <button
              type="button"
              onClick={() => setModalMode('none')}
              className="absolute right-4 top-4 z-10 rounded-full border border-border/60 bg-background/90 p-2 text-muted-foreground shadow-sm transition hover:text-foreground"
              aria-label={t('common.close')}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            {modalMode === 'login' ? <LoginForm /> : <RegisterForm />}
          </div>
        </div>
      )}
    </div>
  );
}
