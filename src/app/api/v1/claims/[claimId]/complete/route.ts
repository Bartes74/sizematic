import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/server/profiles";

export async function POST(_request: NextRequest, context: unknown) {
  const { params } = context as { params: { claimId: string } };
  const { claimId } = params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
    }

    const profile = await getProfileForUser(supabase, user.id);

    const { data: claim, error: claimError } = await supabase
      .from("wishlist_claims")
      .select("id, status, share_id")
      .eq("id", claimId)
      .maybeSingle();

    if (claimError) {
      throw new Error(claimError.message);
    }

    if (!claim) {
      return NextResponse.json({ message: "Rezerwacja nie istnieje" }, { status: 404 });
    }

    const { data: share, error: shareError } = await supabase
      .from("wishlist_shares")
      .select("id, recipient_profile_id")
      .eq("id", claim.share_id)
      .maybeSingle();

    if (shareError) {
      throw new Error(shareError.message);
    }

    if (!share || share.recipient_profile_id !== profile.id) {
      return NextResponse.json(
        { message: "Możesz aktualizować tylko własne rezerwacje" },
        { status: 403 }
      );
    }

    if (claim.status === "purchased") {
      return NextResponse.json({ claim });
    }

    if (claim.status !== "claimed") {
      return NextResponse.json(
        { message: "Tę rezerwację można oznaczyć jako kupioną tylko z statusu claimed" },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("wishlist_claims")
      .update({
        status: "purchased",
        updated_at: now,
      })
      .eq("id", claimId)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ claim: updated });
  } catch (error) {
    console.error(`POST /v1/claims/${claimId}/complete failed:`, error);
    return NextResponse.json(
      { message: "Nie udało się oznaczyć prezentu jako kupionego" },
      { status: 500 }
    );
  }
}
