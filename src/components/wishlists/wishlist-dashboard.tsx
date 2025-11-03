"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { Wishlist, WishlistItem } from "@/lib/types";

type WishlistDashboardProps = {
  initialWishlist: Wishlist | null;
  allWishlists: Wishlist[];
  initialItems?: unknown[];
  initialTotal?: number;
  initialHasMore?: boolean;
  pageSize?: number;
  editItem?: WishlistItem | null;
  editItemId?: string | null;
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

type PriceSnapshot = {
  amount?: string | number | null;
  currency?: string | null;
};

function extractPriceAmount(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") {
    return "";
  }

  const payload = snapshot as PriceSnapshot;
  if (payload.amount == null) {
    return "";
  }

  if (typeof payload.amount === "number") {
    return Number.isFinite(payload.amount) ? payload.amount.toFixed(2) : "";
  }

  return String(payload.amount);
}

function extractCurrency(snapshot: unknown, fallback = "PLN") {
  if (!snapshot || typeof snapshot !== "object") {
    return fallback;
  }

  const payload = snapshot as PriceSnapshot;
  if (!payload.currency || typeof payload.currency !== "string") {
    return fallback;
  }

  return payload.currency.toUpperCase();
}

export default function WishlistDashboard({
  initialWishlist,
  allWishlists,
  editItem,
  editItemId,
}: WishlistDashboardProps) {
  const t = useTranslations("wishlist");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [wishlists, setWishlists] = useState<Wishlist[]>(allWishlists);
  const [activeWishlistId, setActiveWishlistId] = useState<string | null>(initialWishlist?.id ?? null);

  const [formUrl, setFormUrl] = useState("");
  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCurrency, setFormCurrency] = useState("PLN");
  const [formImage, setFormImage] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(() => editItem?.id ?? editItemId ?? null);
  const [isLoadingEditItem, setIsLoadingEditItem] = useState(false);
  const lastPrefilledEditItemIdRef = useRef<string | null>(null);
  const pendingEditFetchRef = useRef<string | null>(null);
  const suppressPrefillRef = useRef(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [bootstrapLoading, setBootstrapLoading] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const activeWishlist = useMemo(() => {
    return wishlists.find((entry) => entry.id === activeWishlistId) ?? null;
  }, [wishlists, activeWishlistId]);

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

  const applyEditPrefill = useCallback(
    (item: WishlistItem) => {
      if (!initialWishlist || item.wishlist_id !== initialWishlist.id) {
        setFormError(t("errors.noWishlist"));
        return;
      }

      lastPrefilledEditItemIdRef.current = item.id;
      setActiveWishlistId((current) => (current === item.wishlist_id ? current : item.wishlist_id));
      setEditingItemId(item.id);
      setFormUrl(item.url ?? "");
      setFormName(item.product_name ?? "");
      setFormBrand(item.product_brand ?? "");
      setFormNotes(item.notes ?? "");
      setFormPrice(extractPriceAmount(item.price_snapshot));
      setFormCurrency(extractCurrency(item.price_snapshot));
      setFormImage(item.image_url ?? "");
      setFormError(null);
      setPreviewError(null);
      setIsLoadingEditItem(false);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [initialWishlist, setActiveWishlistId, t]
  );

  useEffect(() => {
    if (suppressPrefillRef.current) {
      if (!editItem && !editItemId) {
        suppressPrefillRef.current = false;
      }
      return;
    }

    if (editItem && editItem.id !== lastPrefilledEditItemIdRef.current) {
      applyEditPrefill(editItem);
      return;
    }

    if (
      !editItem &&
      editItemId &&
      editItemId !== lastPrefilledEditItemIdRef.current &&
      pendingEditFetchRef.current !== editItemId
    ) {
      const targetEditId = editItemId;
      pendingEditFetchRef.current = targetEditId;
      setIsLoadingEditItem(true);
      setFormError(null);
      setPreviewError(null);

      void fetch(`/api/v1/wishlist-items/${targetEditId}`, {
        method: "GET",
        headers: {
          "cache-control": "no-store",
        },
        credentials: "include",
      })
        .then(async (response) => {
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            const message = payload?.message ?? t("errors.loadFailed");
            setFormError(message);
            return;
          }

          const payload = (await response.json()) as { item?: WishlistItem };
          if (payload?.item) {
            applyEditPrefill(payload.item);
          } else {
            setFormError(t("errors.loadFailed"));
          }
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : t("errors.loadFailed");
          setFormError(message);
        })
        .finally(() => {
          setIsLoadingEditItem(false);
          if (pendingEditFetchRef.current === targetEditId) {
            pendingEditFetchRef.current = null;
          }
          if (!lastPrefilledEditItemIdRef.current) {
            lastPrefilledEditItemIdRef.current = targetEditId;
          }
        });
    }
  }, [applyEditPrefill, editItem, editItemId, t]);

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

    if (!activeWishlist) {
      setFormError(t("errors.noWishlist"));
      return;
    }

    const isEditing = Boolean(editingItemId);

    if (isLoadingEditItem) {
      return;
    }

    if (!formUrl.trim() && !isEditing) {
      setFormError(t("errors.urlRequired"));
      return;
    }

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(formUrl.trim());
    } catch {
      if (!isEditing) {
        setFormError(t("errors.invalidUrl"));
        return;
      }
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
      if (isEditing && editingItemId) {
        const payload: Record<string, unknown> = {
          product_name: manualName || null,
          product_brand: manualBrand || null,
          notes: formNotes.trim() || null,
        };

        const response = await fetch(`/api/v1/wishlist-items/${editingItemId}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const payloadData = await response.json().catch(() => null);
          throw new Error(payloadData?.message ?? t("errors.addFailed"));
        }

        handleClear();
        router.refresh();
      } else {
        const response = await fetch(`/api/v1/wishlists/${activeWishlist.id}/items`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            url: (parsedUrl ? parsedUrl.toString() : formUrl.trim()),
            notes: formNotes.trim() || null,
            productName: manualName || null,
            productBrand: manualBrand || null,
            price: (manualPriceNormalized ?? manualPriceRaw) || null,
            currency: manualCurrency || null,
            imageUrl: manualImage || null,
          }),
        });

        if (!response.ok) {
          const payloadData = await response.json().catch(() => null);
          throw new Error(payloadData?.message ?? t("errors.addFailed"));
        }

        handleClear();
        router.refresh();
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("errors.addFailed"));
    } finally {
      setFormLoading(false);
    }
  };

  const handleClear = useCallback(() => {
    const wasEditing = Boolean(editingItemId);
    suppressPrefillRef.current = true;
    lastPrefilledEditItemIdRef.current = null;
    pendingEditFetchRef.current = null;
    setIsLoadingEditItem(false);
    setFormUrl("");
    setFormName("");
    setFormBrand("");
    setFormPrice("");
    setFormCurrency("PLN");
    setFormImage("");
    setFormNotes("");
    setEditingItemId(null);
    setFormError(null);
    setPreviewError(null);
    if (wasEditing) {
      router.replace("/dashboard/wishlists");
    }
  }, [editingItemId, router]);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow">
        {isLoadingEditItem ? (
          <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-2 text-sm text-muted-foreground">
            {tCommon("loading")}
          </div>
        ) : null}
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
                className="w-full flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={formUrl}
                onChange={(event) => setFormUrl(event.target.value)}
                placeholder={t("form.urlPlaceholder")}
                disabled={Boolean(editingItemId)}
              />
              <button
                type="button"
                className="rounded-full bg-secondary px-5 py-2 text-sm font-semibold text-secondary-foreground shadow transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handlePreviewMetadata}
                disabled={Boolean(editingItemId) || previewLoading || formLoading || isLoadingEditItem || !formUrl.trim()}
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
                disabled={Boolean(editingItemId)}
              />
              <input
                id="wishlist-currency"
                className="w-20 rounded-2xl border border-border bg-background px-3 py-3 text-center text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={formCurrency}
                onChange={(event) =>
                  setFormCurrency(event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))
                }
                placeholder={t("form.currency")}
                disabled={Boolean(editingItemId)}
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
              disabled={Boolean(editingItemId)}
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

        <div className="flex items-center justify-between">
          <button
            type="button"
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
            onClick={handleClear}
            disabled={formLoading || isLoadingEditItem}
          >
            {tCommon("clear")}
          </button>
          <button
            type="submit"
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={formLoading || bootstrapLoading || isLoadingEditItem}
          >
            {formLoading ? t("form.saving") : editingItemId ? tCommon("save") : t("form.submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
