'use client';

import { useState } from 'react';
import { useLocale } from '@/providers/locale-provider';
import { validatePassword, getPasswordStrength } from '@/lib/password-validation';
import { createClient } from '@/lib/supabase/client';

const PASSWORD_ERROR_KEY_BY_MESSAGE: Record<string, string> = {
  'Hasło musi mieć minimum 8 znaków': 'auth.errors.password.minLength',
  'Hasło musi zawierać wielką literę': 'auth.errors.password.uppercase',
  'Hasło musi zawierać cyfrę': 'auth.errors.password.digit',
  'Hasło musi zawierać znak specjalny (@$!%*?&#_-+=)': 'auth.errors.password.special',
};

export function RegisterForm() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordValidation = validatePassword(password);
  const passwordStrength = password.length > 0 ? getPasswordStrength(password) : null;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const errorMessage = errorKey ? t(errorKey) : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorKey(null);

    if (!email || !email.includes('@')) {
      setErrorKey('auth.errors.invalidEmail');
      return;
    }

    if (!passwordValidation.isValid) {
      const firstError = passwordValidation.errors[0];
      setErrorKey(PASSWORD_ERROR_KEY_BY_MESSAGE[firstError] ?? 'auth.errors.generic');
      return;
    }

    if (password !== confirmPassword) {
      setErrorKey('auth.errors.passwordMismatch');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
            first_name: displayName || null,
            has_completed_onboarding: false,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        const normalized = error.message?.toLowerCase() ?? '';
        if (normalized.includes('already registered')) {
          setErrorKey('auth.errors.register.emailTaken');
        } else if (normalized.includes('invalid email')) {
          setErrorKey('auth.errors.invalidEmail');
        } else {
          setErrorKey('auth.errors.register.generic');
        }
        return;
      }

      if (data.user) {
        setSuccess(true);
      }
    } catch (error) {
      console.error(error);
      setErrorKey('auth.errors.register.generic');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground">{t('auth.register.successTitle')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('auth.register.successBody', { email })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('auth.register.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('auth.register.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('auth.register.displayNameLabel')}
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="name"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            placeholder={t('auth.register.displayNamePlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('auth.register.emailLabel')}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            placeholder={t('auth.register.emailPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('auth.register.passwordLabel')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              placeholder={t('auth.login.passwordPlaceholder')}
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

          {passwordStrength && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full ${
                      level <= passwordStrength.score / 2
                        ? passwordStrength.strength === 'weak'
                          ? 'bg-destructive'
                          : passwordStrength.strength === 'medium'
                          ? 'bg-accent'
                          : passwordStrength.strength === 'strong'
                          ? 'bg-primary'
                          : 'bg-green-500'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t('auth.password.strengthLabel')}{' '}
                <span
                  className={
                    passwordStrength.strength === 'weak'
                      ? 'text-destructive'
                      : passwordStrength.strength === 'medium'
                      ? 'text-accent'
                      : passwordStrength.strength === 'strong'
                      ? 'text-primary'
                      : 'text-green-500'
                  }
                >
                  {t(`auth.password.strength.${passwordStrength.strength}`)}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('auth.register.confirmPasswordLabel')}
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              className={`w-full rounded-xl border px-4 py-3 pr-12 text-sm font-medium transition-all focus:outline-none focus:ring-4 focus:ring-primary/10 ${
                passwordsMatch || confirmPassword.length === 0
                  ? 'border-input bg-background text-foreground'
                  : 'border-destructive bg-destructive/10 text-destructive'
              }`}
              placeholder={t('auth.login.passwordPlaceholder')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {showConfirmPassword ? (
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
          {!passwordsMatch && confirmPassword.length > 0 && (
            <p className="text-xs text-destructive">{t('auth.errors.passwordMismatch')}</p>
          )}
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
          {loading ? t('auth.register.submitting') : t('auth.register.submit')}
        </button>
      </form>
    </div>
  );
}
