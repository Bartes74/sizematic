'use client';

import { useMemo } from 'react';
import { locales as supportedLocales, type Locale } from '@/i18n/config';
import { useLocale } from '@/providers/locale-provider';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const availableLocales = useMemo(
    () =>
      supportedLocales.filter((value): value is Locale => typeof value === 'string' && value.trim().length > 0),
    []
  );

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1">
      {availableLocales.map((loc) => {
        const label = loc.toUpperCase();
        const isActive = locale === loc;

        return (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            className={`
              cursor-pointer relative px-3 py-1 rounded-full text-sm font-medium transition-all duration-300
              ${
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }
            `}
            aria-label={`Switch to ${label}`}
            aria-current={isActive ? 'true' : 'false'}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
