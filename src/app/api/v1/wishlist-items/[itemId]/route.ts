import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { SizeMatchConfidence } from "@/lib/types";

type UpdatePayload = Partial<{
  product_name: string | null;
  product_brand: string | null;
  matched_size: string | null;
  notes: string | null;
  size_confidence: SizeMatchConfidence;
}>;

const ALLOWED_FIELDS = new Set([
  "product_name",
  "product_brand",
  "matched_size",
  "notes",
  "size_confidence",
]);

export async function PATCH(request: NextRequest, context: unknown) {
  const { params } = context as { params: { itemId: string } };
  const { itemId } = params;

  try {
    const body = (await request.json()) as UpdatePayload;

    const invalidKeys = Object.keys(body).filter((key) => !ALLOWED_FIELDS.has(key));
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { message: `Nieobsługiwane pola: ${invalidKeys.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
    }

    const { data: item, error: itemError } = await supabase
      .from("wishlist_items")
      .select("id, wishlist_id")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError) {
      throw new Error(itemError.message);
    }

    if (!item) {
      return NextResponse.json({ message: "Pozycja nie została znaleziona" }, { status: 404 });
    }

    const { data: wishlist, error: wishlistError } = await supabase
      .from("wishlists")
      .select("id, owner_id")
      .eq("id", item.wishlist_id)
      .maybeSingle();

    if (wishlistError) {
      throw new Error(wishlistError.message);
    }

    if (!wishlist || wishlist.owner_id !== user.id) {
      return NextResponse.json(
        { message: "Brak uprawnień do modyfikacji tej pozycji" },
        { status: 403 }
      );
    }

    const payload: UpdatePayload = {};
    for (const key of Object.keys(body) as Array<keyof UpdatePayload>) {
      if (key === "size_confidence") {
        payload.size_confidence = body.size_confidence;
      } else {
        payload[key] = (body[key] ?? null) as UpdatePayload[Exclude<
          keyof UpdatePayload,
          "size_confidence"
        >];
      }
    }

    if (payload.matched_size && !payload.size_confidence) {
      payload.size_confidence = "manual";
    } else if (payload.matched_size === null && !payload.size_confidence) {
      payload.size_confidence = "missing";
    }

    if (payload.size_confidence && !isValidConfidence(payload.size_confidence)) {
      return NextResponse.json(
        { message: "Niepoprawna wartość size_confidence" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("wishlist_items")
      .update(payload)
      .eq("id", itemId)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error(`PATCH /v1/wishlist-items/${itemId} failed:`, error);
    return NextResponse.json(
      { message: "Nie udało się zaktualizować pozycji listy życzeń" },
      { status: 500 }
    );
  }
}

function isValidConfidence(value: string): value is SizeMatchConfidence {
  return ["exact", "similar", "manual", "missing"].includes(value);
}
