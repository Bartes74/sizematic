'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MissionState, MissionRewards, MissionRules } from '@/components/missions/types';

function formatStatus(status: MissionState['status']): { label: string; badgeClass: string; description: string } {
  switch (status) {
    case 'claimable':
      return {
        label: 'Gotowe do odbioru',
        badgeClass: 'bg-[#48A9A6]/10 text-[#48A9A6]',
        description: 'Zrealizowałeś wymagania. Odbierz nagrodę, zanim rozpoczniesz kolejne zadania.',
      };
    case 'in_progress':
      return {
        label: 'Misja w trakcie',
        badgeClass: 'bg-primary/10 text-primary',
        description: 'Kontynuuj działania, aby wypełnić pasek postępu i odebrać nagrodę.',
      };
    case 'available':
      return {
        label: 'Misja dostępna',
        badgeClass: 'bg-muted text-foreground',
        description: 'Misja jest gotowa do rozpoczęcia. Wskazówki znajdziesz w sekcji szczegółów.',
      };
    case 'completed':
      return {
        label: 'Ukończona',
        badgeClass: 'bg-muted text-muted-foreground',
        description: 'Gratulacje! Możesz wrócić do niej, gdy będzie dostępna ponownie.',
      };
    case 'cooldown':
      return {
        label: 'W cooldownie',
        badgeClass: 'bg-muted text-muted-foreground',
        description: 'Misja powróci po zakończeniu okresu odnowienia.',
      };
    case 'locked':
      return {
        label: 'Zablokowana',
        badgeClass: 'bg-muted text-muted-foreground',
        description: 'Misja będzie dostępna po spełnieniu wcześniejszych warunków.',
      };
    case 'hidden':
      return {
        label: 'Ukryta',
        badgeClass: 'bg-muted text-muted-foreground',
        description: 'Misja stanie się widoczna, gdy spełnisz odpowiednie kryteria.',
      };
    default:
      return {
        label: status,
        badgeClass: 'bg-muted text-muted-foreground',
        description: '',
      };
  }
}

function formatRewards(rewards: MissionRewards): Array<{ label: string; value: string }> {
  const entries: Array<{ label: string; value: string }> = [];
  if (typeof rewards.xp === 'number' && rewards.xp > 0) {
    entries.push({ label: 'XP', value: `+${rewards.xp}` });
  }
  if (rewards.badges?.length) {
    entries.push({ label: 'Odznaki', value: rewards.badges.join(', ') });
  }
  if (rewards.unlocks?.length) {
    entries.push({ label: 'Odblokowania', value: rewards.unlocks.join(', ') });
  }
  if (typeof rewards.premiumDays === 'number' && rewards.premiumDays > 0) {
    entries.push({ label: 'Premium', value: `${rewards.premiumDays} dni` });
  }
  if (typeof rewards.freezeTokens === 'number' && rewards.freezeTokens > 0) {
    entries.push({ label: 'Freeze', value: `+${rewards.freezeTokens}` });
  }
  if (rewards.boosters?.length) {
    entries.push({
      label: 'Boosty',
      value: rewards.boosters.map((booster) => `${booster.type}: ${booster.value}`).join(', '),
    });
  }
  if (rewards.extras?.length) {
    entries.push({ label: 'Dodatki', value: rewards.extras.join(', ') });
  }
  if (entries.length === 0) {
    entries.push({ label: 'Nagroda', value: 'Brak zdefiniowanych bonusów' });
  }
  return entries;
}

function RulesList({ rules }: { rules: MissionRules }) {
  const items = [
    rules.criterion ? { title: 'Cel misji', content: rules.criterion } : null,
    rules.progress ? { title: 'Jak liczymy postęp', content: rules.progress } : null,
    rules.timeframe ? { title: 'Okno czasowe', content: rules.timeframe } : null,
  ].filter(Boolean) as Array<{ title: string; content: string }>;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.title} className="rounded-2xl border border-border/60 bg-background/80 p-4">
          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{item.content}</p>
        </div>
      ))}

      {rules.validation?.length ? (
        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
          <h3 className="text-sm font-semibold text-foreground">Co sprawdzamy</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {rules.validation.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {rules.antiCheat?.length ? (
        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
          <h3 className="text-sm font-semibold text-foreground">Zabezpieczenia</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {rules.antiCheat.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {rules.notes?.length ? (
        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
          <h3 className="text-sm font-semibold text-foreground">Warto zapamiętać</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {rules.notes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ProgressPanel({ mission, locale }: { mission: MissionState; locale: 'pl' | 'en' }) {
  const progress = mission.userState?.progress ?? null;
  const streak = progress && typeof progress === 'object' && 'streak' in progress ? (progress as { streak: number }).streak : mission.userState?.streakCounter ?? null;
  const completedDays = progress && typeof progress === 'object' && 'completedDays' in progress ? (progress as { completedDays: string[] }).completedDays : [];

  if (mission.status === 'available' || mission.status === 'locked' || mission.status === 'hidden') {
    return (
      <div className="rounded-3xl border border-border/60 bg-[var(--surface-muted)] px-6 py-5 text-sm text-muted-foreground">
        Rozpocznij misję, a tutaj pojawi się pasek postępu.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/60 bg-[var(--surface-muted)] px-6 py-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Postęp</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {mission.status === 'claimable' ? '100%' : streak ? `${Math.min(streak, 7)}/7` : '--'}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-border/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#48A9A6] to-[#0686ef] transition-all"
            style={{ width: `${Math.min(100, streak ? (streak / 7) * 100 : mission.status === 'claimable' ? 100 : 0)}%` }}
          />
        </div>
        {streak ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Seria dni: {Math.min(streak, 7)} / 7
          </p>
        ) : null}
      </div>

      {completedDays && completedDays.length ? (
        <div className="rounded-3xl border border-border/60 bg-background/70 px-6 py-5">
          <h3 className="text-sm font-semibold text-foreground">Zaliczone dni</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {completedDays.map((day) => (
              <span key={day} className="rounded-full border border-border/60 bg-background px-3 py-1">
                {new Date(`${day}T00:00:00Z`).toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-US', {
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type MissionDetailProps = {
  mission: MissionState;
  locale: 'pl' | 'en';
};

export default function MissionDetail({ mission, locale }: MissionDetailProps) {
  const router = useRouter();
  const [isClaiming, setIsClaiming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusMeta = useMemo(() => formatStatus(mission.status), [mission.status]);
  const rewards = useMemo(() => formatRewards(mission.rewards), [mission.rewards]);

  const handleClaim = async () => {
    setMessage(null);
    setError(null);
    setIsClaiming(true);
    try {
      const response = await fetch(`/api/v1/missions/${mission.code}/claim`, { method: 'POST' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Nie udało się odebrać nagrody.');
      }
      setMessage('Nagroda odebrana! XP i bonusy zostały dodane do Twojego profilu.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas odbierania nagrody.');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleStart = async () => {
    setMessage(null);
    setError(null);
    setIsStarting(true);
    try {
      const response = await fetch(`/api/v1/missions/${mission.code}/start`, { method: 'POST' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Nie udało się rozpocząć misji.');
      }
      setMessage('Misja rozpoczęta! Postęp będzie naliczany na bieżąco.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas rozpoczynania misji.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <div className="space-y-4">
        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-medium uppercase tracking-widest ${statusMeta.badgeClass}`}>
          {statusMeta.label}
        </div>
        <h1 className="text-3xl font-semibold text-foreground">
          {mission.translation?.title ?? mission.code.replace(/_/g, ' ')}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {mission.translation?.summary ?? 'Szczegóły misji wkrótce.'}
        </p>
        {mission.metadata.repeatability ? (
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {mission.metadata.repeatability}
          </p>
        ) : null}
      </div>

      {message ? (
        <div className="rounded-2xl border border-[#48A9A6]/40 bg-[#48A9A6]/10 p-4 text-sm text-[#0f1a23]">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-border/60 bg-[var(--surface-muted)] p-6 shadow-[0_20px_45px_-30px_rgba(6,134,239,0.35)]">
            <h2 className="text-base font-semibold text-foreground">Nagrody</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {rewards.map((reward) => (
                <div key={reward.label} className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm">
                  <p className="font-medium text-foreground">{reward.label}</p>
                  <p className="text-muted-foreground">{reward.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Jak zdobyć misję</h2>
            <RulesList rules={mission.rules} />
          </div>

          {mission.metadata.requirementsSummary ? (
            <div className="rounded-3xl border border-border/60 bg-background px-6 py-5 text-sm">
              <h3 className="text-sm font-semibold text-foreground">W skrócie</h3>
              <p className="mt-2 text-muted-foreground">
                {mission.metadata.requirementsSummary}
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border/60 bg-[var(--surface-muted)] p-6">
            <h2 className="text-base font-semibold text-foreground">Postęp</h2>
            <p className="mt-1 text-sm text-muted-foreground">{statusMeta.description}</p>
            <div className="mt-4">
              <ProgressPanel mission={mission} locale={locale} />
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-[var(--surface-muted)] p-6 space-y-3">
            <h2 className="text-base font-semibold text-foreground">Następne kroki</h2>
            <p className="text-sm text-muted-foreground">
              Wybierz jeden z przycisków, aby przejść do odpowiedniego miejsca w aplikacji lub odebrać nagrodę.
            </p>
            <div className="flex flex-wrap gap-3">
              {mission.status === 'available' ? (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={isStarting}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isStarting ? 'Rozpoczynanie...' : 'Rozpocznij misję'}
                </button>
              ) : null}

              {mission.status === 'in_progress' ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
                >
                  Kontynuuj na dashboardzie
                </Link>
              ) : null}

              {mission.status === 'claimable' ? (
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={isClaiming}
                  className="inline-flex items-center gap-2 rounded-full bg-[#48A9A6] px-4 py-2 text-sm font-semibold text-white shadow shadow-[#48A9A6]/30 transition hover:bg-[#3c8f8c] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isClaiming ? 'Odbieranie...' : 'Odbierz nagrodę'}
                </button>
              ) : null}

              <Link
                href="/dashboard/sizes/manage"
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/50 hover:text-primary"
              >
                Uzupełnij rozmiary
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
