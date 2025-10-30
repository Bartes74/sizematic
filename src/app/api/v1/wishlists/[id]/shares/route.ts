import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

type Params = {
  params: { id: string };
};

type SharePayload = {
  emails: string[];
};

type ShareResult = {
  email: string;
  status: "accepted" | "pending" | "skipped";
  share_id: string | null;
  reason?: string;
};

export async function POST(request: NextRequest, context: Params) {
  const wishlistId = context.params.id;

  try {
    const { emails } = (await request.json()) as SharePayload;

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { message: "Podaj co najmniej jeden adres e-mail" },
        { status: 400 }
      );
    }

    const cleanedEmails = Array.from(new Set(emails.map(normalizeEmail))).filter(Boolean) as string[];

    if (cleanedEmails.length === 0) {
      return NextResponse.json({ message: "Brak poprawnych adresów e-mail" }, { status: 400 });
    }

    const supabase = await createClient();
    const admin = createSupabaseAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
    }

    const { data: wishlist, error: wishlistError } = await supabase
      .from("wishlists")
      .select("id, owner_id")
      .eq("id", wishlistId)
      .maybeSingle();

    if (wishlistError) {
      throw new Error(wishlistError.message);
    }

    if (!wishlist || wishlist.owner_id !== user.id) {
      return NextResponse.json(
        { message: "Możesz udostępniać tylko własne listy" },
        { status: 403 }
      );
    }

    const results: ShareResult[] = [];

    for (const email of cleanedEmails) {
      const existingShare = await findExistingShare(supabase, wishlistId, email);
      const profileMatch = await findProfileByEmail(admin, email);

      if (existingShare && existingShare.status === "revoked") {
        // Reactivate revoked share
        const status = profileMatch ? "accepted" : "pending";
        const payload = {
          status,
          recipient_profile_id: profileMatch?.id ?? null,
          accepted_at: profileMatch ? new Date().toISOString() : null,
          notified_at: new Date().toISOString(),
        };

        const { data: updated, error: updateError } = await supabase
          .from("wishlist_shares")
          .update(payload)
          .eq("id", existingShare.id)
          .select("*")
          .single();

        if (updateError) {
          throw new Error(updateError.message);
        }

        results.push({
          email,
          status,
          share_id: updated.id,
        });

        continue;
      }

      if (existingShare && existingShare.status !== "revoked") {
        results.push({
          email,
          status: existingShare.status,
          share_id: existingShare.id,
          reason: "Już udostępniono",
        });
        continue;
      }

      const status = profileMatch ? "accepted" : "pending";
      const now = new Date().toISOString();

      const { data: inserted, error: insertError } = await supabase
        .from("wishlist_shares")
        .insert({
          wishlist_id: wishlistId,
          recipient_email: email,
          recipient_profile_id: profileMatch?.id ?? null,
          status,
          invited_by: user.id,
          notified_at: now,
          accepted_at: profileMatch ? now : null,
        })
        .select("*")
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // TODO: enqueue notification workflow (push/email) here

      results.push({
        email,
        status,
        share_id: inserted.id,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error(`POST /v1/wishlists/${context.params.id}/shares failed:`, error);
    return NextResponse.json(
      { message: "Nie udało się udostępnić listy" },
      { status: 500 }
    );
  }
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

async function findExistingShare(
  supabase: Awaited<ReturnType<typeof createClient>>,
  wishlistId: string,
  email: string
) {
  const { data, error } = await supabase
    .from("wishlist_shares")
    .select("*")
    .eq("wishlist_id", wishlistId)
    .ilike("recipient_email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function findProfileByEmail(admin: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, owner_id")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
