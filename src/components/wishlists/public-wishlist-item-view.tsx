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
  notes: string | null;
  parsed_at: string | null;
};

type PublicWishlistItemViewProps = {
  token: string;
  wishlistId: string;
  item: PublicWishlistItem;
};

export function PublicWishlistItemView({ token, wishlistId, item }: PublicWishlistItemViewProps) {
  const logStoreClick = useCallback(() => {
    const payload = {
      token,
      eventType: 'wishlist_store_click',
      metadata: {
        wishlistId,
        wishlistItemId: item.id,
        destination: item.url,
        context: 'item',
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
  }, [token, wishlistId, item.id, item.url]);

  const price = formatPrice(item.price_snapshot);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 py-16">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">GiftFit</p>
        <h1 className="text-3xl font-semibold text-foreground">{item.product_name ?? 'Produkt z listy marzeń'}</h1>
        {item.category ? <p className="text-sm text-muted-foreground">Kategoria: {item.category}</p> : null}
      </header>

      <section className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 shadow md:flex-row">
        <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-border/50 bg-muted md:w-1/2">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.product_name ?? 'Produkt z listy marzeń'}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 360px, 100vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Brak zdjęcia</div>
          )}
        </div>

        <div className="flex w-full flex-col gap-4 md:w-1/2">
          {price ? <p className="text-2xl font-semibold text-foreground">{price}</p> : null}

          {item.notes ? (
            <div className="rounded-2xl border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Notatka</p>
              <p>{item.notes}</p>
            </div>
          ) : null}

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Link do sklepu:</span>{' '}
              <Link
                href={item.url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary transition hover:text-primary/80"
                onClick={logStoreClick}
              >
                {extractHostname(item.url)}
              </Link>
            </p>
            <p>
              <span className="font-semibold text-foreground">Ostatnia aktualizacja danych:</span>{' '}
              {item.parsed_at ? new Date(item.parsed_at).toLocaleString('pl-PL') : 'Brak danych'}
            </p>
          </div>
        </div>
      </section>
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

