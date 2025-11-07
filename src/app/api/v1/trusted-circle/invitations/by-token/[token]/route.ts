import { NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { getTrustedCircleLimit } from '@/lib/trusted-circle/utils';
import { ensureDefaultCircle } from '@/lib/trusted-circle/circle-helpers';
import type { UserRole } from '@/lib/types';

export async function POST(_request: Request, context: unknown) {
  const { params } = context as { params: { token: string } };
  const supabase = await createClient();
  const admin = createSupabaseAdminClient();
  const token = params.token;

  if (!token) {
    return NextResponse.json({ error: 'Brak tokenu zaproszenia.' }, { status: 400 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Musisz być zalogowany, aby zaakceptować zaproszenie.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, plan_type, email, display_name')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'Profil użytkownika nie istnieje.' }, { status: 404 });
  }

  const { data: invitation, error: inviteError } = await admin
    .from('trusted_circle_invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  if (!invitation) {
    return NextResponse.json({ error: 'Zaproszenie nie istnieje lub zostało usunięte.' }, { status: 404 });
  }

  if (invitation.status === 'revoked' || invitation.status === 'cancelled') {
    return NextResponse.json({ error: 'Zaproszenie zostało odwołane.' }, { status: 410 });
  }

  if (invitation.status === 'accepted') {
    return NextResponse.json({ error: 'Zaproszenie zostało już zaakceptowane.' }, { status: 409 });
  }

  if (!profile.email || profile.email.toLowerCase() !== invitation.invitee_email.toLowerCase()) {
    return NextResponse.json({
      error: 'email_mismatch',
      message: 'Zaloguj się na konto powiązane z adresem e-mail otrzymującego zaproszenie.',
    }, { status: 403 });
  }

  const limit = getTrustedCircleLimit((profile.plan_type ?? profile.role) as UserRole | string | null | undefined);
  if (limit !== null) {
    const defaultCircleId = await ensureDefaultCircle(admin, profile.id);
    const { count: currentMemberships, error: membershipCountError } = await admin
      .from('trusted_circle_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('circle_id', defaultCircleId);

    if (membershipCountError) {
      return NextResponse.json({ error: membershipCountError.message }, { status: 500 });
    }

    if ((currentMemberships ?? 0) >= limit) {
      return NextResponse.json({
        error: 'limit_reached',
        message: 'Osiągnąłeś limit osób w swoim Kręgu Zaufanych. Zmień plan, aby zaprosić kolejne osoby.',
      }, { status: 409 });
    }
  }

  const now = new Date().toISOString();

  const { error: updateError } = await admin
    .from('trusted_circle_invitations')
    .update({
      status: 'accepted',
      invitee_profile_id: profile.id,
      accepted_at: now,
    })
    .eq('id', invitation.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const membershipPairs = [
    { owner_profile_id: invitation.inviter_profile_id, member_profile_id: profile.id },
    { owner_profile_id: profile.id, member_profile_id: invitation.inviter_profile_id },
  ];

  const inviterCircleId = invitation.circle_id || (await ensureDefaultCircle(admin, invitation.inviter_profile_id));
  const inviteeCircleId = await ensureDefaultCircle(admin, profile.id);

  const membershipPairs = [
    {
      circle_id: inviterCircleId,
      owner_profile_id: invitation.inviter_profile_id,
      member_profile_id: profile.id,
    },
    {
      circle_id: inviteeCircleId,
      owner_profile_id: profile.id,
      member_profile_id: invitation.inviter_profile_id,
    },
  ];

  const { error: membershipError } = await admin
    .from('trusted_circle_memberships')
    .upsert(membershipPairs, {
      onConflict: 'circle_id,member_profile_id',
      ignoreDuplicates: true,
    });

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  return NextResponse.json({
    membership: {
      inviter_profile_id: invitation.inviter_profile_id,
      invitee_profile_id: profile.id,
      circle_id: inviterCircleId,
    },
  });
}
