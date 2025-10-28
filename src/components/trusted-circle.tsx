'use client';

import { useLocale } from "@/providers/locale-provider";

type CircleMember = {
  name: string;
  categories: string[];
};

type TrustedCircleProps = {
  members: CircleMember[];
  plan?: 'free' | 'premium' | 'premium_plus';
};

export function TrustedCircle({ members, plan = 'free' }: TrustedCircleProps) {
  const { t } = useLocale();

  const maxMembers = plan === 'free' ? 1 : plan === 'premium' ? 4 : Infinity;
  const canAddMore = members.length < maxMembers;

  return (
    <section className="animate-fade-in-up space-y-4 stagger-4">
      <div>
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          {t('circle.title')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('circle.subtitle')}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/5">
        <div className="space-y-4">
          {members.length === 0 ? (
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="mt-3 text-sm text-muted-foreground">{t('circle.noPeople')}</p>
            </div>
          ) : (
            members.map((member, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-sm font-bold">{member.name[0]}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{member.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('circle.hasAccessTo')} {member.categories.join(', ')}
                  </p>
                </div>
              </div>
            ))
          )}

          {canAddMore ? (
            <button className="w-full rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-all hover:border-primary/50 hover:bg-primary/10">
              + {t('circle.addPerson')}
            </button>
          ) : (
            <div className="rounded-xl bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {t('circle.limitReached', { count: members.length })}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
