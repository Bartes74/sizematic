import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { logWishlistEvent } from '@/server/wishlist-events';
import { resolvePublicWishlistLink } from '@/server/wishlists-public';

type OwnerEventPayload = {
  eventType: string;
  wishlistId?: string | null;
  wishlistItemId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type PublicEventPayload = {
  token: string;
  eventType: string;
  metadata?: Record<string, unknown> | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OwnerEventPayload & PublicEventPayload;

    if (body.token) {
      return handlePublicEvent(body);
    }

    return handleOwnerEvent(body);
  } catch (error) {
    console.error('POST /v1/wishlist-events failed:', error);
    return NextResponse.json({ message: 'Nie udało się zapisać zdarzenia' }, { status: 500 });
  }
}

async function handleOwnerEvent(payload: OwnerEventPayload) {
  const { eventType, wishlistId, wishlistItemId, metadata } = payload;

  if (!eventType) {
    return NextResponse.json({ message: 'Typ zdarzenia jest wymagany' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 });
  }

  let profileId: string | null = null;

  if (wishlistId) {
    const { data: wishlist, error } = await supabase
      .from('wishlists')
      .select('owner_profile_id, owner_id')
      .eq('id', wishlistId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!wishlist || wishlist.owner_id !== user.id) {
      return NextResponse.json({ message: 'Możesz logować zdarzenia tylko dla swoich list' }, { status: 403 });
    }

    profileId = wishlist.owner_profile_id ?? user.id;
  }

  if (!profileId) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    profileId = profile?.id ?? user.id;
  }

  const ensuredProfileId = profileId ?? user.id;

  await logWishlistEvent({
    profileId: ensuredProfileId,
    wishlistId: wishlistId ?? null,
    wishlistItemId: wishlistItemId ?? null,
    eventType,
    source: 'owner',
    metadata: metadata ?? null,
  });

  return NextResponse.json({ success: true });
}

async function handlePublicEvent(payload: PublicEventPayload) {
  const { token, eventType, metadata } = payload;

  if (!token || !eventType) {
    return NextResponse.json({ message: 'Token i typ zdarzenia są wymagane' }, { status: 400 });
  }

  const link = await resolvePublicWishlistLink(token);

  if (!link) {
    return NextResponse.json({ message: 'Link publiczny jest nieaktywny lub nie istnieje' }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();

  const { data: profile, error } = await admin
    .from('profiles')
    .select('id')
    .eq('id', link.profile_id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const profileId = profile?.id ?? link.profile_id;

  if (profileId == null) {
    throw new Error('Missing profile id while logging public wishlist event');
  }

  const ensuredProfileId = profileId as string;

  await logWishlistEvent({
    profileId: ensuredProfileId,
    wishlistId: link.wishlist_id,
    wishlistItemId: link.wishlist_item_id,
    eventType,
    source: 'public',
    metadata: metadata ?? null,
  });

  return NextResponse.json({ success: true });
}

