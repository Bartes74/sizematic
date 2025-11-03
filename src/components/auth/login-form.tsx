'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/providers/locale-provider';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const errorMessage = errorKey ? t(errorKey) : null;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorKey(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message?.includes('Email not confirmed')) {
          setErrorKey('auth.errors.login.emailNotConfirmed');
        } else if (signInError.message?.includes('Invalid login credentials')) {
          setErrorKey('auth.errors.login.invalidCredentials');
        } else {
          setErrorKey('auth.errors.generic');
        }
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error(error);
      setErrorKey('auth.errors.generic');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorKey(null);

    if (!email || !email.includes('@')) {
      setErrorKey('auth.errors.invalidEmail');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      setResetEmailSent(true);
    } catch (error) {
      console.error(error);
      setErrorKey('auth.errors.generic');
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    if (resetEmailSent) {
      return (
        <div className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground">{t('auth.login.forgotSuccessTitle')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('auth.login.forgotSuccessBody').replace('{{email}}', email)}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setResetEmailSent(false);
              }}
              className="mt-6 text-sm font-medium text-primary hover:underline"
            >
              {t('auth.login.forgotSuccessBack')}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('auth.login.forgotTitle')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('auth.login.forgotSubtitle')}</p>
        </div>

        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="space-y-2">
          <label
            htmlFor="login-forgot-email"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t('auth.login.emailLabel')}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            id="login-forgot-email"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            placeholder={t('auth.login.emailPlaceholder')}
          />
        </div>

          {errorMessage && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#48A9A6] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#48A9A6]/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#48A9A6]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#48A9A6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 hover:bg-[#3c8f8c]"
          >
          {loading ? t('auth.login.forgotSubmitting') : t('auth.login.forgotSubmit')}
          </button>

          <button
            type="button"
            onClick={() => setShowForgotPassword(false)}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            {t('auth.login.forgotBack')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('auth.login.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('auth.login.subtitle')}</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="login-email"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t('auth.login.emailLabel')}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            id="login-email"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            placeholder={t('auth.login.emailPlaceholder')}
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="login-password"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t('auth.login.passwordLabel')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              id="login-password"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              placeholder={t('auth.login.passwordPlaceholder')}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setErrorKey(null);
              setShowForgotPassword(true);
            }}
            className="text-xs text-primary hover:underline"
          >
            {t('auth.login.forgotLink')}
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#48A9A6] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#48A9A6]/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#48A9A6]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#48A9A6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 hover:bg-[#3c8f8c]"
        >
          {loading ? t('auth.login.submitting') : t('auth.login.submit')}
        </button>
      </form>

    </div>
  );
}
