import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { enrichWishlistItemFromUrl } from "@/server/wishlists";

export async function POST(_request: NextRequest, context: unknown) {
  const { params } = context as { params: { itemId: string } };
  const { itemId } = params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
    }

    const { data: item, error: itemError } = await supabase
      .from("wishlist_items")
      .select("id, wishlist_id, url, wishlist:wishlists(owner_id, owner_profile_id)")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError) {
      throw new Error(itemError.message);
    }

    if (!item) {
      return NextResponse.json({ message: "Pozycja nie została znaleziona" }, { status: 404 });
    }

    const ownerInfo = item as typeof item & {
      wishlist: { owner_id: string; owner_profile_id: string | null };
    };

    if (!ownerInfo.wishlist || ownerInfo.wishlist.owner_id !== user.id) {
      return NextResponse.json(
        { message: "Brak uprawnień do odświeżenia danych tej pozycji" },
        { status: 403 }
      );
    }

    const { error: resetError } = await supabase
      .from("wishlist_items")
      .update({
        parse_status: "pending",
        parse_error: null,
        parsed_at: null,
      })
      .eq("id", itemId);

    if (resetError) {
      throw new Error(resetError.message);
    }

    void enrichWishlistItemFromUrl({
      itemId,
      wishlistId: ownerInfo.wishlist_id,
      url: ownerInfo.url,
      ownerProfileId: ownerInfo.wishlist.owner_profile_id ?? user.id,
    }).catch((error) => {
      console.error("Failed to refresh wishlist item metadata:", error);
    });

    return NextResponse.json({ queued: true }, { status: 202 });
  } catch (error) {
    console.error(`POST /v1/wishlist-items/${itemId}/refresh failed:`, error);
    return NextResponse.json(
      { message: "Nie udało się zainicjować odświeżenia pozycji" },
      { status: 500 }
    );
  }
}

