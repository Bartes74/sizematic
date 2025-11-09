import { NextRequest, NextResponse } from "next/server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/server/profiles";
import { slugifyTitle } from "@/server/wishlists";

type WishlistPayload = {
  title: string;
  description?: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_type, role")
      .eq("owner_id", user.id)
      .maybeSingle();

    const planType = profile?.plan_type ?? "free";
    const role = profile?.role ?? "free";

    if (!profile || (planType === "free" && role !== "admin")) {
      return NextResponse.json(
        { message: "Lista życzeń dostępna jest tylko w planie Premium." },
        { status: 402 }
      );
    }

    const { data, error } = await supabase
      .from("wishlists")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ wishlists: data ?? [] });
  } catch (error) {
    console.error("GET /v1/wishlists failed:", error);
    return NextResponse.json(
      { message: "Nie udało się pobrać list życzeń" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WishlistPayload;
    const title = body.title?.trim();
    const description = body.description ?? null;

    if (!title) {
      return NextResponse.json(
        { message: "Tytuł listy życzeń jest wymagany" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const adminClient = createSupabaseAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Brak autoryzacji" }, { status: 401 });
    }

    const profile = await getProfileForUser(adminClient, user.id);

    const planType = profile.plan_type ?? "free";
    const role = profile.role ?? "free";

    if (planType === "free" && role !== "admin") {
      return NextResponse.json(
        { message: "Lista życzeń dostępna jest tylko w planie Premium." },
        { status: 402 }
      );
    }
    const slug = await generateUniqueSlug(adminClient, profile.id, title);

    const { data, error } = await adminClient
      .from("wishlists")
      .insert({
        owner_id: user.id,
        owner_profile_id: profile.id,
        title,
        description,
        slug,
        status: "draft",
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ wishlist: data }, { status: 201 });
  } catch (error) {
    console.error("POST /v1/wishlists failed:", error);
    return NextResponse.json(
      { message: "Nie udało się utworzyć listy życzeń" },
      { status: 500 }
    );
  }
}

async function generateUniqueSlug(
  supabase: SupabaseClient,
  ownerProfileId: string,
  title: string
) {
  let base = (await slugifyTitle(title)) || "";

  if (!base) {
    base = `lista-${Math.random().toString(36).slice(2, 8)}`;
  }

  const { data, error } = await supabase
    .from("wishlists")
    .select("slug")
    .eq("owner_profile_id", ownerProfileId);

  if (error) {
    throw new Error(`Nie udało się sprawdzić unikatowości slug: ${error.message}`);
  }

  const existingSlugs = new Set((data ?? []).map((row) => row.slug as string));

  if (!existingSlugs.has(base)) {
    return base;
  }

  let suffix = 2;
  let candidate = `${base}-${suffix}`;
  while (existingSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}
