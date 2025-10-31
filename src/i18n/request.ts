import type {Locale} from './config';
import {defaultLocale, locales} from './config';
import type {AbstractIntlMessages} from 'next-intl';
import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

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
  const resolvedLocale = locales.includes(locale as Locale)
    ? (locale as Locale)
    : defaultLocale;

  if (resolvedLocale !== locale && process.env.NODE_ENV === 'development') {
    console.warn(`Unsupported locale "${locale}" requested, falling back to ${defaultLocale}.`);
  }

  const messages = await loadMessages(resolvedLocale);
  if (!messages) {
    notFound();
  }

  return {
    locale: resolvedLocale,
    messages,
  };
});
