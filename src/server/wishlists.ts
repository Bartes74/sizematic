import "server-only";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase";
import { logWishlistEvent } from "@/server/wishlist-events";
import type {
  ItemParseStatus,
  SizeMatchConfidence,
  WishlistItem,
} from "@/lib/types";

type ProductMetadata = {
  name?: string;
  brand?: string;
  image?: string;
  price?: string;
  currency?: string;
};

const HTML_SAMPLE_LIMIT = 200_000; // Safety cap to avoid huge payloads

export async function slugifyTitle(title: string) {
  return title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function enrichWishlistItemFromUrl(params: {
  itemId: string;
  wishlistId: string;
  url: string;
  ownerProfileId: string;
}) {
  const { itemId, url, ownerProfileId, wishlistId } = params;
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("wishlist_items")
    .select(
      "product_name, product_brand, image_url, price_snapshot, parse_status, matched_size, size_confidence"
    )
    .eq("id", itemId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Nie udało się pobrać aktualnych danych elementu listy: ${existingError.message}`);
  }

  try {
    const metadata = await fetchProductMetadata(url);
    const normalizedName = metadata.name?.trim() || null;
    const normalizedBrand = metadata.brand?.trim() || null;
    const normalizedImage = metadata.image?.trim() || null;
    const priceSnapshot = buildPriceSnapshot(metadata);

    const updatePayload: Partial<WishlistItem> & {
      parse_status: ItemParseStatus;
      parsed_at: string;
    } = {
      parse_status: "success",
      parse_error: null,
      parsed_at: now,
    };

    let shouldResolveBrandMatch = false;

    if (!existing?.product_name && normalizedName) {
      updatePayload.product_name = normalizedName;
    }

    if (!existing?.product_brand && normalizedBrand) {
      updatePayload.product_brand = normalizedBrand;
      shouldResolveBrandMatch = true;
    }

    if (!existing?.image_url && normalizedImage) {
      updatePayload.image_url = normalizedImage;
    }

    if (!existing?.price_snapshot && priceSnapshot) {
      updatePayload.price_snapshot = priceSnapshot;
    }

    if (shouldResolveBrandMatch) {
      const sizeMatch = await resolveBrandSizeMatch(supabase, {
        profileId: ownerProfileId,
        brandName: normalizedBrand!,
      });

      updatePayload.matched_size = sizeMatch.matchedSize;
      updatePayload.size_confidence = sizeMatch.confidence;
    }

    await supabase.from("wishlist_items").update(updatePayload).eq("id", itemId);

    await logWishlistEvent({
      profileId: ownerProfileId,
      wishlistId,
      wishlistItemId: itemId,
      eventType: "wishlist_metadata_success",
      source: "owner",
      metadata: {
        requestUrl: url,
        productName: updatePayload.product_name ?? existing?.product_name ?? null,
        priceSnapshot: updatePayload.price_snapshot ?? existing?.price_snapshot ?? null,
      },
    });

    await revalidatePath("/dashboard");
    await revalidatePath("/dashboard/wishlists");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nie udało się pobrać danych produktu";
    const nextStatus = existing?.parse_status === "success" ? "success" : "failed";

    await supabase
      .from("wishlist_items")
      .update({
        parse_status: nextStatus,
        parse_error: nextStatus === "failed" ? message : existing?.parse_error ?? message,
        parsed_at: now,
        size_confidence:
          nextStatus === "failed" ? "missing" : existing?.size_confidence ?? "missing",
      })
      .eq("id", itemId);

    await logWishlistEvent({
      profileId: ownerProfileId,
      wishlistId,
      wishlistItemId: itemId,
      eventType: "wishlist_metadata_failed",
      source: "owner",
      metadata: {
        requestUrl: url,
        error: message,
      },
    });

    await revalidatePath("/dashboard");
    await revalidatePath("/dashboard/wishlists");
  }
}

function buildPriceSnapshot(metadata: ProductMetadata) {
  const normalizedAmount = normalizePriceValue(metadata.price);

  if (!normalizedAmount) {
    return null;
  }

  return {
    amount: normalizedAmount,
    currency: metadata.currency ?? null,
    extracted_at: new Date().toISOString(),
  };
}

function normalizePriceValue(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.toString().replace(/[^0-9.,]/g, "").trim();
  if (!trimmed) {
    return null;
  }

  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");
  let sanitized = trimmed;

  if (hasComma && hasDot) {
    if (trimmed.lastIndexOf(",") > trimmed.lastIndexOf(".")) {
      sanitized = trimmed.replace(/\./g, "");
    }
  }

  const normalized = sanitized.replace(/,/g, ".");
  const numeric = Number.parseFloat(normalized);

  if (!Number.isFinite(numeric)) {
    return trimmed;
  }

  return numeric.toFixed(2);
}

async function fetchProductMetadata(url: string): Promise<ProductMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; SizeHubBot/0.1; +https://sizehub.app/bot)",
        accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Serwer zwrócił status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error("Adres URL nie zawiera dokumentu HTML.");
    }

    const html = (await response.text()).slice(0, HTML_SAMPLE_LIMIT);
    return extractMetadataFromHtml(html, url);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Limit czasu podczas pobierania strony produktu.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getWishlistMetadataPreview(url: string) {
  const metadata = await fetchProductMetadata(url);
  const normalizedPrice = normalizePriceValue(metadata.price);

  return {
    productName: metadata.name ?? null,
    productBrand: metadata.brand ?? fallbackBrandFromUrl(url) ?? null,
    imageUrl: metadata.image ?? null,
    price: normalizedPrice ?? metadata.price ?? null,
    currency: metadata.currency ?? null,
  } as const;
}

function extractMetadataFromHtml(html: string, url: string): ProductMetadata {
  const ogTitle = matchMeta(html, "property", "og:title");
  const ogImage =
    matchMeta(html, "property", "og:image:secure_url") ??
    matchMeta(html, "property", "og:image") ??
    matchMeta(html, "name", "twitter:image") ??
    matchMeta(html, "name", "twitter:image:src");
  const productBrand =
    matchMeta(html, "property", "product:brand") ??
    matchMeta(html, "name", "brand") ??
    matchMeta(html, "itemprop", "brand");
  const priceMeta =
    matchMeta(html, "property", "product:price:amount") ??
    matchMeta(html, "name", "twitter:data1");
  const priceItemProp = matchMeta(html, "itemprop", "price");
  const currencyMeta =
    matchMeta(html, "property", "product:price:currency") ??
    matchMeta(html, "property", "product:price:currency_iso") ??
    matchMeta(html, "name", "twitter:data2");
  const currencyItemProp = matchMeta(html, "itemprop", "priceCurrency");

  const titleTag = matchTitle(html);

  const jsonLdMetadata = extractJsonLdProduct(html);
  const fallbackPrice = fallbackPriceFromHtml(html) ?? priceItemProp ?? priceMeta;
  const fallbackCurrency =
    fallbackCurrencyFromHtml(html) ?? currencyItemProp ?? currencyMeta ?? undefined;

  return {
    name: jsonLdMetadata?.name ?? ogTitle ?? titleTag ?? undefined,
    brand:
      jsonLdMetadata?.brand ??
      productBrand ??
      jsonLdMetadata?.offers?.brand ??
      fallbackBrandFromUrl(url) ??
      undefined,
    image: jsonLdMetadata?.image ?? ogImage ?? undefined,
    price: jsonLdMetadata?.offers?.price ?? fallbackPrice ?? undefined,
    currency: jsonLdMetadata?.offers?.priceCurrency ?? fallbackCurrency ?? undefined,
  };
}

function matchMeta(html: string, attr: "property" | "name" | "itemprop", value: string) {
  const regex = new RegExp(
    `<meta[^>]+${attr}\\s*=\\s*["']${escapeRegex(value)}["'][^>]*content\\s*=\\s*["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(regex);
  return match ? decodeHtml(match[1]) : null;
}

function matchTitle(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? decodeHtml(match[1]) : null;
}

function fallbackPriceFromHtml(html: string) {
  const jsonMatch = html.match(/"price"\s*:\s*"?([0-9]+(?:[.,][0-9]{1,2})?)/i);
  if (jsonMatch) {
    return jsonMatch[1];
  }

  const dataAttrMatch = html.match(/data-price\s*=\s*"([0-9]+(?:[.,][0-9]{1,2})?)"/i);
  if (dataAttrMatch) {
    return dataAttrMatch[1];
  }

  const schemaMatch = html.match(/"price"\s*:\s*{[^}]*"value"\s*:\s*"?([0-9]+(?:[.,][0-9]{1,2})?)/i);
  if (schemaMatch) {
    return schemaMatch[1];
  }

  return null;
}

function fallbackCurrencyFromHtml(html: string) {
  const jsonMatch = html.match(/"priceCurrency"\s*:\s*"([A-Z]{3})"/i);
  if (jsonMatch) {
    return jsonMatch[1];
  }

  const dataAttrMatch = html.match(/data-currency\s*=\s*"([A-Z]{3})"/i);
  if (dataAttrMatch) {
    return dataAttrMatch[1];
  }

  if (/\bzł\b/i.test(html)) {
    return "PLN";
  }

  return null;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function extractJsonLdProduct(html: string) {
  const scriptRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const payload = JSON.parse(match[1].trim());
      const queue: unknown[] = [];
      const enqueue = (value: unknown) => {
        if (Array.isArray(value)) {
          for (const nested of value) {
            enqueue(nested);
          }
          return;
        }
        queue.push(value);
      };

      enqueue(payload);

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || typeof current !== "object") {
          continue;
        }

        const record = current as Record<string, unknown>;
        const typeValue = record["@type"];

        if (typeof typeValue === "string" && typeValue.includes("Product")) {
          return normalizeJsonLd(record);
        }

        if (Array.isArray(typeValue)) {
          const hasProduct = typeValue.some((value) =>
            typeof value === "string" ? value.includes("Product") : false
          );
          if (hasProduct) {
            return normalizeJsonLd(record);
          }
        }

        if (Array.isArray(record["@graph"])) {
          enqueue(record["@graph"]);
        }

        if (record.itemListElement) {
          enqueue(record.itemListElement);
        }

        if (record["@graph"] && typeof record["@graph"] === "object") {
          enqueue(record["@graph"]);
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  }

  return null;
}

function normalizeJsonLd(payload: unknown): {
  name?: string;
  brand?: string;
  image?: string;
  offers?: { price?: string; priceCurrency?: string; brand?: string };
} | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const offersRaw = record.offers;
  const offersCandidates = Array.isArray(offersRaw) ? offersRaw : [offersRaw];
  const offersValue = offersCandidates.find(
    (candidate) => candidate && typeof candidate === "object"
  );
  const offers =
    offersValue && typeof offersValue === "object"
      ? (offersValue as Record<string, unknown>)
      : undefined;
  const brandValue = record.brand;
  const brand =
    typeof brandValue === "string"
      ? brandValue
      : typeof brandValue === "object" && brandValue !== null && "name" in brandValue
      ? String((brandValue as Record<string, unknown>).name)
      : undefined;

  const priceSpecRaw = offers?.priceSpecification;
  const priceSpecCandidate = Array.isArray(priceSpecRaw) ? priceSpecRaw[0] : priceSpecRaw;
  const priceSpec =
    priceSpecCandidate && typeof priceSpecCandidate === "object"
      ? (priceSpecCandidate as Record<string, unknown>)
      : undefined;

  const sellerValue = offers?.seller;

  return {
    name: typeof record.name === "string" ? record.name : undefined,
    brand,
    image:
      typeof record.image === "string"
        ? record.image
        : Array.isArray(record.image)
        ? (record.image[0] as string | undefined)
        : undefined,
    offers: offers
      ? {
          price:
            normalizeOfferPrice(offers?.price) ??
            normalizeOfferPrice(priceSpec?.price) ??
            normalizeOfferPrice(priceSpec?.priceAmount) ??
            normalizeOfferPrice(offers?.lowPrice) ??
            normalizeOfferPrice(offers?.highPrice),
          priceCurrency:
            normalizeOfferCurrency(offers?.priceCurrency) ??
            normalizeOfferCurrency(priceSpec?.priceCurrency),
          brand:
            normalizeOfferBrand(offers?.brand) ??
            normalizeOfferBrand(priceSpec?.brand) ??
            normalizeOfferSeller(sellerValue),
        }
      : undefined,
  };
}

function normalizeOfferPrice(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value.toString();
  }
  return undefined;
}

function normalizeOfferBrand(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "name" in value) {
    const name = (value as Record<string, unknown>).name;
    return typeof name === "string" ? name : undefined;
  }
  return undefined;
}

function normalizeOfferCurrency(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === "string");
    return typeof first === "string" ? first : undefined;
  }
  if (value && typeof value === "object" && "@value" in value) {
    const raw = (value as Record<string, unknown>)["@value"];
    return typeof raw === "string" ? raw : undefined;
  }
  return undefined;
}

function normalizeOfferSeller(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const normalized = normalizeOfferSeller(entry);
      if (normalized) {
        return normalized;
      }
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.name === "string") {
    return record.name;
  }

  if (record.brand) {
    return normalizeOfferBrand(record.brand);
  }

  return undefined;
}

export function fallbackBrandFromUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    const withoutWww = host.replace(/^www\./, "");
    const segment = withoutWww.split(".")[0];
    if (!segment) {
      return null;
    }
    return capitalize(segment);
  } catch {
    return null;
  }
}

function capitalize(value: string) {
  if (!value) {
    return '';
  }
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

async function resolveBrandSizeMatch(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  params: {
    profileId: string;
    brandName: string;
  }
) {
  const { data, error } = await supabase
    .from("brand_size_profiles")
    .select("preferred_size, brand_name")
    .eq("profile_id", params.profileId)
    .ilike("brand_name", params.brandName)
    .maybeSingle();

  if (error) {
    throw new Error(`Nie udało się dopasować rozmiaru: ${error.message}`);
  }

  if (!data) {
    return { matchedSize: null, confidence: "missing" as SizeMatchConfidence };
  }

  return {
    matchedSize: data.preferred_size as string,
    confidence: "exact" as SizeMatchConfidence,
  };
}
