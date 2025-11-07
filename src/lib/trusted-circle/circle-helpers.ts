'use server';

import type { SupabaseClient } from '@supabase/supabase-js';

type AdminClient = SupabaseClient<any, any, any>;

const DEFAULT_CIRCLE_NAME = 'Mój Krąg';

export async function ensureDefaultCircle(
  admin: AdminClient,
  ownerProfileId: string
): Promise<string> {
  const { data: existing, error: selectError } = await admin
    .from('trusted_circles')
    .select('id')
    .eq('owner_profile_id', ownerProfileId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to load trusted circles: ${selectError.message}`);
  }

  if (existing) {
    return existing.id;
  }

  const { data: inserted, error: insertError } = await admin
    .from('trusted_circles')
    .insert({
      owner_profile_id: ownerProfileId,
      name: DEFAULT_CIRCLE_NAME,
      allow_wishlist_access: false,
      allow_size_access: true,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `Failed to create default trusted circle: ${insertError?.message ?? 'unknown error'}`
    );
  }

  return inserted.id;
}

