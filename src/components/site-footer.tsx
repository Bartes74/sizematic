import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function SiteFooter() {
  const t = await getTranslations('landing.footer');

  return (
    <footer className="border-t border-border/60 bg-background/80 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground lg:flex-row lg:px-6">
        <div className="flex gap-6 text-sm font-medium">
          <Link className="transition hover:text-foreground" href="/privacy">
            {t('privacy')}
          </Link>
          <Link className="transition hover:text-foreground" href="/terms">
            {t('terms')}
          </Link>
          <a
            className="transition hover:text-foreground"
            href="mailto:bartes7@gmail.com"
          >
            {t('contact')}
          </a>
        </div>
        <p className="text-xs text-muted-foreground/80">
          © {new Date().getFullYear()} GiftFit. All rights reserved.
        </p>
      </div>
    </footer>
  );
}



