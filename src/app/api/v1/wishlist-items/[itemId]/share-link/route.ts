import { randomUUID } from 'node:crypto';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { logWishlistEvent } from '@/server/wishlist-events';
import { hashPublicToken } from '@/server/wishlists-public';

export async function POST(request: NextRequest, context: unknown) {
  const { params } = context as { params: { itemId: string } };
  const { itemId } = params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 });
    }

    const { data: item, error: itemError } = await supabase
      .from('wishlist_items')
      .select('id, wishlist_id')
      .eq('id', itemId)
      .maybeSingle();

    if (itemError) {
      throw new Error(itemError.message);
    }

    if (!item) {
      return NextResponse.json({ message: 'Pozycja nie istnieje' }, { status: 404 });
    }

    const { data: wishlist, error: wishlistError } = await supabase
      .from('wishlists')
      .select('id, owner_id, owner_profile_id')
      .eq('id', item.wishlist_id)
      .maybeSingle();

    if (wishlistError) {
      throw new Error(wishlistError.message);
    }

    if (!wishlist || wishlist.owner_id !== user.id) {
      return NextResponse.json({ message: 'Brak uprawnień do udostępnienia tej pozycji' }, { status: 403 });
    }

    const token = randomUUID().replace(/-/g, '');
    const tokenHash = hashPublicToken(token);
    const adminClient = createSupabaseAdminClient();

    const { error: cleanupError } = await adminClient
      .from('wishlist_public_links')
      .delete()
      .eq('wishlist_item_id', itemId)
      .eq('kind', 'item');

    if (cleanupError) {
      throw new Error(cleanupError.message);
    }

    const { error: insertError } = await adminClient.from('wishlist_public_links').insert({
      profile_id: wishlist.owner_profile_id ?? user.id,
      wishlist_id: item.wishlist_id,
      wishlist_item_id: itemId,
      kind: 'item',
      token_hash: tokenHash,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    const base = request.nextUrl?.origin ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

    if (!base) {
      throw new Error('Unable to resolve application URL. Set NEXT_PUBLIC_APP_URL.');
    }

    const url = new URL(`/public/wishlist-items/${token}`, base).toString();

    await logWishlistEvent({
      profileId: wishlist.owner_profile_id ?? user.id,
      wishlistId: item.wishlist_id,
      wishlistItemId: itemId,
      eventType: 'wishlist_item_shared',
      source: 'owner',
      metadata: {
        tokenPrefix: token.slice(0, 6),
      },
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error(`POST /v1/wishlist-items/${itemId}/share-link failed:`, error);
    return NextResponse.json({ message: 'Nie udało się wygenerować linku publicznego' }, { status: 500 });
  }
}

