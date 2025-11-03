"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

import type { Wishlist, WishlistItem } from "@/lib/types";

type WishlistDashboardProps = {
  initialWishlist: Wishlist | null;
  allWishlists: Wishlist[];
  initialItems: unknown[];
  initialTotal: number;
  initialHasMore: boolean;
  pageSize: number;
};

type WishlistItemView = WishlistItem;

type PriceSnapshot = {
  amount?: string | number | null;
  currency?: string | null;
};

function normalizePriceInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const sanitized = trimmed.replace(/[^0-9.,-]/g, "").replace(/\s+/g, "");
  if (!sanitized) {
    return null;
  }

  let working = sanitized;
  if (sanitized.includes(",") && sanitized.includes(".")) {
    if (sanitized.lastIndexOf(",") > sanitized.lastIndexOf(".")) {
      working = sanitized.replace(/\./g, "");
    }
  }

  const normalized = working.replace(/,/g, ".");
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed.toFixed(2);
}

function normalizeItem(item: WishlistItem): WishlistItemView {
  return item;
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatPrice(snapshot: WishlistItem["price_snapshot"], locale: string) {
  if (!snapshot) {
    return null;
  }

  const payload = snapshot as PriceSnapshot;
  const amountRaw = payload.amount;
  if (amountRaw == null) {
    return null;
  }

  const numeric = typeof amountRaw === "number" ? amountRaw : Number.parseFloat(amountRaw);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const currency = payload.currency ?? undefined;

  try {
    return new Intl.NumberFormat(locale, {
      style: currency ? "currency" : "decimal",
      currency,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return numeric.toFixed(2);
  }
}

function extractPriceAmount(snapshot: WishlistItem["price_snapshot"]) {
  if (!snapshot) {
    return "";
  }
  const payload = snapshot as PriceSnapshot;
  if (payload.amount == null) {
    return "";
  }
  return typeof payload.amount === "number"
    ? payload.amount.toFixed(2)
    : payload.amount ?? "";
}

function extractCurrency(snapshot: WishlistItem["price_snapshot"], fallback = "PLN") {
  if (!snapshot) {
    return fallback;
  }
  const payload = snapshot as PriceSnapshot;
  return payload.currency ?? fallback;
}

export default function WishlistDashboard({
  initialWishlist,
  allWishlists,
  initialItems,
  pageSize,
}: WishlistDashboardProps) {
  const t = useTranslations("wishlist");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [wishlists, setWishlists] = useState<Wishlist[]>(allWishlists);
  const [activeWishlistId, setActiveWishlistId] = useState<string | null>(initialWishlist?.id ?? null);

  const initialNormalizedItems = useMemo(() => {
    return Array.isArray(initialItems)
      ? (initialItems as WishlistItem[]).map(normalizeItem)
      : [];
  }, [initialItems]);

  const [items, setItems] = useState<WishlistItemView[]>(initialNormalizedItems);
  const [listError, setListError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [formUrl, setFormUrl] = useState("");
  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCurrency, setFormCurrency] = useState("PLN");
  const [formImage, setFormImage] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<WishlistItemView | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [bootstrapLoading, setBootstrapLoading] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const activeWishlist = useMemo(() => {
    return wishlists.find((entry) => entry.id === activeWishlistId) ?? null;
  }, [wishlists, activeWishlistId]);

  const refreshItems = useCallback(async () => {
    if (!activeWishlistId) {
      return;
    }

    setIsRefreshing(true);
    setListError(null);
    try {
      const response = await fetch(
        `/api/v1/wishlists/${activeWishlistId}/items?limit=${pageSize}&offset=0&sort=created_at&direction=desc`,
        {
          method: "GET",
          headers: { "cache-control": "no-store" },
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? t("errors.loadFailed"));
      }

      const payload = (await response.json()) as {
        items?: WishlistItem[] | null;
      };

      const list = Array.isArray(payload.items) ? payload.items.map(normalizeItem) : [];
      setItems(list);
    } catch (error) {
      setListError(error instanceof Error ? error.message : t("errors.loadFailed"));
    } finally {
      setIsRefreshing(false);
    }
  }, [activeWishlistId, pageSize, t]);

  const resetForm = useCallback(() => {
    setEditingItemId(null);
    setEditingItem(null);
    setFormUrl("");
    setFormName("");
    setFormBrand("");
    setFormPrice("");
    setFormCurrency("PLN");
    setFormImage("");
    setFormNotes("");
    setFormError(null);
    setPreviewError(null);
  }, []);

  const ensureDefaultWishlist = useCallback(async () => {
    if (activeWishlistId || bootstrapLoading) {
      return;
    }

    setBootstrapLoading(true);
    try {
      const response = await fetch("/api/v1/wishlists", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: t("defaults.title"),
          description: null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "Nie udało się utworzyć listy życzeń");
      }

      const payload = (await response.json()) as { wishlist: Wishlist };
      setWishlists((prev) => [...prev, payload.wishlist]);
      setActiveWishlistId(payload.wishlist.id);
    } catch (error) {
      console.error("Failed to bootstrap wishlist", error);
      setFormError(t("errors.bootstrapFailed"));
    } finally {
      setBootstrapLoading(false);
    }
  }, [activeWishlistId, bootstrapLoading, t]);

  useEffect(() => {
    if (!initialWishlist) {
      void ensureDefaultWishlist();
    }
  }, [initialWishlist, ensureDefaultWishlist]);

  useEffect(() => {
    setItems(initialNormalizedItems);
  }, [initialNormalizedItems]);

  useEffect(() => {
    if (!activeWishlistId) {
      return;
    }
    void refreshItems();
  }, [activeWishlistId, refreshItems]);

  const handlePreviewMetadata = async () => {
    setPreviewError(null);
    setFormError(null);

    if (!formUrl.trim()) {
      setFormError(t("errors.urlRequired"));
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(formUrl.trim());
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      setFormError(t("errors.invalidUrl"));
      return;
    }

    setPreviewLoading(true);

    try {
      const response = await fetch("/api/v1/wishlist-items/preview", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          url: parsedUrl.toString(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? t("errors.previewFailed"));
      }

      const payload = (await response.json()) as {
        metadata: {
          productName: string | null;
          productBrand: string | null;
          price: string | null;
          currency: string | null;
          imageUrl: string | null;
        };
      };

      const { metadata } = payload;
      if (metadata.productName) {
        setFormName(metadata.productName);
      }
      if (metadata.productBrand) {
        setFormBrand(metadata.productBrand);
      }
      if (metadata.price) {
        setFormPrice(metadata.price);
      }
      if (metadata.currency) {
        setFormCurrency(metadata.currency.toUpperCase());
      }
      if (metadata.imageUrl) {
        setFormImage(metadata.imageUrl);
      }
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : t("errors.previewFailed"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setPreviewError(null);

    const targetWishlistId = activeWishlistId ?? editingItem?.wishlist_id ?? null;
    if (!targetWishlistId) {
      setFormError(t("errors.noWishlist"));
      return;
    }

    if (!formUrl.trim()) {
      setFormError(t("errors.urlRequired"));
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(formUrl.trim());
    } catch {
      setFormError(t("errors.invalidUrl"));
      return;
    }

    const manualName = formName.trim();
    const manualBrand = formBrand.trim();
    const manualImage = formImage.trim();
    const manualPriceRaw = formPrice.trim();
    const manualPriceNormalized = manualPriceRaw ? normalizePriceInput(manualPriceRaw) : null;
    const manualCurrencyRaw = formCurrency.trim().toUpperCase();
    const manualCurrency = manualCurrencyRaw && /^[A-Z]{3}$/.test(manualCurrencyRaw) ? manualCurrencyRaw : "";

    setFormLoading(true);

    try {
      const response = await fetch(`/api/v1/wishlists/${targetWishlistId}/items`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          url: parsedUrl.toString(),
          notes: formNotes.trim() || null,
          productName: manualName || null,
          productBrand: manualBrand || null,
          price: (manualPriceNormalized ?? manualPriceRaw) || null,
          currency: manualCurrency || null,
          imageUrl: manualImage || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? t("errors.addFailed"));
      }

      if (editingItemId) {
        const deleteResponse = await fetch(`/api/v1/wishlist-items/${editingItemId}`, {
          method: "DELETE",
        });

        if (!deleteResponse.ok) {
          const payload = await deleteResponse.json().catch(() => null);
          throw new Error(payload?.message ?? "Nie udało się usunąć produktu z listy");
        }
      }

      resetForm();
      await refreshItems();
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("errors.addFailed"));
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddButtonClick = () => {
    resetForm();
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleEdit = (item: WishlistItemView) => {
    setEditingItemId(item.id);
    setEditingItem(item);
    setFormUrl(item.url);
    setFormName(item.product_name ?? "");
    setFormBrand(item.product_brand ?? "");
    setFormPrice(extractPriceAmount(item.price_snapshot));
    setFormCurrency(extractCurrency(item.price_snapshot));
    setFormImage(item.image_url ?? "");
    setFormNotes(item.notes ?? "");
    setFormError(null);
    setPreviewError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async (item: WishlistItemView) => {
    const confirmed = window.confirm(t("details.confirmDelete"));
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/wishlist-items/${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "Nie udało się usunąć produktu z listy");
      }

      if (editingItemId === item.id) {
        resetForm();
      }

      await refreshItems();
      router.refresh();
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Nie udało się usunąć produktu z listy");
    }
  };

  const isEditing = Boolean(editingItemId);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-70"
            onClick={handleAddButtonClick}
            disabled={formLoading}
          >
            {t("form.submit")}
          </button>
        </div>
      </header>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-3">
            <label htmlFor="wishlist-url" className="text-sm font-semibold text-muted-foreground">
              {t("form.url")}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="wishlist-url"
                type="url"
                required
                className="w-full flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-70"
                value={formUrl}
                onChange={(event) => setFormUrl(event.target.value)}
                placeholder={t("form.urlPlaceholder")}
                disabled={isEditing}
              />
              <button
                type="button"
                className="rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-secondary-foreground shadow transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handlePreviewMetadata}
                disabled={previewLoading || formLoading || !formUrl.trim()}
              >
                {previewLoading ? t("form.previewing") : t("form.preview")}
              </button>
            </div>
            {previewError ? <p className="text-sm text-destructive">{previewError}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="wishlist-name" className="text-sm font-semibold text-muted-foreground">
              {t("form.productName")}
            </label>
            <input
              id="wishlist-name"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              placeholder={t("form.productNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="wishlist-brand" className="text-sm font-semibold text-muted-foreground">
              {t("form.brand")}
            </label>
            <input
              id="wishlist-brand"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={formBrand}
              onChange={(event) => setFormBrand(event.target.value)}
              placeholder={t("form.brandPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="wishlist-price" className="text-sm font-semibold text-muted-foreground">
              {t("form.price")}
            </label>
            <div className="flex gap-2">
              <input
                id="wishlist-price"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={formPrice}
                onChange={(event) => setFormPrice(event.target.value)}
                placeholder={t("form.pricePlaceholder")}
                inputMode="decimal"
                disabled={isEditing}
              />
              <input
                id="wishlist-currency"
                className="w-20 rounded-2xl border border-border bg-background px-3 py-3 text-center text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={formCurrency}
                onChange={(event) =>
                  setFormCurrency(event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))
                }
                placeholder={t("form.currency")}
                disabled={isEditing}
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-3">
            <label htmlFor="wishlist-image" className="text-sm font-semibold text-muted-foreground">
              {t("form.image")}
            </label>
            <input
              id="wishlist-image"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={formImage}
              onChange={(event) => setFormImage(event.target.value)}
              placeholder={t("form.imagePlaceholder")}
              disabled={isEditing}
            />
            {formImage ? (
              <div className="relative mt-2 h-48 w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
                <Image src={formImage} alt={formName || t("cards.noImage")} fill className="object-cover" unoptimized />
              </div>
            ) : null}
          </div>

          <div className="space-y-2 md:col-span-3">
            <label htmlFor="wishlist-notes" className="text-sm font-semibold text-muted-foreground">
              {t("form.notes")}
            </label>
            <textarea
              id="wishlist-notes"
              className="h-28 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={formNotes}
              onChange={(event) => setFormNotes(event.target.value)}
              placeholder={t("form.notesPlaceholder")}
              maxLength={2000}
            />
          </div>
        </div>

        {formError ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-70"
            onClick={resetForm}
            disabled={formLoading}
          >
            {tCommon("clear")}
          </button>
          <div className="flex gap-2">
            {isEditing ? (
              <button
                type="button"
                className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-70"
                onClick={resetForm}
                disabled={formLoading}
              >
                {tCommon("cancel")}
              </button>
            ) : null}
            <button
              type="submit"
              className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={formLoading || bootstrapLoading}
            >
              {formLoading ? t("form.saving") : isEditing ? tCommon("save") : t("form.submit")}
            </button>
          </div>
        </div>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {t("summary", { count: items.length, total: items.length })}
          </h2>
          {isRefreshing ? (
            <span className="text-xs text-muted-foreground">{tCommon("loading")}</span>
          ) : null}
        </div>

        {listError ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {listError}
          </p>
        ) : null}

        {items.length === 0 && !isRefreshing ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
            {t("emptyState")}
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const priceLabel = formatPrice(item.price_snapshot, locale);
              return (
                <article
                  key={item.id}
                  className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow transition hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="relative h-48 w-full border-b border-border/60 bg-muted">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product_name ?? t("cards.fallbackTitle")}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 320px, 100vw"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        {t("cards.noImage")}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div className="space-y-2">
                      <h3 className="line-clamp-2 text-base font-semibold text-foreground">
                        {item.product_name ?? t("cards.fallbackTitle")}
                      </h3>
                      <p className="text-xs text-muted-foreground">{getHostname(item.url)}</p>
                    </div>

                    <div className="space-y-1 text-sm">
                      {priceLabel ? <p className="font-semibold text-foreground">{priceLabel}</p> : null}
                      <p className="text-muted-foreground">
                        {item.product_brand ?? t("cards.brandFallback")}
                      </p>
                    </div>

                    {item.notes ? (
                      <p className="rounded-2xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        {item.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-5 py-3">
                    <button
                      type="button"
                      className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
                      onClick={() => handleEdit(item)}
                    >
                      Edytuj
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-destructive/30 px-4 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
                      onClick={() => handleDelete(item)}
                    >
                      Usuń
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
