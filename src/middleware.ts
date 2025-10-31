import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, locales } from '@/i18n/config';

type Locale = (typeof locales)[number];

const LOCALE_COOKIE = 'NEXT_LOCALE';

function normalizeLocale(value: string | undefined | null): Locale | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (locales.includes(normalized as Locale)) {
    return normalized as Locale;
  }

  return null;
}

function resolveLocaleFromAcceptLanguage(headerValue: string | null): Locale | null {
  if (!headerValue) {
    return null;
  }

  const requestedLocales = headerValue
    .split(',')
    .map((part) => part.split(';')[0]?.trim())
    .filter(Boolean);

  for (const candidate of requestedLocales) {
    const normalized = candidate?.toLowerCase()?.split('-')[0];
    if (normalized && locales.includes(normalized as Locale)) {
      return normalized as Locale;
    }
  }

  return null;
}

function applyLocaleMetadata(response: NextResponse, locale: Locale) {
  response.headers.set('x-next-intl-locale', locale);
  response.cookies.set(LOCALE_COOKIE, locale, { path: '/', sameSite: 'lax' });
  return response;
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  const localeQuery = normalizeLocale(url.searchParams.get('locale'));
  if (localeQuery) {
    url.searchParams.delete('locale');
    const redirect = NextResponse.redirect(url);
    return applyLocaleMetadata(redirect, localeQuery);
  }

  const cookieLocale = normalizeLocale(request.cookies.get(LOCALE_COOKIE)?.value);
  const headerLocale = resolveLocaleFromAcceptLanguage(request.headers.get('accept-language'));
  const locale = cookieLocale ?? headerLocale ?? defaultLocale;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-next-intl-locale', locale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (cookieLocale !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, { path: '/', sameSite: 'lax' });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const redirect = NextResponse.redirect(new URL('/', request.url));
    return applyLocaleMetadata(redirect, locale);
  }

  if (user && request.nextUrl.pathname === '/') {
    const redirect = NextResponse.redirect(new URL('/dashboard', request.url));
    return applyLocaleMetadata(redirect, locale);
  }

  return applyLocaleMetadata(response, locale);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
