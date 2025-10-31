'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TrustedCircleAcceptPage() {
  return (
    <Suspense fallback={<AcceptInvitationFallback />}>
      <TrustedCircleAcceptContent />
    </Suspense>
  );
}

function TrustedCircleAcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [details, setDetails] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Brakuje tokenu zaproszenia.');
      return;
    }

    let cancelled = false;

    const acceptInvitation = async () => {
      setStatus('loading');
      setMessage('Akceptuję zaproszenie...');
      try {
        const response = await fetch(`/api/v1/trusted-circle/invitations/${token}`, {
          method: 'POST',
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          if (!cancelled) {
            setStatus('error');
            setMessage(payload?.message ?? payload?.error ?? 'Nie udało się zaakceptować zaproszenia.');
            if (response.status === 401) {
              setDetails('Zaloguj się na konto powiązane z tym zaproszeniem i spróbuj ponownie.');
            }
          }
          return;
        }
        if (!cancelled) {
          setStatus('success');
          setMessage('Zaproszenie zaakceptowane!');
          setDetails('Nowa osoba została dodana do Twojego Kręgu Zaufanych.');
        }
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
  }, [token]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center gap-6 px-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Krąg Zaufanych</h1>
        <p className="text-sm text-muted-foreground">
          {status === 'loading' && 'Łączymy Cię z zapraszającym użytkownikiem...'}
          {status === 'success' && message}
          {status === 'error' && message}
        </p>
        {details ? <p className="text-xs text-muted-foreground">{details}</p> : null}
      </div>

      {status === 'error' && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Jeśli nie masz jeszcze konta, załóż je, a następnie wróć do linku zaproszenia.
        </div>
      )}

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
