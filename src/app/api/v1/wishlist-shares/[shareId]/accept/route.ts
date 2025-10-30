import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/server/profiles";

export async function POST(
  _request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  const shareId = params.shareId;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
    }

    const { data: share, error: shareError } = await supabase
      .from("wishlist_shares")
      .select("*")
      .eq("id", shareId)
      .maybeSingle();

    if (shareError) {
      throw new Error(shareError.message);
    }

    if (!share) {
      return NextResponse.json({ message: "Zaproszenie nie istnieje" }, { status: 404 });
    }

    if (share.status === "revoked") {
      return NextResponse.json(
        { message: "Zaproszenie zostało odwołane przez twórcę listy" },
        { status: 409 }
      );
    }

    if (share.status === "accepted" && share.recipient_profile_id) {
      return NextResponse.json({ share });
    }

    const profile = await getProfileForUser(supabase, user.id);
    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("wishlist_shares")
      .update({
        status: "accepted",
        recipient_profile_id: profile.id,
        accepted_at: now,
      })
      .eq("id", shareId)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ share: updated });
  } catch (error) {
    console.error(`POST /v1/wishlist-shares/${shareId}/accept failed:`, error);
    return NextResponse.json(
      { message: "Nie udało się zaakceptować zaproszenia" },
      { status: 500 }
    );
  }
}
