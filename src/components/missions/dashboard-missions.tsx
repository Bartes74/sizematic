import Link from 'next/link';
import { useMissions } from '@/hooks/use-missions';
import type { MissionState } from '@/components/missions/types';

function determineAccent(status: MissionState['status']): string {
  switch (status) {
    case 'claimable':
      return 'from-[#0686ef] via-[#48A9A6] to-[#0f1a23]';
    case 'in_progress':
      return 'from-[#48A9A6] via-[#7ec2bf] to-[#0f1a23]';
    case 'available':
      return 'from-[#94a3b8] via-[#48A9A6] to-[#0686ef]';
    case 'completed':
      return 'from-[#475569] via-[#64748b] to-[#94a3b8]';
    case 'cooldown':
      return 'from-[#334155] via-[#475569] to-[#1c2732]';
    default:
      return 'from-[#334155] via-[#475569] to-[#1c2732]';
  }
}

function determineStatusLabel(status: MissionState['status']): string {
  switch (status) {
    case 'claimable':
      return 'Gotowe do odbioru';
    case 'in_progress':
      return 'W trakcie';
    case 'available':
      return 'Dostępne';
    case 'completed':
      return 'Ukończone';
    case 'cooldown':
      return 'Odliczanie';
    case 'locked':
      return 'Zablokowane';
    case 'hidden':
      return 'Ukryte';
    default:
      return status;
  }
}

function formatProgress(progress?: Record<string, unknown> | null): string | null {
  if (!progress) return null;
  const data = progress as { streak?: number };
  if (typeof data.streak === 'number') {
    return `Seria ${data.streak}/7`;
  }
  return null;
}

export function DashboardMissions() {
  const { missions, isLoading } = useMissions();

  const highlight = missions
    .filter((mission) => mission.status !== 'hidden' && mission.status !== 'locked')
    .slice(0, 4);

  return (
    <section className="rounded-[32px] border border-border/60 bg-[var(--surface-muted)] p-6 shadow-[0_32px_60px_-40px_rgba(6,134,239,0.45)] lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">Twoje misje i zadania</h2>
          <p className="text-sm text-muted-foreground">
            Zbieraj punkty i zdobywaj nagrody
          </p>
        </div>
        <Link
          href="/dashboard/missions"
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/60 hover:text-primary"
        >
          Zobacz wszystkie
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-3xl bg-border/20"
            />
          ))}
        </div>
      ) : highlight.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/60 bg-background/60 px-6 py-10 text-center">
          <p className="text-base font-semibold text-foreground">Brak misji do wyświetlenia</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Gdy tylko pojawią się zadania dla Ciebie, wrócą tutaj. Odwiedź zakładkę „Zobacz wszystkie”, aby przejrzeć pełną listę.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {highlight.map((mission) => {
            const accent = determineAccent(mission.status);
            const progressLabel = formatProgress(mission.userState?.progress ?? null);
            const translation = mission.translation;

            return (
              <Link
                key={mission.id}
                href={`/dashboard/missions/${mission.code.toLowerCase()}`}
                className="group relative overflow-hidden rounded-[32px] border border-border/60 bg-gradient-to-br p-[1px]"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-90 transition group-hover:opacity-100`} />
                <div className="relative flex h-full flex-col justify-between gap-4 rounded-[32px] bg-[var(--surface-elevated)]/90 p-6 text-foreground backdrop-blur">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-white/80">
                      {determineStatusLabel(mission.status)}
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      {translation?.title ?? mission.code.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-sm text-white/80">
                      {translation?.summary ?? 'Zobacz szczegóły misji i zdobądź nagrody.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-white/80">
                    <span>{translation?.reward_short ?? 'XP + nagrody'}</span>
                    {progressLabel ? <span>{progressLabel}</span> : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
