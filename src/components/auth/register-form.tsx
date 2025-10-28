'use client';

import { useState } from 'react';
import { useLocale } from '@/providers/locale-provider';
import { validatePassword, getPasswordStrength } from '@/lib/password-validation';
import { createClient } from '@/lib/supabase/client';

export function RegisterForm() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordValidation = validatePassword(password);
  const passwordStrength = password.length > 0 ? getPasswordStrength(password) : null;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    if (!email || !email.includes('@')) {
      setError('Podaj poprawny adres email');
      return;
    }

    // Validate password
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user) {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas rejestracji');
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
          <h2 className="text-2xl font-bold text-foreground">Sprawdź swoją skrzynkę!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Wysłaliśmy email na adres <strong>{email}</strong>
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Kliknij link w wiadomości, aby potwierdzić swoje konto i rozpocząć korzystanie z SizeHub.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Utwórz konto</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dołącz do SizeHub i zacznij zarządzać swoimi rozmiarami
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Display Name */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Imię (opcjonalne)
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            placeholder="Jan Kowalski"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Email *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            placeholder="jan@example.com"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Hasło *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
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

          {/* Password strength indicator */}
          {passwordStrength && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full ${
                      level <= (passwordStrength.score / 2)
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
                Siła hasła:{' '}
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
                  {passwordStrength.strength === 'weak'
                    ? 'Słabe'
                    : passwordStrength.strength === 'medium'
                    ? 'Średnie'
                    : passwordStrength.strength === 'strong'
                    ? 'Silne'
                    : 'Bardzo silne'}
                </span>
              </p>
            </div>
          )}

          {/* Password validation errors */}
          {password.length > 0 && !passwordValidation.isValid && (
            <div className="space-y-1">
              {passwordValidation.errors.map((err, idx) => (
                <p key={idx} className="text-xs text-destructive">
                  • {err}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Potwierdź hasło *
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full rounded-xl border px-4 py-3 pr-12 text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:ring-4 ${
                confirmPassword.length > 0
                  ? passwordsMatch
                    ? 'border-green-500 bg-green-500/5 focus:border-green-500 focus:ring-green-500/10'
                    : 'border-destructive bg-destructive/5 focus:border-destructive focus:ring-destructive/10'
                  : 'border-input bg-background focus:border-primary focus:ring-primary/10'
              }`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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

          {confirmPassword.length > 0 && (
            <p className={`text-xs ${passwordsMatch ? 'text-green-500' : 'text-destructive'}`}>
              {passwordsMatch ? '✓ Hasła są identyczne' : '✗ Hasła nie są identyczne'}
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !passwordValidation.isValid || !passwordsMatch}
          className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          {loading ? 'Tworzenie konta...' : 'Utwórz konto'}
        </button>
      </form>
    </div>
  );
}
