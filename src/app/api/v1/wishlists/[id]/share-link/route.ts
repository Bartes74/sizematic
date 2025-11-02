import { randomUUID } from 'node:crypto';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { logWishlistEvent } from '@/server/wishlist-events';
import { hashPublicToken } from '@/server/wishlists-public';

function buildShareUrl(request: NextRequest, token: string, kind: 'list' | 'item') {
  const base = request.nextUrl?.origin ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (!base) {
    throw new Error('Unable to resolve application URL. Set NEXT_PUBLIC_APP_URL.');
  }

  const pathname = kind === 'list' ? `/public/wishlists/${token}` : `/public/wishlist-items/${token}`;
  return new URL(pathname, base).toString();
}

export async function POST(request: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  const wishlistId = params.id;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 });
    }

    const { data: wishlist, error: wishlistError } = await supabase
      .from('wishlists')
      .select('id, owner_id, owner_profile_id')
      .eq('id', wishlistId)
      .maybeSingle();

    if (wishlistError) {
      throw new Error(wishlistError.message);
    }

    if (!wishlist || wishlist.owner_id !== user.id) {
      return NextResponse.json({ message: 'Możesz udostępniać tylko własne listy' }, { status: 403 });
    }

    const token = randomUUID().replace(/-/g, '');
    const tokenHash = hashPublicToken(token);

    const adminClient = createSupabaseAdminClient();

    const { error: cleanupError } = await adminClient
      .from('wishlist_public_links')
      .delete()
      .eq('wishlist_id', wishlistId)
      .is('wishlist_item_id', null);

    if (cleanupError) {
      throw new Error(cleanupError.message);
    }

    const { error: insertError } = await adminClient.from('wishlist_public_links').insert({
      profile_id: wishlist.owner_profile_id ?? user.id,
      wishlist_id: wishlistId,
      wishlist_item_id: null,
      kind: 'list',
      token_hash: tokenHash,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    const url = buildShareUrl(request, token, 'list');

    await logWishlistEvent({
      profileId: wishlist.owner_profile_id ?? user.id,
      wishlistId,
      eventType: 'wishlist_list_shared',
      source: 'owner',
      metadata: {
        tokenPrefix: token.slice(0, 6),
      },
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error(`POST /v1/wishlists/${wishlistId}/share-link failed:`, error);
    return NextResponse.json({ message: 'Nie udało się wygenerować linku publicznego' }, { status: 500 });
  }
}

