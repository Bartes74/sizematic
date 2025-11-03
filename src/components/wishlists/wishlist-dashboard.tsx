"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { Wishlist } from "@/lib/types";

type WishlistDashboardProps = {
  initialWishlist: Wishlist | null;
  allWishlists: Wishlist[];
  initialItems: unknown[];
  initialTotal: number;
  initialHasMore: boolean;
  pageSize: number;
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

export default function WishlistDashboard({ initialWishlist, allWishlists }: WishlistDashboardProps) {
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
      const response = await fetch(`/api/v1/wishlists/${activeWishlist.id}/items`, {
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

      setFormUrl("");
      setFormName("");
      setFormBrand("");
      setFormPrice("");
      setFormCurrency("PLN");
      setFormImage("");
      setFormNotes("");
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("errors.addFailed"));
    } finally {
      setFormLoading(false);
    }
  };

  const handleClear = () => {
    setFormUrl("");
    setFormName("");
    setFormBrand("");
    setFormPrice("");
    setFormCurrency("PLN");
    setFormImage("");
    setFormNotes("");
    setFormError(null);
    setPreviewError(null);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

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
                className="w-full flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={formUrl}
                onChange={(event) => setFormUrl(event.target.value)}
                placeholder={t("form.urlPlaceholder")}
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
              />
              <input
                id="wishlist-currency"
                className="w-20 rounded-2xl border border-border bg-background px-3 py-3 text-center text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={formCurrency}
                onChange={(event) =>
                  setFormCurrency(event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))
                }
                placeholder={t("form.currency")}
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
            disabled={formLoading}
          >
            {tCommon("clear")}
          </button>
          <button
            type="submit"
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={formLoading || bootstrapLoading}
          >
            {formLoading ? t("form.saving") : t("form.submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
