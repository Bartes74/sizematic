import 'server-only';

import { createHash } from 'node:crypto';

import { createSupabaseAdminClient } from '@/lib/supabase';
import type { Wishlist, WishlistItem } from '@/lib/types';

type PublicWishlistLink = {
  id: string;
  profile_id: string;
  wishlist_id: string;
  wishlist_item_id: string | null;
  kind: 'list' | 'item';
};

export function hashPublicToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function resolvePublicWishlistLink(token: string) {
  const tokenHash = hashPublicToken(token);
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('wishlist_public_links')
    .select('id, profile_id, wishlist_id, wishlist_item_id, kind')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  await supabase
    .from('wishlist_public_links')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', data.id)
    .eq('token_hash', tokenHash);

  return data as PublicWishlistLink;
}

export async function getPublicWishlistPayload(token: string) {
  const link = await resolvePublicWishlistLink(token);

  if (!link || link.kind !== 'list') {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const [{ data: wishlist, error: wishlistError }, { data: items, error: itemsError }] = await Promise.all([
    supabase
      .from('wishlists')
      .select('id, title, description, status, created_at, updated_at')
      .eq('id', link.wishlist_id)
      .maybeSingle(),
    supabase
      .from('wishlist_items')
      .select('*')
      .eq('wishlist_id', link.wishlist_id)
      .order('created_at', { ascending: false }),
  ]);

  if (wishlistError) {
    throw new Error(wishlistError.message);
  }

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  if (!wishlist) {
    return null;
  }

  return {
    wishlist: wishlist as Wishlist,
    items: (items ?? []) as WishlistItem[],
  };
}

export async function getPublicWishlistItemPayload(token: string) {
  const link = await resolvePublicWishlistLink(token);

  if (!link || link.kind !== 'item' || !link.wishlist_item_id) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('id', link.wishlist_item_id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return data as WishlistItem;
}

