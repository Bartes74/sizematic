'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback } from 'react';

type PublicWishlistItem = {
  id: string;
  product_name: string | null;
  product_brand: string | null;
  image_url: string | null;
  category: string | null;
  url: string | null;
  price_snapshot: Record<string, unknown> | null;
};

type PublicWishlistViewProps = {
  token: string;
  wishlistId: string;
  title: string;
  description: string | null;
  items: PublicWishlistItem[];
};

export function PublicWishlistView({ token, wishlistId, title, description, items }: PublicWishlistViewProps) {
  const logStoreClick = useCallback(
    (item: PublicWishlistItem) => {
      const payload = {
        token,
        eventType: 'wishlist_store_click',
        metadata: {
          wishlistId,
          wishlistItemId: item.id,
          destination: item.url,
          context: 'list',
        },
      };

      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/v1/wishlist-events', blob);
        return;
      }

      void fetch('/api/v1/wishlist-events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    },
    [token, wishlistId]
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">GiftFit</p>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </header>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-muted/40 py-20 text-center">
          <p className="text-sm font-medium text-muted-foreground">Ta lista nie ma jeszcze udostępnionych pozycji.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((item) => {
            const price = formatPrice(item.price_snapshot);

            return (
              <article key={item.id} className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow">
                <div className="relative h-48 w-full border-b border-border/60 bg-muted">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.product_name ?? 'Produkt z listy marzeń'}
                      fill
                      className="object-cover"
                      sizes="(min-width: 768px) 320px, 100vw"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Brak zdjęcia</div>
                  )}
                  {item.category ? (
                    <span className="absolute left-4 top-4 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                      {item.category}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="space-y-2">
                    <h2 className="line-clamp-2 text-lg font-semibold text-foreground">{item.product_name ?? 'Produkt z listy marzeń'}</h2>
                    <p className="text-xs text-muted-foreground">{extractHostname(item.url)}</p>
                  </div>

                  {price ? <p className="text-lg font-semibold text-foreground">{price}</p> : null}

                  <div className="mt-auto flex justify-end">
                    <Link
                      href={item.url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
                      onClick={() => logStoreClick(item)}
                    >
                      Przejdź do sklepu
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6v6" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L15 9" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

function extractHostname(url: string | null) {
  if (!url) {
    return '';
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function formatPrice(snapshot: Record<string, unknown> | null) {
  if (!snapshot) {
    return null;
  }

  const amount = snapshot.amount as string | number | null | undefined;
  const currency = snapshot.currency as string | null | undefined;

  if (amount == null) {
    return null;
  }

  const numeric = typeof amount === 'number' ? amount : Number.parseFloat(amount);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  try {
    return new Intl.NumberFormat('pl-PL', {
      style: currency ? 'currency' : 'decimal',
      currency: currency ?? undefined,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return numeric.toFixed(2);
  }
}

