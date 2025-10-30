import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/server/profiles";

type CancelPayload = {
  message?: string | null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { claimId: string } }
) {
  const claimId = params.claimId;

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
        { message: "Możesz anulować tylko własne rezerwacje" },
        { status: 403 }
      );
    }

    if (claim.status === "cancelled") {
      return NextResponse.json({ claim });
    }

    if (claim.status === "purchased") {
      return NextResponse.json(
        { message: "Nie można anulować prezentu oznaczonego jako kupiony" },
        { status: 409 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as CancelPayload | undefined;
    const message = body?.message?.trim() ?? null;

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("wishlist_claims")
      .update({
        status: "cancelled",
        updated_at: now,
        message,
      })
      .eq("id", claimId)
      .select("*")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ claim: updated });
  } catch (error) {
    console.error(`POST /v1/claims/${claimId}/cancel failed:`, error);
    return NextResponse.json(
      { message: "Nie udało się anulować rezerwacji" },
      { status: 500 }
    );
  }
}
