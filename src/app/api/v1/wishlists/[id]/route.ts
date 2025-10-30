import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { WishlistClaim, WishlistItem, WishlistShare } from "@/lib/types";
import { getProfileForUser } from "@/server/profiles";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const wishlistId = params.id;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
    }

    const { data: wishlist, error: wishlistError } = await supabase
      .from("wishlists")
      .select("*")
      .eq("id", wishlistId)
      .maybeSingle();

    if (wishlistError) {
      throw new Error(wishlistError.message);
    }

    if (!wishlist) {
      return NextResponse.json({ message: "Lista nie istnieje" }, { status: 404 });
    }

    const isOwner = wishlist.owner_id === user.id;

    const { data: items, error: itemsError } = await supabase
      .from("wishlist_items")
      .select("*")
      .eq("wishlist_id", wishlistId)
      .order("created_at", { ascending: true });

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    let shares: WishlistShare[] = [];
    let claims: WishlistClaim[] = [];
    let viewerShareId: string | null = null;

    if (isOwner) {
      const { data: sharesData, error: sharesError } = await supabase
        .from("wishlist_shares")
        .select("*")
        .eq("wishlist_id", wishlistId)
        .order("created_at", { ascending: true });

      if (sharesError) {
        throw new Error(sharesError.message);
      }

      shares = sharesData as WishlistShare[];
    } else {
      const profile = await getProfileForUser(supabase, user.id);
      const { data: shareRecord, error: shareLookupError } = await supabase
        .from("wishlist_shares")
        .select("id")
        .eq("wishlist_id", wishlistId)
        .eq("recipient_profile_id", profile.id)
        .maybeSingle();

      if (shareLookupError) {
        throw new Error(shareLookupError.message);
      }

      if (!shareRecord) {
        return NextResponse.json({ message: "Brak dostępu do listy" }, { status: 403 });
      }

      viewerShareId = shareRecord.id;

      if (items && items.length > 0) {
        const itemIds = items.map((item) => item.id);
        const { data: claimRows, error: claimsError } = await supabase
          .from("wishlist_claims")
          .select("*")
          .in("wishlist_item_id", itemIds);

        if (claimsError) {
          throw new Error(claimsError.message);
        }

        claims = (claimRows ?? []) as WishlistClaim[];
      }
    }

    const claimMap = new Map<string, WishlistClaim>();
    for (const claim of claims) {
      claimMap.set(claim.wishlist_item_id, claim);
    }

    const payload = {
      wishlist,
      items: (items ?? []).map((item) => ({
        ...item,
        claim: isOwner ? null : claimToPayload(claimMap.get(item.id) ?? null, viewerShareId),
      })) as Array<WishlistItem & { claim: ClaimResponse | null }>,
      shares: isOwner ? shares : undefined,
      viewer: {
        role: isOwner ? "owner" : "recipient",
        share_id: viewerShareId,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error(`GET /v1/wishlists/${wishlistId} failed:`, error);
    return NextResponse.json(
      { message: "Nie udało się pobrać szczegółów listy życzeń" },
      { status: 500 }
    );
  }
}

type ClaimResponse =
  | null
  | (WishlistClaim & {
      isMine: boolean;
    });

function claimToPayload(claim: WishlistClaim | null, viewerShareId: string | null): ClaimResponse {
  if (!claim) {
    return null;
  }

  return {
    ...claim,
    isMine: viewerShareId ? claim.share_id === viewerShareId : false,
  };
}
