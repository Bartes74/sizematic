'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { routing } from '@/i18n/routing';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    // Use the i18n router which handles locale switching
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1">
      {routing.locales.map((loc) => {
        const isActive = locale === loc;
        return (
          <button
            key={loc}
            onClick={() => switchLocale(loc)}
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
