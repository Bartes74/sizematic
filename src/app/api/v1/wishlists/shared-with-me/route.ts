import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/server/profiles";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
    }

    const profile = await getProfileForUser(supabase, user.id);

    const { data, error } = await supabase
      .from("wishlist_shares")
      .select("id, status, accepted_at, wishlist:wishlist_id (*)")
      .eq("recipient_profile_id", profile.id)
      .eq("status", "accepted")
      .order("accepted_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const wishlists = (data ?? [])
      .map((row) => ({
        share_id: row.id,
        status: row.status,
        accepted_at: row.accepted_at,
        wishlist: row.wishlist,
      }))
      .filter((entry) => Boolean(entry.wishlist));

    return NextResponse.json({ shared: wishlists });
  } catch (error) {
    console.error("GET /v1/wishlists/shared-with-me failed:", error);
    return NextResponse.json(
      { message: "Nie udało się pobrać udostępnionych list" },
      { status: 500 }
    );
  }
}
