import { NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { getTrustedCircleLimit } from '@/lib/trusted-circle/utils';
import type { UserRole } from '@/lib/types';

export async function GET() {
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
    .select('id, role, display_name, email, avatar_url')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'Profil użytkownika nie istnieje.' }, { status: 404 });
  }

  const limit = getTrustedCircleLimit(profile.role as UserRole | null | undefined);

  const [pending, memberships] = await Promise.all([
    supabase
      .from('trusted_circle_invitations')
      .select('id, invitee_email, status, created_at')
      .eq('inviter_profile_id', profile.id)
      .eq('status', 'pending'),
    admin
      .from('trusted_circle_memberships')
      .select('member_profile:member_profile_id(id, display_name, email, avatar_url), created_at')
      .eq('owner_profile_id', profile.id),
  ]);

  if (pending.error) {
    return NextResponse.json({ error: pending.error.message }, { status: 500 });
  }
  if (memberships.error) {
    return NextResponse.json({ error: memberships.error.message }, { status: 500 });
  }

  const [outgoingPermissions, incomingPermissions] = await Promise.all([
    admin
      .from('trusted_circle_permissions')
      .select('member_profile_id, category, product_type')
      .eq('owner_profile_id', profile.id),
    admin
      .from('trusted_circle_permissions')
      .select('owner_profile_id, category, product_type')
      .eq('member_profile_id', profile.id),
  ]);

  if (outgoingPermissions.error) {
    return NextResponse.json({ error: outgoingPermissions.error.message }, { status: 500 });
  }
  if (incomingPermissions.error) {
    return NextResponse.json({ error: incomingPermissions.error.message }, { status: 500 });
  }

  const outgoingMap = new Map<string, { category: string; product_type: string | null }[]>();
  (outgoingPermissions.data ?? []).forEach((row) => {
    const list = outgoingMap.get(row.member_profile_id) ?? [];
    list.push({ category: row.category, product_type: row.product_type });
    outgoingMap.set(row.member_profile_id, list);
  });

  const incomingMap = new Map<string, { category: string; product_type: string | null }[]>();
  (incomingPermissions.data ?? []).forEach((row) => {
    const list = incomingMap.get(row.owner_profile_id) ?? [];
    list.push({ category: row.category, product_type: row.product_type });
    incomingMap.set(row.owner_profile_id, list);
  });

  const members = (memberships.data ?? []).map((row) => ({
    profile: row.member_profile,
    connected_at: row.created_at,
    outgoing_permissions: outgoingMap.get(row.member_profile.id) ?? [],
    incoming_permissions: incomingMap.get(row.member_profile.id) ?? [],
  }));

  return NextResponse.json({
    plan: profile.role,
    limit,
    pending_invitations: pending.data ?? [],
    members,
  });
}
