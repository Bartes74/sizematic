'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMissions } from '@/hooks/use-missions';
import type { MissionState, MissionStatus } from '@/components/missions/types';

type MissionDirectoryProps = {
  locale: 'pl' | 'en';
};

type MissionGroupKey = 'active' | 'discover' | 'completed';

const GROUP_LABELS: Record<MissionGroupKey, { label: string; description: string }> = {
  active: {
    label: 'Aktywne',
    description: 'Misje, które możesz realizować lub odebrać nagrody.',
  },
  discover: {
    label: 'Do odkrycia',
    description: 'Zadania gotowe do rozpoczęcia w najbliższym czasie.',
  },
  completed: {
    label: 'Historia',
    description: 'Ukończone lub w cooldownie – wrócą w swoim czasie.',
  },
};

function groupMissions(missions: MissionState[]): Record<MissionGroupKey, MissionState[]> {
  const grouped: Record<MissionGroupKey, MissionState[]> = {
    active: [],
    discover: [],
    completed: [],
  };

  missions.forEach((mission) => {
    switch (mission.status) {
      case 'claimable':
      case 'in_progress':
        grouped.active.push(mission);
        break;
      case 'available':
        grouped.discover.push(mission);
        break;
      case 'cooldown':
      case 'completed':
        grouped.completed.push(mission);
        break;
      default:
        grouped.discover.push(mission);
        break;
    }
  });

  return grouped;
}

function formatStatus(status: MissionStatus): { label: string; tone: string } {
  switch (status) {
    case 'claimable':
      return { label: 'Gotowe do odbioru', tone: 'text-[#48A9A6]' };
    case 'in_progress':
      return { label: 'W trakcie', tone: 'text-primary' };
    case 'available':
      return { label: 'Dostępne', tone: 'text-muted-foreground' };
    case 'completed':
      return { label: 'Ukończone', tone: 'text-muted-foreground' };
    case 'cooldown':
      return { label: 'Cooldown', tone: 'text-[#94a3b8]' };
    case 'locked':
      return { label: 'Zablokowane', tone: 'text-[#94a3b8]' };
    case 'hidden':
      return { label: 'Ukryte', tone: 'text-[#94a3b8]' };
    default:
      return { label: status, tone: 'text-muted-foreground' };
  }
}

function formatCooldown(nextEligibleAt: string | null | undefined, locale: 'pl' | 'en'): string | null {
  if (!nextEligibleAt) return null;
  const date = new Date(nextEligibleAt);
  const formatter = new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-US', {
    day: '2-digit',
    month: 'long',
  });
  return locale === 'pl'
    ? `Wraca ${formatter.format(date)}`
    : `Back ${formatter.format(date)}`;
}

function formatProgressLabel(mission: MissionState): string | null {
  const progress = mission.userState?.progress ?? null;
  if (progress && typeof progress === 'object' && 'streak' in progress) {
    const streakValue = (progress as Record<string, unknown>).streak;
    if (typeof streakValue === 'number') {
      return `Seria ${streakValue}/7`;
    }
  }
  return null;
}

export default function MissionDirectory({ locale }: MissionDirectoryProps) {
  const router = useRouter();
  const { missions, isLoading, error, refresh } = useMissions();
  const [claiming, setClaiming] = useState<string | null>(null);

  const grouped = groupMissions(missions);

  const handleClaim = async (mission: MissionState) => {
    if (mission.status !== 'claimable') return;
    setClaiming(mission.code);
    try {
      const response = await fetch(`/api/v1/missions/${mission.code}/claim`, {
        method: 'POST',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Nie udało się odebrać nagrody');
      }
      await refresh();
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Nie udało się odebrać nagrody');
    } finally {
      setClaiming(null);
    }
  };

  if (error) {
    return (
      <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-destructive">
        <p>Nie udało się załadować misji. Spróbuj ponownie za chwilę.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Misje GiftFit</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Odkrywaj misje, zdobywaj XP, odznaki i nagrody. Zadania są kontekstowe – część z nich wraca sezonowo lub gdy Twoja garderoba potrzebuje aktualizacji.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-3xl bg-border/30" />
          ))}
        </div>
      ) : (
        (Object.entries(grouped) as Array<[MissionGroupKey, MissionState[]]>).map(([key, missionsInGroup]) => (
          <section key={key} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{GROUP_LABELS[key].label}</h2>
              <p className="text-sm text-muted-foreground">
                {GROUP_LABELS[key].description}
              </p>
            </div>

            {missionsInGroup.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-8 text-sm text-muted-foreground">
                Brak misji w tej sekcji.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {missionsInGroup.map((mission) => {
                  const translation = mission.translation;
                  const statusMeta = formatStatus(mission.status);
                  const cooldownInfo = formatCooldown(mission.userState?.nextEligibleAt ?? null, locale);
                  const progressLabel = formatProgressLabel(mission);
                  const href = `/dashboard/missions/${mission.code.toLowerCase()}`;

                  return (
                    <div
                      key={mission.id}
                      className="flex h-full flex-col justify-between gap-4 rounded-3xl border border-border/60 bg-[var(--surface-muted)] p-6 shadow-[0_20px_45px_-30px_rgba(6,134,239,0.35)] transition hover:border-[#48A9A6]"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-widest">
                          <span className={statusMeta.tone}>{statusMeta.label}</span>
                          {progressLabel ? <span className="text-muted-foreground">{progressLabel}</span> : null}
                        </div>

                        <div className="space-y-2">
                          <Link href={href} className="text-lg font-semibold text-foreground hover:text-primary transition">
                            {translation?.title ?? mission.code.replace(/_/g, ' ')}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {translation?.summary ?? 'Zobacz szczegóły misji.'}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-xs text-muted-foreground">
                          <p className="font-medium text-foreground">Nagroda</p>
                          <p>{translation?.reward_short ?? 'XP + bonusy według opisu misji'}</p>
                          {cooldownInfo ? <p className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground/80">{cooldownInfo}</p> : null}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href={href}
                          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/50 hover:text-primary"
                        >
                          Podgląd
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>

                        {mission.status === 'claimable' ? (
                          <button
                            type="button"
                            onClick={() => handleClaim(mission)}
                            disabled={claiming === mission.code}
                            className="inline-flex items-center gap-2 rounded-full bg-[#48A9A6] px-4 py-2 text-sm font-semibold text-white shadow shadow-[#48A9A6]/30 transition hover:bg-[#3c8f8c] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {claiming === mission.code ? 'Odbieranie...' : 'Odbierz nagrodę'}
                          </button>
                        ) : mission.status === 'available' ? (
                          <Link
                            href={href}
                            className="inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
                          >
                            Rozpocznij
                          </Link>
                        ) : mission.status === 'in_progress' ? (
                          <Link
                            href={href}
                            className="inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
                          >
                            Kontynuuj
                          </Link>
                        ) : mission.status === 'cooldown' ? (
                          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-xs font-medium text-muted-foreground">
                            Wróć później
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-xs font-medium text-muted-foreground">
                            {statusMeta.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
