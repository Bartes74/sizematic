import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { defaultLocale, locales, localePrefix } from '@/i18n/config';

const handleI18nRouting = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix,
});

export async function middleware(request: NextRequest) {
  const i18nResponse = handleI18nRouting(request);

  // Return early if the middleware handled the response (redirect/rewrite)
  if (i18nResponse.headers.get('x-middleware-next') !== '1') {
    return i18nResponse;
  }

  const response = i18nResponse;

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

  // If user is not logged in and trying to access protected routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If user is logged in and trying to access auth page, redirect to dashboard
  if (user && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
