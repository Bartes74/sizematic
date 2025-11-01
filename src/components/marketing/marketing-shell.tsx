'use client';

import { useEffect, useMemo, useState, createContext, useContext, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import type { BrandingSettings } from '@/lib/types';
import { useLocale } from '@/providers/locale-provider';

type ModalMode = 'none' | 'login' | 'register' | 'contact';

type MarketingShellContextValue = {
  openModal: (mode: Exclude<ModalMode, 'none'>) => void;
  closeModal: () => void;
  isDark: boolean;
};

const MarketingShellContext = createContext<MarketingShellContextValue | null>(null);

export function useMarketingShell() {
  const context = useContext(MarketingShellContext);
  if (!context) {
    throw new Error('useMarketingShell must be used within a MarketingShell');
  }
  return context;
}

type MarketingShellProps = {
  branding: BrandingSettings;
  children: React.ReactNode;
};

export function MarketingShell({ branding, children }: MarketingShellProps) {
  const { t } = useLocale();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('none');

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

  const isDark = useMemo(() => {
    if (!mounted) {
      return false;
    }
    if (theme === 'system') {
      return resolvedTheme === 'dark';
    }
    return theme === 'dark';
  }, [mounted, resolvedTheme, theme]);

  const openModal = useCallback((mode: Exclude<ModalMode, 'none'>) => {
    setModalMode(mode);
  }, []);

  const closeModal = useCallback(() => {
    setModalMode('none');
  }, []);

  const value = useMemo<MarketingShellContextValue>(
    () => ({
      openModal,
      closeModal,
      isDark,
    }),
    [closeModal, isDark, openModal]
  );

  return (
    <MarketingShellContext.Provider value={value}>
      <div className="relative min-h-screen bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-surface-elevated via-background to-background dark:from-[#08142a] dark:via-[#071225] dark:to-[#071225]" />

        <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur dark:bg-background/60">
          <div className="mx-auto flex h-[100px] max-w-6xl items-center justify-between px-4 lg:px-6">
            <Link href="/" className="flex items-center gap-3" aria-label={branding.site_name}>
              {branding.logo_url ? (
                <Image
                  src={branding.logo_url}
                  alt={`${branding.site_name} logo`}
                  width={56}
                  height={56}
                  className="h-10 w-auto object-contain sm:h-14"
                  priority={false}
                />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16l-1 11H9l-1 3-2-3H5L4 7z" />
                </svg>
              )}
              <div className="hidden sm:block">
                <p className="text-lg font-semibold leading-tight text-foreground">{branding.site_name}</p>
                <p className="text-xs font-semibold uppercase text-muted-foreground/70">
                  {branding.site_claim}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              <button
                type="button"
                onClick={() => openModal('login')}
                className="rounded-full bg-[#48A9A6] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3c8f8c]"
              >
                {t('landing.header.login')}
              </button>
            </div>
          </div>
        </header>

        <div className="pb-24 pt-16">{children}</div>

        <footer className="border-t border-border/60 bg-background/80 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground lg:flex-row lg:px-6">
            <div className="flex gap-6 text-sm font-medium">
              <Link className="transition hover:text-foreground" href="/privacy">
                {t('landing.footer.privacy')}
              </Link>
              <Link className="transition hover:text-foreground" href="/terms">
                {t('landing.footer.terms')}
              </Link>
              <button
                type="button"
                onClick={() => openModal('contact')}
                className="transition hover:text-foreground"
              >
                {t('landing.footer.contact')}
              </button>
            </div>
            <p className="text-xs text-muted-foreground/80">© {new Date().getFullYear()} GiftFit. All rights reserved.</p>
          </div>
        </footer>

        {modalMode !== 'none' && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-12 backdrop-blur">
            <button
              type="button"
              className="absolute inset-0"
              aria-label={t('common.close')}
              onClick={closeModal}
            />
            <div className="relative z-50 w-full max-w-lg">
              <button
                type="button"
                onClick={closeModal}
                className="absolute right-4 top-4 z-10 rounded-full border border-border/60 bg-background/90 p-2 text-muted-foreground shadow-sm transition hover:text-foreground"
                aria-label={t('common.close')}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              {modalMode === 'login' ? (
                <LoginForm />
              ) : modalMode === 'register' ? (
                <RegisterForm />
              ) : (
                <ContactForm onClose={closeModal} />
              )}
            </div>
          </div>
        )}
      </div>
    </MarketingShellContext.Provider>
  );
}

function ContactForm({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setError(null);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, message }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Unknown error');
      }

      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-border/50 bg-background/95 p-6 shadow-xl backdrop-blur"
    >
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground">{t('landing.contact.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('landing.contact.subtitle')}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="contact-name">
          {t('landing.contact.nameLabel')}
        </label>
        <input
          id="contact-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="contact-email">
          {t('landing.contact.emailLabel')}
        </label>
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="contact-message">
          {t('landing.contact.messageLabel')}
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          rows={4}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      {status === 'error' && error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {t('landing.contact.error')} ({error})
        </div>
      ) : null}

      {status === 'success' ? (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
          {t('landing.contact.success')}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-full bg-[#48A9A6] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-[#3c8f8c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'loading' ? t('landing.contact.sending') : t('landing.contact.send')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-border/60 px-6 py-3 text-sm font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-primary"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

