import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/server/profiles";

type ClaimPayload = {
  message?: string | null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  const itemId = params.itemId;

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
      .select("id, wishlist_id")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError) {
      throw new Error(itemError.message);
    }

    if (!item) {
      return NextResponse.json({ message: "Produkt nie istnieje lub brak dostępu" }, { status: 404 });
    }

    const { data: wishlist, error: wishlistError } = await supabase
      .from("wishlists")
      .select("id, owner_id")
      .eq("id", item.wishlist_id)
      .maybeSingle();

    if (wishlistError) {
      throw new Error(wishlistError.message);
    }

    if (!wishlist) {
      return NextResponse.json({ message: "Lista nie istnieje" }, { status: 404 });
    }

    if (wishlist.owner_id === user.id) {
      return NextResponse.json(
        { message: "Twórca listy nie może rezerwować własnych prezentów" },
        { status: 403 }
      );
    }

    const profile = await getProfileForUser(supabase, user.id);

    const { data: share, error: shareError } = await supabase
      .from("wishlist_shares")
      .select("id, status")
      .eq("wishlist_id", item.wishlist_id)
      .eq("recipient_profile_id", profile.id)
      .maybeSingle();

    if (shareError) {
      throw new Error(shareError.message);
    }

    if (!share || share.status !== "accepted") {
      return NextResponse.json({ message: "Brak dostępu do tej listy" }, { status: 403 });
    }

    const { data: existingClaim, error: existingClaimError } = await supabase
      .from("wishlist_claims")
      .select("*")
      .eq("wishlist_item_id", itemId)
      .in("status", ["claimed", "purchased"])
      .maybeSingle();

    if (existingClaimError) {
      throw new Error(existingClaimError.message);
    }

    if (existingClaim && existingClaim.share_id !== share.id) {
      return NextResponse.json(
        { message: "Prezent został już zarezerwowany przez inną osobę" },
        { status: 409 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as ClaimPayload | undefined;
    const message = body?.message?.trim() ?? null;

    if (existingClaim && existingClaim.share_id === share.id) {
      // Idempotent response
      return NextResponse.json({ claim: existingClaim });
    }

    const now = new Date().toISOString();
    const { data: inserted, error: insertError } = await supabase
      .from("wishlist_claims")
      .insert({
        wishlist_item_id: itemId,
        share_id: share.id,
        claimer_profile_id: profile.id,
        status: "claimed",
        message,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    // TODO: notify other recipients about the claim (web push/email)

    return NextResponse.json({ claim: inserted }, { status: 201 });
  } catch (error) {
    console.error(`POST /v1/wishlist-items/${itemId}/claim failed:`, error);
    return NextResponse.json(
      { message: "Nie udało się zarezerwować prezentu" },
      { status: 500 }
    );
  }
}
