'use client';

import { useLocale } from '@/providers/locale-provider';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const locales = ['pl', 'en'] as const;

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1">
      {locales.map((loc) => {
        const isActive = locale === loc;
        return (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            className={`
              relative px-3 py-1 rounded-full text-sm font-medium transition-all duration-300
              ${
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }
            `}
            aria-label={`Switch to ${loc.toUpperCase()}`}
            aria-current={isActive ? 'true' : 'false'}
          >
            {loc.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
