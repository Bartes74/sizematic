'use client';

import { useLocale } from "@/providers/locale-provider";

export function RecentActivity() {
  const { t } = useLocale();

  // Placeholder data
  const hasActivity = false;

  return (
    <section className="animate-fade-in-up space-y-4 stagger-5">
      <div>
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          {t('activity.title')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('activity.subtitle')}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/5">
        {!hasActivity ? (
          <div className="py-6 text-center">
            <svg
              className="mx-auto h-10 w-10 text-muted-foreground/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-3 text-sm text-muted-foreground">{t('activity.noActivity')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Tutaj będą wyświetlane aktywności */}
          </div>
        )}

        <p className="mt-6 rounded-xl bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
          💡 {t('activity.premiumFeature')}
        </p>
      </div>
    </section>
  );
}
