import { NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';

export async function DELETE(_request: Request, context: unknown) {
  const { params } = context as { params: { memberId: string } };
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

  const { data: directMemberships, error: membershipsError } = await admin
    .from('trusted_circle_memberships')
    .select('id, circle_id')
    .eq('owner_profile_id', profile.id)
    .eq('member_profile_id', memberId);

  if (membershipsError) {
    return NextResponse.json({ error: membershipsError.message }, { status: 500 });
  }

  if (!directMemberships || directMemberships.length === 0) {
    return NextResponse.json({ error: 'Ta osoba nie znajduje się w Twoim Kręgu Zaufanych.' }, { status: 404 });
  }

  const circleIds = directMemberships.map((entry) => entry.circle_id);

  await admin
    .from('trusted_circle_memberships')
    .delete()
    .in('id', directMemberships.map((entry) => entry.id));

  const { data: reciprocalMemberships } = await admin
    .from('trusted_circle_memberships')
    .select('id')
    .eq('owner_profile_id', memberId)
    .eq('member_profile_id', profile.id);

  if (reciprocalMemberships && reciprocalMemberships.length > 0) {
    await admin
      .from('trusted_circle_memberships')
      .delete()
      .in('id', reciprocalMemberships.map((entry) => entry.id));
  }

  await admin
    .from('trusted_circle_permissions')
    .delete()
    .in('circle_id', circleIds)
    .eq('owner_profile_id', profile.id)
    .eq('member_profile_id', memberId);

  await admin
    .from('trusted_circle_permissions')
    .delete()
    .eq('owner_profile_id', memberId)
    .eq('member_profile_id', profile.id);

  // Revoke related invitation if exists
  await admin
    .from('trusted_circle_invitations')
    .update({ status: 'revoked', revoked_at: now })
    .eq('inviter_profile_id', profile.id)
    .eq('invitee_profile_id', memberId);

  return NextResponse.json({ ok: true });
}
