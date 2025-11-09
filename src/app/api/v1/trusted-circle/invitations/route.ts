import { NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { getTrustedCircleLimit, normalizeEmail, resolveTrustedCirclePlan } from '@/lib/trusted-circle/utils';
import { ensureDefaultCircle } from '@/lib/trusted-circle/circle-helpers';
import { sendTrustedCircleInviteEmail } from '@/lib/email/send-trusted-circle-invite';
import type { PlanType, UserRole } from '@/lib/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createSupabaseAdminClient();
  const requestUrl = new URL(request.url);
  const siteUrl = SITE_URL ?? `${requestUrl.protocol}//${requestUrl.host}`;

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

  const { email, message, circle_id } = (await request.json().catch(() => ({ email: null, message: null, circle_id: null }))) as {
    email: string | null;
    message?: string | null;
    circle_id?: string | null;
  };

  if (!email) {
    return NextResponse.json({ error: 'Adres e-mail jest wymagany.' }, { status: 400 });
  }

  const normalized = normalizeEmail(email);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, role, plan_type, email')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'Profil użytkownika nie istnieje.' }, { status: 404 });
  }

  if (!normalized || (profile.email && normalizeEmail(profile.email) === normalized)) {
    return NextResponse.json({ error: 'Nie możesz zaprosić samego siebie.' }, { status: 400 });
  }

  let inviterCircleId = await ensureDefaultCircle(admin, profile.id);

  if (circle_id) {
    const { data: ownedCircle, error: circleLookupError } = await admin
      .from('trusted_circles')
      .select('id')
      .eq('id', circle_id)
      .eq('owner_profile_id', profile.id)
      .maybeSingle();

    if (circleLookupError) {
      return NextResponse.json({ error: circleLookupError.message }, { status: 500 });
    }

    if (!ownedCircle) {
      return NextResponse.json({ error: 'circle_not_found', message: 'Nie znaleziono wskazanego Kręgu.' }, { status: 404 });
    }

    inviterCircleId = ownedCircle.id;
  }

  // Check inviter limits
  const planKey = resolveTrustedCirclePlan(profile.plan_type as PlanType | null | undefined, profile.role as UserRole | null | undefined);
  const limit = getTrustedCircleLimit(planKey);

  if (limit !== null) {
    const { count: acceptedCount } = await admin
      .from('trusted_circle_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('circle_id', inviterCircleId);

    const { count: pendingCount } = await supabase
      .from('trusted_circle_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('inviter_profile_id', profile.id)
      .eq('status', 'pending')
      .eq('circle_id', inviterCircleId);

    const total = (acceptedCount ?? 0) + (pendingCount ?? 0);
    if (total >= limit) {
      return NextResponse.json({
        error: 'limit_reached',
        message: 'Wyczerpałeś limit zaproszeń dla swojego planu.',
        limit,
      }, { status: 409 });
    }
  }

  const { data: existingInvite } = await supabase
    .from('trusted_circle_invitations')
    .select('id, status')
    .eq('inviter_profile_id', profile.id)
    .eq('circle_id', inviterCircleId)
    .ilike('invitee_email', normalized)
    .maybeSingle();

  if (existingInvite && existingInvite.status === 'pending') {
    return NextResponse.json({
      error: 'already_invited',
      message: 'Zaproszenie zostało już wysłane.',
    }, { status: 409 });
  }

  // fetch invitee profile if exists
  const { data: inviteeProfile } = await admin
    .from('profiles')
    .select('id, display_name, role, plan_type, email')
    .ilike('email', normalized)
    .maybeSingle();

  if (inviteeProfile) {
    const { data: existingMembership } = await admin
      .from('trusted_circle_memberships')
      .select('id')
      .eq('circle_id', inviterCircleId)
      .eq('member_profile_id', inviteeProfile.id)
      .maybeSingle();

    if (existingMembership) {
      return NextResponse.json({
        error: 'already_member',
        message: 'Ta osoba jest już w Twoim Kręgu Zaufanych.',
      }, { status: 409 });
    }

    const inviteePlanKey = resolveTrustedCirclePlan(inviteeProfile.plan_type as PlanType | null | undefined, inviteeProfile.role as UserRole | null | undefined);
    const inviteeLimit = getTrustedCircleLimit(inviteePlanKey);
    if (inviteeLimit !== null) {
      const inviteeCircleId = await ensureDefaultCircle(admin, inviteeProfile.id);
      const { count: inviteeAccepted } = await admin
        .from('trusted_circle_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('circle_id', inviteeCircleId);

      if ((inviteeAccepted ?? 0) >= inviteeLimit) {
        return NextResponse.json({
          error: 'invitee_limit_reached',
          message: 'Zapraszana osoba osiągnęła limit osób w Kręgu Zaufanych.',
          invitee_plan: inviteeProfile.role,
        }, { status: 409 });
      }
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('trusted_circle_invitations')
    .insert({
      inviter_profile_id: profile.id,
      circle_id: inviterCircleId,
      invitee_profile_id: inviteeProfile?.id ?? null,
      invitee_email: normalized,
      message: message ?? null,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const acceptUrl = new URL('/trusted-circle/accept', siteUrl);
  acceptUrl.searchParams.set('token', inserted.token);

  try {
    await sendTrustedCircleInviteEmail({
      to: normalized,
      inviterName: profile.display_name ?? user.email ?? 'Użytkownik GiftFit',
      acceptUrl: acceptUrl.toString(),
    });
  } catch (emailError) {
    console.error('Failed to send trusted circle invite email:', emailError);
    return NextResponse.json({ error: 'Nie udało się wysłać wiadomości e-mail.' }, { status: 500 });
  }

  return NextResponse.json({ invitation: inserted });
}
