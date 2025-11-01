import type {Locale} from './config';
import {defaultLocale, locales} from './config';
import type {AbstractIntlMessages} from 'next-intl';
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {headers, cookies} from 'next/headers';

const LOCALE_COOKIE = 'NEXT_LOCALE';

function normalizeLocale(value: string | undefined | null): Locale | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  return locales.includes(normalized as Locale) ? (normalized as Locale) : null;
}

async function loadMessages(locale: Locale): Promise<AbstractIntlMessages | null> {
  try {
    const messages = await import(`../../messages/${locale}.json`);
    return messages.default;
  } catch (error) {
    console.error(`Missing translation messages for locale "${locale}".`, error);
    return null;
  }
}

export default getRequestConfig(async ({locale}) => {
  const requestHeaders = await headers();
  const cookieStore = await cookies();

  const headerLocale = normalizeLocale(requestHeaders.get('x-next-intl-locale'));
  const cookieLocale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const inferredLocale = normalizeLocale(locale);

  const resolvedLocale = cookieLocale ?? headerLocale ?? inferredLocale ?? defaultLocale;

  const messages = await loadMessages(resolvedLocale);
  if (!messages) {
    notFound();
  }

  return {
    locale: resolvedLocale,
    messages,
  };
});
