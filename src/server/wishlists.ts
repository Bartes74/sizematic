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

export function slugifyTitle(title: string) {
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

  try {
    const metadata = await fetchProductMetadata(url);
    const normalizedBrand = metadata.brand?.trim() || null;

    const sizeMatch = normalizedBrand
      ? await resolveBrandSizeMatch(supabase, {
          profileId: ownerProfileId,
          brandName: normalizedBrand,
        })
      : { matchedSize: null, confidence: "missing" as SizeMatchConfidence };

    const updatePayload: Partial<WishlistItem> & {
      parse_status: ItemParseStatus;
      parsed_at: string;
    } = {
      product_name: metadata.name?.trim() || null,
      product_brand: normalizedBrand,
      image_url: metadata.image ?? null,
      parse_status: "success",
      parse_error: null,
      parsed_at: now,
      matched_size: sizeMatch.matchedSize,
      size_confidence: sizeMatch.confidence,
      price_snapshot: buildPriceSnapshot(metadata),
    };

    await supabase
      .from("wishlist_items")
      .update(updatePayload)
      .eq("id", itemId);

    await logWishlistEvent({
      profileId: ownerProfileId,
      wishlistId,
      wishlistItemId: itemId,
      eventType: "wishlist_metadata_success",
      source: "owner",
      metadata: {
        requestUrl: url,
        productName: updatePayload.product_name,
        priceSnapshot: updatePayload.price_snapshot,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/wishlists");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nie udało się pobrać danych produktu";

    await supabase
      .from("wishlist_items")
      .update({
        parse_status: "failed",
        parse_error: message,
        parsed_at: now,
        size_confidence: "missing",
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

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/wishlists");
  }
}

function buildPriceSnapshot(metadata: ProductMetadata) {
  if (!metadata.price) {
    return null;
  }

  return {
    amount: metadata.price,
    currency: metadata.currency ?? null,
    extracted_at: new Date().toISOString(),
  };
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

function extractMetadataFromHtml(html: string, url: string): ProductMetadata {
  const ogTitle = matchMeta(html, "property", "og:title");
  const ogImage = matchMeta(html, "property", "og:image");
  const productBrand =
    matchMeta(html, "property", "product:brand") ?? matchMeta(html, "name", "brand");
  const price = matchMeta(html, "property", "product:price:amount");
  const currency =
    matchMeta(html, "property", "product:price:currency") ??
    matchMeta(html, "property", "product:price:currency_iso") ??
    matchMeta(html, "itemprop", "priceCurrency");

  const titleTag = matchTitle(html);

  const jsonLdMetadata = extractJsonLdProduct(html);

  return {
    name: jsonLdMetadata?.name ?? ogTitle ?? titleTag ?? undefined,
    brand:
      jsonLdMetadata?.brand ??
      productBrand ??
      jsonLdMetadata?.offers?.brand ??
      fallbackBrandFromUrl(url) ??
      undefined,
    image: jsonLdMetadata?.image ?? ogImage ?? undefined,
    price: jsonLdMetadata?.offers?.price ?? price ?? undefined,
    currency: jsonLdMetadata?.offers?.priceCurrency ?? currency ?? undefined,
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
      const items = Array.isArray(payload) ? payload : [payload];

      for (const item of items) {
        if (!item || typeof item !== "object") {
          continue;
        }

        if (item["@type"] === "Product" || item["@type"]?.includes("Product")) {
          return normalizeJsonLd(item);
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
  const offersValue = Array.isArray(offersRaw) ? offersRaw[0] : offersRaw;
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
          price: normalizeOfferPrice(offers?.price),
          priceCurrency:
            typeof offers?.priceCurrency === "string" ? offers.priceCurrency : undefined,
          brand: normalizeOfferBrand(offers?.brand),
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

function fallbackBrandFromUrl(url: string) {
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
