'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';

export default function TrustedCircleAcceptPage() {
  return (
    <Suspense fallback={<AcceptInvitationFallback />}>
      <TrustedCircleAcceptContent />
    </Suspense>
  );
}

type AcceptStatus = 'idle' | 'loading' | 'success' | 'error' | 'auth';

function TrustedCircleAcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<AcceptStatus>('idle');
  const [message, setMessage] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Brakuje tokenu zaproszenia.');
      setDetails('Link w wiadomości jest niepełny lub wygasł.');
      setRequiresAuth(false);
      return;
    }

    let cancelled = false;

    const acceptInvitation = async () => {
      setRequiresAuth(false);
      setStatus('loading');
      setMessage('Akceptuję zaproszenie...');
      setDetails('');
      try {
        const response = await fetch(`/api/v1/trusted-circle/invitations/by-token/${token}`, {
          method: 'POST',
        });
        const payload = await response.json().catch(() => null);

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          if (response.status === 401) {
            setStatus('auth');
            setRequiresAuth(true);
            setMessage('Zaloguj się, aby dołączyć do Kręgu Zaufanych.');
            setDetails('Po udanym logowaniu zaproszenie zostanie zaakceptowane automatycznie.');
            return;
          }

          setStatus('error');
          setMessage(payload?.message ?? payload?.error ?? 'Nie udało się zaakceptować zaproszenia.');
          return;
        }

        setStatus('success');
        setMessage('Zaproszenie zaakceptowane!');
        setDetails('Nowa osoba została dodana do Twojego Kręgu Zaufanych.');
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(err instanceof Error ? err.message : 'Nie udało się zaakceptować zaproszenia.');
        }
      }
    };

    acceptInvitation();

    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  const handleLoginSuccess = useCallback(async () => {
    setAttempt((prev) => prev + 1);
  }, []);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center gap-6 px-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Krąg Zaufanych</h1>
        <p className="text-sm text-muted-foreground">
          {status === 'loading' && 'Łączymy Cię z zapraszającym użytkownikiem...'}
          {status === 'success' && message}
          {status === 'error' && message}
          {status === 'auth' && message}
        </p>
        {details ? <p className="text-xs text-muted-foreground">{details}</p> : null}
      </div>

      {status === 'error' && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Jeśli nie masz jeszcze konta, załóż je, a następnie ponownie otwórz link z wiadomości.
        </div>
      )}

      {requiresAuth ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
            <LoginForm onSuccess={handleLoginSuccess} redirectPath={null} />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Po udanym logowaniu wrócisz na tę stronę i zaproszenie zostanie przyjęte automatycznie.
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
        >
          Przejdź do dashboardu
        </button>
      </div>
    </div>
  );
}

function AcceptInvitationFallback() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center gap-4 px-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Krąg Zaufanych</h1>
        <p className="text-sm text-muted-foreground">Ładuję zaproszenie...</p>
      </div>
    </div>
  );
}
