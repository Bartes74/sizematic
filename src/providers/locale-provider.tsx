'use client';

import type {Locale} from '@/i18n/config';
import {usePathname, useRouter} from '@/i18n/navigation';
import {useSearchParams} from 'next/navigation';
import type {AbstractIntlMessages} from 'next-intl';
import {NextIntlClientProvider, useLocale as useIntlLocale, useTranslations} from 'next-intl';
import type {ReactNode} from 'react';

type LocaleProviderProps = {
  locale: Locale;
  messages: AbstractIntlMessages;
  children: ReactNode;
};

export function LocaleProvider({locale, messages, children}: LocaleProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

export function useLocale() {
  const locale = useIntlLocale() as Locale;
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setLocale = (nextLocale: Locale) => {
    if (nextLocale === locale) {
      return;
    }

    const params = new URLSearchParams(searchParams?.toString());
    params.set('locale', nextLocale);
    const href = `${pathname}?${params.toString()}`;

    try {
      router.replace(href);
      router.refresh();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to switch locale', error);
      }
    }
  };

  return {locale, setLocale, t};
}
