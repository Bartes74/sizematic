'use client';

import { useLocale } from "@/providers/locale-provider";

export function MissionsReminders() {
  const { t } = useLocale();

  return (
    <section className="animate-fade-in-up space-y-4 stagger-3">
      <div>
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          {t('missions.title')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('missions.subtitle')}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/5">
        <div className="space-y-6">
          {/* Główna akcja */}
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-accent/10 p-3">
              <svg
                className="h-6 w-6 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                Nie mierzyliśmy długości stopy od 14 miesięcy
              </p>
              <button className="mt-2 text-sm font-medium text-primary hover:underline">
                {t('missions.checkNow')} →
              </button>
            </div>
          </div>

          {/* Progres misji tygodnia */}
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{t('missions.weeklyProgress')}</span>
              <span className="text-sm font-bold text-primary">60%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[60%] bg-gradient-to-r from-primary to-accent transition-all" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('missions.reward')}: 🎁 Odznaka „Measurement Master"
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
