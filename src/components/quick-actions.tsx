'use client';

import Link from "next/link";
import { useTranslations } from "next-intl";

export function QuickActions() {
  const t = useTranslations('quickActions');

  const actions = [
    {
      title: t('addBodyMeasurement'),
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      ),
      href: '/dashboard/garments/add',
      variant: 'primary' as const,
    },
    {
      title: t('copyFromLabel'),
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      href: '/dashboard/size-labels/add',
      variant: 'secondary' as const,
    },
    {
      title: t('sendGiftLink'),
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      ),
      href: '#send-gift-link',
      variant: 'secondary' as const,
    },
  ];

  return (
    <section className="animate-fade-in-up stagger-1 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {actions.map((action, idx) => (
          <a
            key={idx}
            href={action.href}
            className={`group relative overflow-hidden rounded-2xl border p-6 transition-all hover:scale-[1.02] ${
              action.variant === 'primary'
                ? 'border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10'
                : 'border-border bg-card shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10'
            }`}
          >
            <div className="relative z-10 flex items-center gap-4">
              <div
                className={`rounded-xl p-3 ${
                  action.variant === 'primary'
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-foreground'
                }`}
              >
                {action.icon}
              </div>
              <p className="font-semibold text-foreground">{action.title}</p>
            </div>
            {action.variant === 'primary' && (
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition-all group-hover:h-40 group-hover:w-40" />
            )}
          </a>
        ))}
      </div>

      <div className="text-center">
        <Link
          href="/dashboard/sizes/all"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          {t('viewMySizes')}
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
