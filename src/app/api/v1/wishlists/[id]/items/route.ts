import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/server/profiles";
import { logWishlistEvent } from "@/server/wishlist-events";
import { enrichWishlistItemFromUrl } from "@/server/wishlists";

const MAX_PAGE_SIZE = 60;
const DEFAULT_PAGE_SIZE = 12;

type CreateItemPayload = {
  url: string;
  notes?: string | null;
  productName?: string | null;
  productBrand?: string | null;
  price?: string | number | null;
  currency?: string | null;
  imageUrl?: string | null;
};

const MAX_URL_LENGTH = 2048;
const MAX_NOTES_LENGTH = 2000;
const MAX_TEXT_FIELD_LENGTH = 300;
const MAX_IMAGE_URL_LENGTH = 2048;

function isLocalAddress(hostname: string) {
  if (!hostname) {
    return false;
  }

  const lowered = hostname.toLowerCase();

  if (lowered === "localhost" || lowered === "127.0.0.1" || lowered === "[::1]" || lowered === "::1") {
    return true;
  }

  if (lowered.endsWith(".local")) {
    return true;
  }

  const ipv4Match = lowered.match(/^(\d{1,3})(?:\.(\d{1,3})){3}$/);
  if (ipv4Match) {
    const octets = lowered.split(".").map(Number);
    const [a, b] = octets;

    if (a === 10 || a === 127) {
      return true;
    }

    if (a === 192 && b === 168) {
      return true;
    }

    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }

    if (a === 169 && b === 254) {
      return true;
    }
  }

  const ipv6LocalPatterns = ["fc", "fd", "fe80", "::1"];
  for (const prefix of ipv6LocalPatterns) {
    if (lowered.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

export async function POST(request: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  const wishlistId = params.id;

  try {
    const { url, notes, productName, productBrand, price, currency, imageUrl } =
      (await request.json()) as CreateItemPayload;

    if (!url) {
      return NextResponse.json({ message: "Adres URL jest wymagany" }, { status: 400 });
    }

    if (url.length > MAX_URL_LENGTH) {
      return NextResponse.json({ message: "Adres URL jest zbyt długi" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ message: "Podany URL jest nieprawidłowy" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { message: "Obsługiwane są tylko linki HTTP/HTTPS" },
        { status: 400 }
      );
    }

    if (isLocalAddress(parsedUrl.hostname)) {
      return NextResponse.json(
        { message: "Nieobsługiwany adres hosta" },
        { status: 400 }
      );
    }

    const normalizedNotes = typeof notes === "string" ? notes.trim() : null;
    const normalizedName = typeof productName === "string" ? productName.trim() : null;
    const normalizedBrand = typeof productBrand === "string" ? productBrand.trim() : null;
    let normalizedImageUrl: string | null = null;
    const normalizedCurrency = normalizeCurrency(currency);
    const manualPriceAmount = normalizeManualPrice(price);
    const safeCurrency = normalizedCurrency && normalizedCurrency !== "INVALID" ? normalizedCurrency : null;

    if (normalizedName && normalizedName.length > MAX_TEXT_FIELD_LENGTH) {
      return NextResponse.json(
        { message: "Nazwa produktu jest zbyt długa" },
        { status: 400 }
      );
    }

    if (normalizedBrand && normalizedBrand.length > MAX_TEXT_FIELD_LENGTH) {
      return NextResponse.json(
        { message: "Nazwa sklepu lub marki jest zbyt długa" },
        { status: 400 }
      );
    }

    if (normalizedNotes && normalizedNotes.length > MAX_NOTES_LENGTH) {
      return NextResponse.json(
        { message: "Notatki mogą mieć maksymalnie 2000 znaków" },
        { status: 400 }
      );
    }

    if (typeof imageUrl === "string") {
      const trimmed = imageUrl.trim();
      if (trimmed) {
        if (trimmed.length > MAX_IMAGE_URL_LENGTH) {
          return NextResponse.json(
            { message: "Adres zdjęcia jest zbyt długi" },
            { status: 400 }
          );
        }

        try {
          const parsedImageUrl = new URL(trimmed, parsedUrl);
          if (!['http:', 'https:'].includes(parsedImageUrl.protocol)) {
            throw new Error("Nieobsługiwany protokół obrazu");
          }
          normalizedImageUrl = parsedImageUrl.toString();
        } catch {
          return NextResponse.json(
            { message: "Adres zdjęcia jest nieprawidłowy" },
            { status: 400 }
          );
        }
      }
    }

    if (normalizedCurrency === "INVALID") {
      return NextResponse.json(
        { message: "Waluta musi składać się z trzech liter" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const adminClient = createSupabaseAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
    }

    const { data: wishlist, error: wishlistError } = await adminClient
      .from("wishlists")
      .select("*")
      .eq("id", wishlistId)
      .maybeSingle();

    if (wishlistError) {
      throw new Error(wishlistError.message);
    }

    if (!wishlist || wishlist.owner_id !== user.id) {
      return NextResponse.json(
        { message: "Możesz dodawać produkty tylko do własnych list" },
        { status: 403 }
      );
    }

    const profile = await getProfileForUser(adminClient, user.id);

    const manualMetadataProvided = Boolean(
      normalizedName || normalizedBrand || manualPriceAmount || normalizedImageUrl
    );
    const hasManualCoreMetadata = Boolean(
      normalizedName && normalizedBrand && manualPriceAmount && normalizedImageUrl
    );

    const initialParseStatus = hasManualCoreMetadata ? "success" : "pending";
    const manualPriceSnapshot = manualPriceAmount
      ? {
          amount: manualPriceAmount,
          currency: safeCurrency,
          extracted_at: new Date().toISOString(),
        }
      : null;

    const { data: inserted, error: insertError } = await adminClient
      .from("wishlist_items")
      .insert({
        wishlist_id: wishlistId,
        url: parsedUrl.toString(),
        notes: normalizedNotes,
        product_name: normalizedName,
        product_brand: normalizedBrand,
        image_url: normalizedImageUrl,
        price_snapshot: manualPriceSnapshot,
        parse_status: initialParseStatus,
        parse_error: null,
        parsed_at: initialParseStatus === "success" ? new Date().toISOString() : null,
        size_confidence: manualMetadataProvided ? "manual" : "missing",
      })
      .select("*")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    await logWishlistEvent({
      profileId: wishlist.owner_profile_id ?? profile.id,
      wishlistId,
      wishlistItemId: inserted.id,
      eventType: "wishlist_item_added",
      source: "owner",
      metadata: {
        url: parsedUrl.toString(),
        productName: normalizedName,
        productBrand: normalizedBrand,
        priceSnapshot: manualPriceSnapshot,
      },
    });

    await revalidatePath("/dashboard");
    await revalidatePath("/dashboard/wishlists");

    if (initialParseStatus === "pending") {
      void enrichWishlistItemFromUrl({
        itemId: inserted.id,
        wishlistId,
        url: parsedUrl.toString(),
        ownerProfileId: wishlist.owner_profile_id ?? profile.id,
      }).catch((error) => {
        console.error("Failed to enrich wishlist item:", error);
      });
    }

    return NextResponse.json({ item: inserted }, { status: 201 });
  } catch (error) {
    console.error(`POST /v1/wishlists/${wishlistId}/items failed:`, error);
    return NextResponse.json(
      { message: "Nie udało się dodać produktu do listy" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  const wishlistId = params.id;

  try {
    const url = new URL(request.url);
    const limit = clampPositiveInteger(
      url.searchParams.get("limit"),
      DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE
    );
    const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
    const sortParam = url.searchParams.get("sort") ?? "created_at";
    const directionParam = url.searchParams.get("direction") ?? "desc";
    const minPriceParam = url.searchParams.get("minPrice");
    const maxPriceParam = url.searchParams.get("maxPrice");

    const sortField = getSortField(sortParam);
    const sortDirection = directionParam === "asc" ? "asc" : "desc";
    const minPrice = parsePriceQuery(minPriceParam);
    const maxPrice = parsePriceQuery(maxPriceParam);

    const supabase = await createClient();
    const adminClient = createSupabaseAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
    }

    const { data: wishlist, error: wishlistError } = await adminClient
      .from("wishlists")
      .select("id, owner_id")
      .eq("id", wishlistId)
      .maybeSingle();

    if (wishlistError) {
      throw new Error(wishlistError.message);
    }

    if (!wishlist || wishlist.owner_id !== user.id) {
      return NextResponse.json(
        { message: "Możesz przeglądać tylko własne listy" },
        { status: 403 }
      );
    }

    const { data, error } = await adminClient
      .from("wishlist_items")
      .select("*")
      .eq("wishlist_id", wishlistId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const items = (data ?? []) as Array<Record<string, unknown>>;

    const filtered = items.filter((raw) => filterByPriceRange(raw, minPrice, maxPrice));

    const sorted = filtered.sort((a, b) => compareItems(a, b, sortField, sortDirection));

    const slice = sorted.slice(offset, offset + limit);

    return NextResponse.json({
      items: slice,
      total: filtered.length,
      hasMore: offset + slice.length < filtered.length,
    });
  } catch (error) {
    console.error(`GET /v1/wishlists/${wishlistId}/items failed:`, error);
    return NextResponse.json(
      { message: "Nie udało się pobrać elementów listy" },
      { status: 500 }
    );
  }
}

function clampPositiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function getSortField(sortParam: string) {
  if (sortParam === "price") {
    return "price" as const;
  }
  if (sortParam === "updated_at") {
    return "updated_at" as const;
  }
  return "created_at" as const;
}

function parsePriceQuery(value: string | null) {
  if (!value) {
    return null;
  }
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeManualPrice(value: unknown) {
  if (value == null) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toFixed(2) : null;
  }

  if (typeof value !== "string") {
    return null;
  }

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

function normalizeCurrency(value: unknown) {
  if (value == null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toUpperCase();
  if (!trimmed) {
    return null;
  }

  if (!/^[A-Z]{3}$/.test(trimmed)) {
    return "INVALID";
  }

  return trimmed;
}

function extractPrice(entry: Record<string, unknown>) {
  const snapshot = entry.price_snapshot as Record<string, unknown> | null | undefined;
  if (!snapshot) {
    return null;
  }

  const amountRaw = snapshot.amount as string | number | null | undefined;
  if (amountRaw == null) {
    return null;
  }

  const numeric = typeof amountRaw === "number" ? amountRaw : Number.parseFloat(amountRaw);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return numeric;
}

function filterByPriceRange(entry: Record<string, unknown>, min: number | null, max: number | null) {
  if (min == null && max == null) {
    return true;
  }
  const price = extractPrice(entry);
  if (price == null) {
    return false;
  }
  if (min != null && price < min) {
    return false;
  }
  if (max != null && price > max) {
    return false;
  }
  return true;
}

function compareItems(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  sortField: "created_at" | "updated_at" | "price",
  direction: "asc" | "desc"
) {
  const multiplier = direction === "asc" ? 1 : -1;

  if (sortField === "price") {
    const priceA = extractPrice(a);
    const priceB = extractPrice(b);

    if (priceA == null && priceB == null) {
      return 0;
    }
    if (priceA == null) {
      return 1 * multiplier;
    }
    if (priceB == null) {
      return -1 * multiplier;
    }
    return priceA === priceB ? 0 : priceA > priceB ? multiplier : -multiplier;
  }

  const valueA = getDateValue(a[sortField]);
  const valueB = getDateValue(b[sortField]);

  if (valueA === valueB) {
    return 0;
  }
  if (valueA == null) {
    return 1 * multiplier;
  }
  if (valueB == null) {
    return -1 * multiplier;
  }

  return valueA > valueB ? multiplier : -multiplier;
}

function getDateValue(input: unknown) {
  if (typeof input !== "string") {
    return null;
  }
  const time = Date.parse(input);
  return Number.isFinite(time) ? time : null;
}
