import { NextResponse } from "next/server";

import { getWishlistMetadataPreview } from "@/server/wishlists";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";

    if (!rawUrl) {
      return NextResponse.json({ error: "urlRequired" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: "invalidUrl" }, { status: 400 });
    }

    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: "invalidUrl" }, { status: 400 });
    }

    const metadata = await getWishlistMetadataPreview(parsed.toString());

    return NextResponse.json({ metadata });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nie udało się pobrać danych produktu";
    return NextResponse.json(
      { error: "previewFailed", message },
      {
        status: 500,
      }
    );
  }
}

