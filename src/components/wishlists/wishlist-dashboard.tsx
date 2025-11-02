'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';

import type { Wishlist, WishlistItem } from '@/lib/types';

type WishlistDashboardProps = {
  initialWishlist: Wishlist | null;
  allWishlists: Wishlist[];
  initialItems: WishlistItem[];
  initialTotal: number;
  initialHasMore: boolean;
  initialCategories: string[];
  pageSize: number;
};

type WishlistItemView = WishlistItem & {
  tempId?: string;
  isOptimistic?: boolean;
  uiError?: string | null;
};

type SortOption = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc';

type AppliedFilters = {
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
};

const SORT_CONFIG: Record<SortOption, { field: 'created_at' | 'updated_at' | 'price'; direction: 'asc' | 'desc' }> = {
  date_desc: { field: 'created_at', direction: 'desc' },
  date_asc: { field: 'created_at', direction: 'asc' },
  price_desc: { field: 'price', direction: 'desc' },
  price_asc: { field: 'price', direction: 'asc' },
};

type ShareState = {
  kind: 'list' | 'item';
  title: string;
  url: string | null;
  loading: boolean;
  error: string | null;
  itemId?: string;
};

type PriceSnapshot = {
  amount?: string | number | null;
  currency?: string | null;
};

function normalizeItem(item: WishlistItem): WishlistItemView {
  return {
    ...item,
    uiError: null,
  };
}

function formatPrice(snapshot: WishlistItem['price_snapshot'], locale: string) {
  if (!snapshot) {
    return null;
  }

  const payload = snapshot as PriceSnapshot;
  if (!payload.amount) {
    return null;
  }

  const amountNumber = typeof payload.amount === 'number' ? payload.amount : Number(payload.amount);

  if (Number.isNaN(amountNumber)) {
    return null;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: payload.currency ? 'currency' : 'decimal',
      currency: payload.currency ?? undefined,
      maximumFractionDigits: 2,
    }).format(amountNumber);
  } catch (error) {
    console.warn('Failed to format price snapshot', error);
    return amountNumber.toFixed(2);
  }
}

function parseFilterValue(value: string) {
  if (!value.trim()) {
    return null;
  }

  const normalized = value.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

type ModalFrameProps = {
  onClose: () => void;
  titleId: string;
  children: ReactNode;
  maxWidth?: string;
};

function ModalFrame({ onClose, titleId, children, maxWidth = 'max-w-3xl' }: ModalFrameProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKey);

    const node = modalRef.current;
    if (node) {
      node.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKey);
      if (previouslyFocused.current) {
        previouslyFocused.current.focus();
      }
    };
  }, [onClose]);

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${maxWidth} rounded-3xl border border-border bg-card p-6 shadow-2xl focus:outline-none`}
        tabIndex={-1}
        ref={modalRef}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border/60 p-2 text-muted-foreground transition hover:border-primary hover:text-primary"
            aria-label="Zamknij"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

type ShareLinkModalProps = {
  state: ShareState;
  onClose: () => void;
  onRetry: () => void;
};

function ShareLinkModal({ state, onClose, onRetry }: ShareLinkModalProps) {
  const t = useTranslations('wishlist');
  const tCommon = useTranslations('common');
  const [copied, setCopied] = useState(false);

  const titleId = 'wishlist-share-modal';

  const handleCopy = async () => {
    if (!state.url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy share link', error);
    }
  };

  return (
    <ModalFrame onClose={onClose} titleId={titleId} maxWidth="max-w-lg">
      <div className="space-y-6" aria-labelledby={titleId}>
        <div className="space-y-2 text-center">
          <h2 id={titleId} className="text-xl font-semibold text-foreground">
            {state.title}
          </h2>
          <p className="text-sm text-muted-foreground">{t('shareModal.subtitle')}</p>
        </div>

        {state.loading ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-r-transparent" aria-hidden="true" />
            {t('shareModal.loading')}
          </div>
        ) : state.error ? (
          <div className="space-y-4">
            <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {state.error}
            </p>
            <button
              type="button"
              className="w-full rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
              onClick={onRetry}
            >
              {t('shareModal.retry')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground" htmlFor="wishlist-share-url">
                {t('shareModal.linkLabel')}
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="wishlist-share-url"
                  className="w-full flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  readOnly
                  value={state.url ?? ''}
                />
                <button
                  type="button"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
                  onClick={handleCopy}
                >
                  {copied ? t('shareModal.copied') : t('shareModal.copy')}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('shareModal.disclaimer')}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
            onClick={onClose}
            disabled={state.loading}
          >
            {tCommon('close')}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

type DetailModalProps = {
  item: WishlistItemView;
  onClose: () => void;
  onItemUpdated: (item: WishlistItemView) => void;
  onItemDeleted: (itemId: string) => void;
  onRefreshRequested: (itemId: string) => Promise<void>;
  locale: string;
  onShareItem: (item: WishlistItemView) => void;
};

function WishlistItemDetailModal({
  item,
  onClose,
  onItemUpdated,
  onItemDeleted,
  onRefreshRequested,
  locale,
  onShareItem,
}: DetailModalProps) {
  const t = useTranslations('wishlist');
  const tCommon = useTranslations('common');
  const [category, setCategory] = useState(item.category ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const formattedPrice = formatPrice(item.price_snapshot, locale);
  const titleId = `wishlist-item-${item.id}`;

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/wishlist-items/${item.id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          category: category.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Nie udało się zaktualizować pozycji');
      }

      const payload = (await response.json()) as { item: WishlistItem };
      onItemUpdated(normalizeItem(payload.item));
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nie udało się zapisać zmian');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmation) {
      setDeleteConfirmation(true);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/wishlist-items/${item.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Nie udało się usunąć pozycji');
      }

      onItemDeleted(item.id);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nie udało się usunąć pozycji');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setSaving(true);
    setError(null);

    try {
      await onRefreshRequested(item.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nie udało się odświeżyć danych');
    } finally {
      setSaving(false);
    }
  };

  const lastFetched = item.parsed_at
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(item.parsed_at))
    : t('details.notFetched');

  return (
    <ModalFrame onClose={onClose} titleId={titleId}>
      <div className="space-y-6" aria-labelledby={titleId}>
        <div className="space-y-2">
          <h2 id={titleId} className="text-xl font-semibold text-foreground">
            {item.product_name || t('details.fallbackTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {item.product_brand ? `${item.product_brand} · ` : ''}
            {getHostname(item.url)}
          </p>
          <p className="text-xs text-muted-foreground">{t('details.lastSync', { value: lastFetched })}</p>
        </div>

        {item.image_url ? (
          <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-border/40">
            <Image
              src={item.image_url}
              alt={item.product_name ?? t('details.fallbackTitle')}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 600px, 100vw"
              unoptimized
            />
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground" htmlFor={`${titleId}-category`}>
              {t('details.categoryLabel')}
            </label>
            <input
              id={`${titleId}-category`}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <span className="text-sm font-semibold text-muted-foreground">{t('details.priceLabel')}</span>
            <p className="rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
              {formattedPrice ?? t('details.priceUnavailable')}
            </p>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-semibold text-muted-foreground" htmlFor={`${titleId}-notes`}>
              {t('details.notesLabel')}
            </label>
            <textarea
              id={`${titleId}-notes`}
              className="h-32 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={2000}
            />
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-sm font-semibold text-muted-foreground">{t('details.storeLink')}</span>
          <Link
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {getHostname(item.url)}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6v6" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L15 9" />
            </svg>
          </Link>
        </div>

        {item.parse_status === 'failed' && item.parse_error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {item.parse_error}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
              onClick={() => onShareItem(item)}
              disabled={saving}
            >
              {t('actions.shareItem')}
            </button>
            <button
              type="button"
              className="rounded-full border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
              onClick={handleDelete}
              disabled={saving}
            >
              {deleteConfirmation ? t('details.confirmDelete') : t('details.delete')}
            </button>
            <button
              type="button"
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
              onClick={handleRefresh}
              disabled={saving}
            >
              {t('details.refresh')}
            </button>
          </div>
          <div className="ml-auto flex gap-3">
            <button
              type="button"
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
              onClick={onClose}
              disabled={saving}
            >
              {tCommon('cancel')}
            </button>
            <button
              type="button"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
              onClick={handleSave}
              disabled={saving}
            >
              {tCommon('save')}
            </button>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}

export default function WishlistDashboard({
  initialWishlist,
  allWishlists,
  initialItems,
  initialTotal,
  initialHasMore,
  initialCategories,
  pageSize,
}: WishlistDashboardProps) {
  const t = useTranslations('wishlist');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [wishlists, setWishlists] = useState<Wishlist[]>(allWishlists);
  const [activeWishlistId, setActiveWishlistId] = useState<string | null>(initialWishlist?.id ?? null);
  const [items, setItems] = useState<WishlistItemView[]>(() => initialItems.map(normalizeItem));
  const [availableCategories, setAvailableCategories] = useState<string[]>(initialCategories);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialItems.length);
  const [isFetching, setIsFetching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    category: null,
    minPrice: null,
    maxPrice: null,
  });
  const [shareState, setShareState] = useState<ShareState | null>(null);
  const [formCategory, setFormCategory] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WishlistItemView | null>(null);

  const activeWishlist = useMemo(() => {
    return wishlists.find((entry) => entry.id === activeWishlistId) ?? null;
  }, [wishlists, activeWishlistId]);

  const hasPending = useMemo(() => items.some((item) => item.parse_status === 'pending'), [items]);

  const ensureDefaultWishlist = useCallback(async () => {
    if (activeWishlistId || bootstrapLoading) {
      return;
    }

    setBootstrapLoading(true);
    try {
      const response = await fetch('/api/v1/wishlists', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: t('defaults.title'),
          description: null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Nie udało się utworzyć listy życzeń');
      }

      const payload = (await response.json()) as { wishlist: Wishlist };
      setWishlists((prev) => [...prev, payload.wishlist]);
      setActiveWishlistId(payload.wishlist.id);
    } catch (error) {
      console.error('Failed to bootstrap wishlist', error);
      setFormError(t('errors.bootstrapFailed'));
    } finally {
      setBootstrapLoading(false);
    }
  }, [activeWishlistId, bootstrapLoading, t]);

  useEffect(() => {
    if (!initialWishlist) {
      void ensureDefaultWishlist();
    }
  }, [initialWishlist, ensureDefaultWishlist]);

  const loadWishlistItems = useCallback(
    async ({
      reset,
      filters,
      sort,
      offset,
    }: {
      reset: boolean;
      filters?: AppliedFilters;
      sort?: SortOption;
      offset?: number;
    }) => {
      if (!activeWishlistId) {
        return;
      }

      const resolvedFilters = filters ?? appliedFilters;
      const resolvedSort = sort ?? sortOption;
      const resolvedOffset = offset ?? (reset ? 0 : nextOffset);
      const config = SORT_CONFIG[resolvedSort];

      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: resolvedOffset.toString(),
        sort: config.field,
        direction: config.direction,
      });

      if (resolvedFilters.category) {
        params.set('category', resolvedFilters.category);
      }

      if (resolvedFilters.minPrice != null) {
        params.set('minPrice', resolvedFilters.minPrice.toString());
      }

      if (resolvedFilters.maxPrice != null) {
        params.set('maxPrice', resolvedFilters.maxPrice.toString());
      }

      setListError(null);
      if (reset) {
        setIsFetching(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await fetch(`/api/v1/wishlists/${activeWishlistId}/items?${params.toString()}`, {
          method: 'GET',
          headers: {
            'cache-control': 'no-store',
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message ?? t('errors.loadFailed'));
        }

        const payload = (await response.json()) as {
          items: WishlistItem[];
          total: number;
          hasMore: boolean;
          categories: string[];
        };

        const normalized = payload.items.map(normalizeItem);

        if (reset) {
          setItems(normalized);
          setNextOffset(normalized.length);
        } else {
          setItems((prev) => [...prev, ...normalized]);
          setNextOffset((prev) => prev + normalized.length);
        }

        setTotalCount(payload.total);
        setHasMore(payload.hasMore);
        setAvailableCategories(payload.categories);
      } catch (error) {
        setListError(error instanceof Error ? error.message : t('errors.loadFailed'));
      } finally {
        if (reset) {
          setIsFetching(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [activeWishlistId, appliedFilters, sortOption, nextOffset, pageSize, t]
  );

  const skipInitialFetchRef = useRef(true);

  useEffect(() => {
    if (!activeWishlistId) {
      return;
    }

    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      if (initialItems.length > 0) {
        return;
      }
    }

    void loadWishlistItems({ reset: true, offset: 0 });
  }, [activeWishlistId, loadWishlistItems, initialItems.length]);

  useEffect(() => {
    if (!activeWishlistId || !hasPending) {
      return;
    }

    const interval = setInterval(() => {
      void loadWishlistItems({ reset: true, offset: 0 });
    }, 4000);

    return () => clearInterval(interval);
  }, [activeWishlistId, hasPending, loadWishlistItems]);

  const fetchShareLink = useCallback(
    async (config: { kind: 'list' } | { kind: 'item'; itemId: string }) => {
      if (!activeWishlistId) {
        throw new Error(t('errors.noWishlist'));
      }

      const endpoint =
        config.kind === 'list'
          ? `/api/v1/wishlists/${activeWishlistId}/share-link`
          : `/api/v1/wishlist-items/${config.itemId}/share-link`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? t('errors.loadFailed'));
      }

      const payload = (await response.json()) as { url: string };
      return payload.url;
    },
    [activeWishlistId, t]
  );

  const handleShareList = useCallback(() => {
    if (!activeWishlist) {
      setFormError(t('errors.noWishlist'));
      return;
    }

    setShareState({
      kind: 'list',
      title: t('shareModal.titleList', { list: activeWishlist.title }),
      url: null,
      loading: true,
      error: null,
    });

    void fetchShareLink({ kind: 'list' })
      .then((url) => {
        setShareState((prev) => (prev ? { ...prev, url, loading: false } : prev));
      })
      .catch((error) => {
        setShareState((prev) =>
          prev
            ? {
                ...prev,
                error: error instanceof Error ? error.message : t('errors.loadFailed'),
                loading: false,
              }
            : prev
        );
      });
  }, [activeWishlist, fetchShareLink, t]);

  const handleShareItem = useCallback(
    (item: WishlistItemView) => {
      setShareState({
        kind: 'item',
        title: t('shareModal.titleItem', { item: item.product_name ?? t('cards.fallbackTitle') }),
        url: null,
        loading: true,
        error: null,
        itemId: item.id,
      });

      void fetchShareLink({ kind: 'item', itemId: item.id })
        .then((url) => {
          setShareState((prev) => (prev ? { ...prev, url, loading: false } : prev));
        })
        .catch((error) => {
          setShareState((prev) =>
            prev
              ? {
                  ...prev,
                  error: error instanceof Error ? error.message : t('errors.loadFailed'),
                  loading: false,
                }
              : prev
          );
        });
    },
    [fetchShareLink, t]
  );

  const handleShareRetry = useCallback(() => {
    if (!shareState) {
      return;
    }

    setShareState((prev) => (prev ? { ...prev, loading: true, error: null } : prev));

    const target =
      shareState.kind === 'list'
        ? ({ kind: 'list' } as const)
        : ({ kind: 'item', itemId: shareState.itemId as string } as const);

    void fetchShareLink(target)
      .then((url) => {
        setShareState((prev) => (prev ? { ...prev, url, loading: false } : prev));
      })
      .catch((error) => {
        setShareState((prev) =>
          prev
            ? {
                ...prev,
                error: error instanceof Error ? error.message : t('errors.loadFailed'),
                loading: false,
              }
            : prev
        );
      });
  }, [fetchShareLink, shareState, t]);

  const handleShareClose = useCallback(() => {
    setShareState(null);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!activeWishlist) {
      setFormError(t('errors.noWishlist'));
      return;
    }

    if (!formUrl.trim()) {
      setFormError(t('errors.urlRequired'));
      return;
    }

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(formUrl.trim());
    } catch {
      setFormError(t('errors.invalidUrl'));
      return;
    }

    const optimisticId = `temp-${Date.now()}`;
    const optimisticItem: WishlistItemView = {
      id: optimisticId,
      tempId: optimisticId,
      wishlist_id: activeWishlist.id,
      category: formCategory.trim() || null,
      url: parsedUrl.toString(),
      product_name: null,
      product_brand: null,
      image_url: null,
      price_snapshot: null,
      parse_status: 'pending',
      parse_error: null,
      parsed_at: null,
      matched_size: null,
      size_confidence: 'missing',
      notes: formNotes.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isOptimistic: true,
      uiError: null,
    };

    setItems((prev) => [optimisticItem, ...prev]);
    setFormLoading(true);

    try {
      const response = await fetch(`/api/v1/wishlists/${activeWishlist.id}/items`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          url: parsedUrl.toString(),
          notes: formNotes.trim() || null,
          category: formCategory.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? t('errors.addFailed'));
      }

      const payload = (await response.json()) as { item: WishlistItem };
      setItems((prev) => {
        const normalizedItem = normalizeItem(payload.item);
        const others = prev.filter((entry) => entry.id !== optimisticId);
        const nextItems = [normalizedItem, ...others];
        setNextOffset((prevOffset) => Math.max(prevOffset, nextItems.length));
        return nextItems;
      });
      setTotalCount((prev) => prev + 1);
      if (payload.item.category) {
        setAvailableCategories((prev) => {
          if (prev.includes(payload.item.category as string)) {
            return prev;
          }
          return [...prev, payload.item.category as string].sort((a, b) => a.localeCompare(b, 'pl'));
        });
      }

      setFormCategory('');
      setFormUrl('');
      setFormNotes('');
    } catch (error) {
      setItems((prev) => prev.filter((entry) => entry.id !== optimisticId));
      setFormError(error instanceof Error ? error.message : t('errors.addFailed'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleItemUpdate = (updated: WishlistItemView) => {
    setItems((prev) => {
      const next = prev.map((entry) => (entry.id === updated.id ? normalizeItem(updated) : entry));
      const categorySet = new Set(
        next
          .map((item) => item.category)
          .filter((value): value is string => Boolean(value))
      );
      setAvailableCategories(Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'pl')));
      return next;
    });
  };

  const handleItemDelete = (itemId: string) => {
    setItems((prev) => {
      const next = prev.filter((entry) => entry.id !== itemId);
      const categorySet = new Set(
        next
          .map((item) => item.category)
          .filter((value): value is string => Boolean(value))
      );
      setAvailableCategories(Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'pl')));
      return next;
    });
    setTotalCount((prev) => Math.max(0, prev - 1));
    setNextOffset((prev) => Math.max(0, prev - 1));
    void loadWishlistItems({ reset: true, offset: 0 });
  };

  const handleRefreshRequested = async (itemId: string) => {
    const response = await fetch(`/api/v1/wishlist-items/${itemId}/refresh`, {
      method: 'POST',
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message ?? t('errors.refreshFailed'));
    }

    setItems((prev) =>
      prev.map((entry) =>
        entry.id === itemId
          ? {
              ...entry,
              parse_status: 'pending',
              parse_error: null,
            }
          : entry
      )
    );
  };

  const handleRetry = async (itemId: string) => {
    try {
      await handleRefreshRequested(itemId);
    } catch (error) {
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === itemId
            ? {
                ...entry,
                uiError: error instanceof Error ? error.message : t('errors.refreshFailed'),
              }
            : entry
        )
      );
    }
  };

  const handleApplyFilters = () => {
    setListError(null);

    const parsedMin = parseFilterValue(minPriceInput);
    const parsedMax = parseFilterValue(maxPriceInput);

    if (parsedMin != null && parsedMax != null && parsedMin > parsedMax) {
      setListError(t('errors.priceRange'));
      return;
    }

    const nextFilters: AppliedFilters = {
      category: categoryFilter === 'all' ? null : categoryFilter,
      minPrice: parsedMin,
      maxPrice: parsedMax,
    };

    setAppliedFilters(nextFilters);
    void loadWishlistItems({ reset: true, filters: nextFilters, sort: sortOption, offset: 0 });
  };

  const handleClearFilters = () => {
    setCategoryFilter('all');
    setMinPriceInput('');
    setMaxPriceInput('');
    const defaultFilters: AppliedFilters = {
      category: null,
      minPrice: null,
      maxPrice: null,
    };
    setAppliedFilters(defaultFilters);
    if (sortOption !== 'date_desc') {
      setSortOption('date_desc');
      void loadWishlistItems({ reset: true, filters: defaultFilters, sort: 'date_desc', offset: 0 });
    } else {
      void loadWishlistItems({ reset: true, filters: defaultFilters, sort: sortOption, offset: 0 });
    }
  };

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as SortOption;
    setSortOption(value);
    void loadWishlistItems({ reset: true, sort: value, offset: 0 });
  };

  const handleLoadMore = () => {
    if (loadingMore || isFetching) {
      return;
    }
    void loadWishlistItems({ reset: false });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
            onClick={handleShareList}
            disabled={!activeWishlist || isFetching}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 8a3 3 0 10-6 0 3 3 0 006 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10a3 3 0 003 3h10a3 3 0 003-3V7" />
            </svg>
            {t('actions.shareList')}
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="wishlist-category" className="text-sm font-semibold text-muted-foreground">
              {t('form.category')}
            </label>
            <input
              id="wishlist-category"
              type="text"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={formCategory}
              onChange={(event) => setFormCategory(event.target.value)}
              placeholder={t('form.categoryPlaceholder')}
              maxLength={120}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="wishlist-url" className="text-sm font-semibold text-muted-foreground">
              {t('form.url')}
            </label>
            <input
              id="wishlist-url"
              type="url"
              required
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={formUrl}
              onChange={(event) => setFormUrl(event.target.value)}
              placeholder={t('form.urlPlaceholder')}
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <label htmlFor="wishlist-notes" className="text-sm font-semibold text-muted-foreground">
              {t('form.notes')}
            </label>
            <textarea
              id="wishlist-notes"
              className="h-28 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={formNotes}
              onChange={(event) => setFormNotes(event.target.value)}
              placeholder={t('form.notesPlaceholder')}
              maxLength={2000}
            />
          </div>
        </div>

        {formError ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="flex items-center justify-between">
          <button
            type="button"
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
            onClick={() => {
              setFormCategory('');
              setFormUrl('');
              setFormNotes('');
              setFormError(null);
            }}
            disabled={formLoading}
          >
          {tCommon('clear')}
          </button>
          <button
            type="submit"
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={formLoading || bootstrapLoading}
          >
            {formLoading ? t('form.saving') : t('form.submit')}
          </button>
        </div>
      </form>

      <section className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">{t('filters.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('filters.subtitle')}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
              onClick={handleClearFilters}
              disabled={isFetching || loadingMore}
            >
              {t('filters.clear')}
            </button>
            <button
              type="button"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={handleApplyFilters}
              disabled={isFetching}
            >
              {t('filters.apply')}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label htmlFor="wishlist-filter-category" className="text-sm font-semibold text-muted-foreground">
              {t('filters.categoryLabel')}
            </label>
            <select
              id="wishlist-filter-category"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={categoryFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setCategoryFilter(event.target.value)}
            >
              <option value="all">{t('filters.categoryAll')}</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-muted-foreground">{t('filters.priceLabel')}</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={t('filters.min')}
                value={minPriceInput}
                onChange={(event) => setMinPriceInput(event.target.value)}
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={t('filters.max')}
                value={maxPriceInput}
                onChange={(event) => setMaxPriceInput(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="wishlist-sort" className="text-sm font-semibold text-muted-foreground">
              {t('filters.sortLabel')}
            </label>
            <select
              id="wishlist-sort"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={sortOption}
              onChange={handleSortChange}
            >
              <option value="date_desc">{t('filters.sortDateDesc')}</option>
              <option value="date_asc">{t('filters.sortDateAsc')}</option>
              <option value="price_desc">{t('filters.sortPriceDesc')}</option>
              <option value="price_asc">{t('filters.sortPriceAsc')}</option>
            </select>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t('summary', { count: items.length, total: totalCount })}
        </p>
        {((isFetching && items.length > 0) || loadingMore) ? (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 animate-ping rounded-full bg-primary/70" aria-hidden="true" />
            {tCommon('loading')}
          </span>
        ) : null}
      </div>

      {listError ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {listError}
        </p>
      ) : null}

      {isFetching && items.length === 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
            <div
              key={`wishlist-skeleton-${index}`}
              className="flex h-full animate-pulse flex-col overflow-hidden rounded-3xl border border-border bg-card shadow"
            >
              <div className="h-48 w-full bg-muted" />
              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-1/3 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">{t('emptyState')}</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const price = formatPrice(item.price_snapshot, locale);
            const isLoading = item.parse_status === 'pending';
            const hasError = item.parse_status === 'failed';

            return (
              <article
                key={item.id}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow transition hover:border-primary/50 hover:shadow-lg"
              >
                <button
                  type="button"
                  className="flex flex-1 flex-col text-left"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="relative h-48 w-full border-b border-border/60 bg-muted">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product_name ?? t('details.fallbackTitle')}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 320px, 100vw"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        {t('cards.noImage')}
                      </div>
                    )}
                    {item.category ? (
                      <span className="absolute left-4 top-4 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                        {item.category}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div className="space-y-2">
                      <h3 className="line-clamp-2 text-base font-semibold text-foreground">
                        {item.product_name ?? t('cards.fallbackTitle')}
                      </h3>
                      <p className="text-xs text-muted-foreground">{getHostname(item.url)}</p>
                    </div>

                    {isLoading ? (
                      <div className="space-y-2">
                        <div className="h-3 w-3/4 animate-pulse rounded-full bg-muted" />
                        <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
                        <p className="text-xs text-muted-foreground">{t('cards.loading')}</p>
                      </div>
                    ) : hasError ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-destructive">{item.parse_error ?? t('cards.error')}</p>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-xs font-semibold text-primary transition hover:text-primary/80"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRetry(item.id);
                          }}
                        >
                          {t('cards.retry')}
                        </button>
                        {item.uiError ? (
                          <p className="text-xs text-destructive/80">{item.uiError}</p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {price ? (
                          <p className="text-lg font-semibold text-foreground">{price}</p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {item.product_brand ?? t('cards.brandFallback')}
                        </p>
                      </div>
                    )}
                  </div>
                </button>

                {hasError ? (
                  <div className="flex items-center justify-between border-t border-border/60 bg-destructive/5 px-5 py-3 text-xs text-destructive">
                    <span>{t('cards.refreshHint')}</span>
                    <button
                      type="button"
                      className="rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold transition hover:bg-destructive/10"
                      onClick={() => void handleRetry(item.id)}
                    >
                      {t('cards.retryShort')}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="rounded-full border border-border px-6 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-70"
            onClick={handleLoadMore}
            disabled={loadingMore || isFetching}
          >
            {loadingMore ? tCommon('loading') : t('actions.loadMore')}
          </button>
        </div>
      ) : null}

      {selectedItem && activeWishlist ? (
        <WishlistItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onItemUpdated={handleItemUpdate}
          onItemDeleted={handleItemDelete}
          onRefreshRequested={handleRefreshRequested}
          locale={locale}
          onShareItem={handleShareItem}
        />
      ) : null}

      {shareState ? (
        <ShareLinkModal
          state={shareState}
          onClose={handleShareClose}
          onRetry={handleShareRetry}
        />
      ) : null}
    </div>
  );
}

