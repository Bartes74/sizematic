import { NextRequest, NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';

type UpdatePayload = {
  name?: string;
  allowWishlistAccess?: boolean;
  allowSizeAccess?: boolean;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ circleId: string }> }
) {
  const { circleId: rawCircleId } = await context.params;
  const circleId = rawCircleId?.trim();

  if (!circleId) {
    return NextResponse.json({ error: 'circle_id_required' }, { status: 400 });
  }

  const supabase = await createClient();
  const admin = createSupabaseAdminClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
  }

  const { data: circleRecord, error: circleLookupError } = await admin
    .from('trusted_circles')
    .select('id')
    .eq('id', circleId)
    .eq('owner_profile_id', profile.id)
    .maybeSingle();

  if (circleLookupError) {
    return NextResponse.json({ error: circleLookupError.message }, { status: 500 });
  }

  if (!circleRecord) {
    return NextResponse.json({ error: 'circle_not_found' }, { status: 404 });
  }

  const payload = (await request.json().catch(() => ({}))) as UpdatePayload;

  const updates: Record<string, unknown> = {};

  if (typeof payload.name === 'string') {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'circle_name_required' }, { status: 400 });
    }
    updates.name = trimmed;
  }

  if (payload.allowWishlistAccess !== undefined) {
    updates.allow_wishlist_access = Boolean(payload.allowWishlistAccess);
  }

  if (payload.allowSizeAccess !== undefined) {
    updates.allow_size_access = Boolean(payload.allowSizeAccess);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_updates_provided' }, { status: 400 });
  }

  const { data: updatedCircle, error: updateError } = await admin
    .from('trusted_circles')
    .update(updates)
    .eq('id', circleId)
    .select('id, name, allow_wishlist_access, allow_size_access')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ circle: updatedCircle });
}

