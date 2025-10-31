import { NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { processMissionEvent } from '@/lib/missions/events';

export async function DELETE(_request: Request, { params }: { params: { memberId: string } }) {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'Profil nie istnieje.' }, { status: 404 });
  }

  const memberId = params.memberId;

  const now = new Date().toISOString();

  // Delete memberships in both directions
  await admin
    .from('trusted_circle_memberships')
    .delete()
    .match({ owner_profile_id: profile.id, member_profile_id: memberId });

  await admin
    .from('trusted_circle_memberships')
    .delete()
    .match({ owner_profile_id: memberId, member_profile_id: profile.id });

  // Remove permissions owned by current profile or member pointing to current profile
  await admin
    .from('trusted_circle_permissions')
    .delete()
    .match({ owner_profile_id: profile.id, member_profile_id: memberId });

  await admin
    .from('trusted_circle_permissions')
    .delete()
    .match({ owner_profile_id: memberId, member_profile_id: profile.id });

  // Revoke related invitation if exists
  await admin
    .from('trusted_circle_invitations')
    .update({ status: 'revoked', revoked_at: now })
    .eq('inviter_profile_id', profile.id)
    .eq('invitee_profile_id', memberId);

  try {
    await processMissionEvent(
      {
        type: 'ITEM_CREATED',
        profileId: profile.id,
        payload: {
          source: 'trusted_circle',
          category: 'circle-removed',
          createdAt: now,
          fieldCount: 0,
        },
      },
      admin
    );
  } catch (missionError) {
    console.warn('Mission event failed during member removal:', missionError);
  }

  return NextResponse.json({ ok: true });
}
