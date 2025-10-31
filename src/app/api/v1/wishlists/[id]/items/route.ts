import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/server/profiles";
import { enrichWishlistItemFromUrl } from "@/server/wishlists";
import { processMissionEvent } from "@/lib/missions/events";

type CreateItemPayload = {
  url: string;
  notes?: string | null;
};

export async function POST(request: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  const wishlistId = params.id;

  try {
    const { url, notes } = (await request.json()) as CreateItemPayload;

    if (!url) {
      return NextResponse.json({ message: "Adres URL jest wymagany" }, { status: 400 });
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

    if (!wishlist || wishlist.owner_id !== user.id) {
      return NextResponse.json(
        { message: "Możesz dodawać produkty tylko do własnych list" },
        { status: 403 }
      );
    }

    const profile = await getProfileForUser(supabase, user.id);

    const { data: inserted, error: insertError } = await supabase
      .from("wishlist_items")
      .insert({
        wishlist_id: wishlistId,
        url: parsedUrl.toString(),
        notes: notes ?? null,
      })
      .select("*")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    void enrichWishlistItemFromUrl({
      itemId: inserted.id,
      wishlistId,
      url: parsedUrl.toString(),
      ownerProfileId: wishlist.owner_profile_id ?? profile.id,
    }).catch((error) => {
      console.error("Failed to enrich wishlist item:", error);
    });

    await processMissionEvent(
      {
        type: 'ITEM_CREATED',
        profileId: wishlist.owner_profile_id ?? profile.id,
        payload: {
          source: 'wishlist',
          category: 'wishlist',
          createdAt: inserted.created_at ?? new Date().toISOString(),
          fieldCount: inserted.matched_size ? 1 : 0,
          wishlistId: wishlistId,
          matchedSize: inserted.matched_size,
        },
      },
      supabase
    );

    return NextResponse.json({ item: inserted }, { status: 201 });
  } catch (error) {
    console.error(`POST /v1/wishlists/${wishlistId}/items failed:`, error);
    return NextResponse.json(
      { message: "Nie udało się dodać produktu do listy" },
      { status: 500 }
    );
  }
}
