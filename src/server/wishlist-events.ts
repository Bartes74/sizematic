import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase';

type LogWishlistEventParams = {
  profileId: string;
  wishlistId?: string | null;
  wishlistItemId?: string | null;
  eventType: string;
  source: 'owner' | 'public';
  metadata?: Record<string, unknown> | null;
};

export async function logWishlistEvent(params: LogWishlistEventParams) {
  const { profileId, wishlistId, wishlistItemId, eventType, source, metadata } = params;

  if (!profileId) {
    throw new Error('profileId is required to log a wishlist event');
  }

  const admin = createSupabaseAdminClient();

  const { error } = await admin.from('wishlist_event_logs').insert({
    profile_id: profileId,
    wishlist_id: wishlistId ?? null,
    wishlist_item_id: wishlistItemId ?? null,
    event_type: eventType,
    source,
    metadata: metadata ?? null,
  });

  if (error) {
    console.error('Failed to log wishlist event', { error, params });
  }
}

