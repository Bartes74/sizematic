import { createSupabaseAdminClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types';

type CircleMemberPermissions = { category: string; product_type: string | null };

type TrustedCircleMember = {
  profile: {
    id: string;
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  circle_id: string;
  circle_name: string;
  connected_at: string;
  outgoing_permissions: CircleMemberPermissions[];
  incoming_permissions: CircleMemberPermissions[];
};

type TrustedCircleSnapshot = {
  plan: string | null;
  plan_type: string | null;
  limit: number | null;
  pending_invitations: Array<{ id: string; invitee_email: string; status: string; created_at: string; circle_id: string | null }>;
  circles: Array<{
    id: string;
    name: string;
    allow_wishlist_access: boolean;
    allow_size_access: boolean;
    member_count: number;
  }>;
  members: TrustedCircleMember[];
};

export async function getTrustedCircleSnapshot(ownerId: string): Promise<TrustedCircleSnapshot> {
  const supabase = await createClient();
  const admin = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, plan_type')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) {
    throw new Error('Profil nie istnieje.');
  }

  const limitRow = await import('@/lib/trusted-circle/utils').then((mod) =>
    mod.getTrustedCircleLimit((profile.plan_type ?? profile.role) as UserRole | string | null | undefined)
  );

  const [pending, circlesRes, memberships, outgoingPermissions, incomingPermissions] = await Promise.all([
    supabase
      .from('trusted_circle_invitations')
      .select('id, invitee_email, status, created_at, circle_id')
      .eq('inviter_profile_id', profile.id)
      .eq('status', 'pending'),
    admin
      .from('trusted_circles')
      .select('id, name, allow_wishlist_access, allow_size_access, created_at')
      .eq('owner_profile_id', profile.id)
      .order('created_at', { ascending: true }),
    admin
      .from('trusted_circle_memberships')
      .select('circle_id, owner_profile_id, member_profile:member_profile_id(id, display_name, email, avatar_url), created_at')
      .eq('owner_profile_id', profile.id),
    admin
      .from('trusted_circle_permissions')
      .select('circle_id, member_profile_id, category, product_type')
      .eq('owner_profile_id', profile.id),
    admin
      .from('trusted_circle_permissions')
      .select('circle_id, owner_profile_id, category, product_type')
      .eq('member_profile_id', profile.id),
  ]);

  if (pending.error) {
    throw new Error(pending.error.message);
  }
  if (circlesRes.error) {
    throw new Error(circlesRes.error.message);
  }

  if (memberships.error) {
    throw new Error(memberships.error.message);
  }
  if (outgoingPermissions.error) {
    throw new Error(outgoingPermissions.error.message);
  }
  if (incomingPermissions.error) {
    throw new Error(incomingPermissions.error.message);
  }

  const circles = (circlesRes.data ?? []).map((circle) => ({
    id: circle.id,
    name: circle.name,
    allow_wishlist_access: circle.allow_wishlist_access,
    allow_size_access: circle.allow_size_access,
    member_count: 0,
  }));

  const circleInfoMap = new Map<string, typeof circles[number]>();
  circles.forEach((circle) => {
    circleInfoMap.set(circle.id, circle);
  });

  const outgoingMap = new Map<string, CircleMemberPermissions[]>();
  (outgoingPermissions.data ?? []).forEach((row) => {
    const key = `${row.circle_id}:${row.member_profile_id}`;
    const list = outgoingMap.get(key) ?? [];
    list.push({ category: row.category, product_type: row.product_type });
    outgoingMap.set(key, list);
  });

  const incomingMap = new Map<string, CircleMemberPermissions[]>();
  (incomingPermissions.data ?? []).forEach((row) => {
    const key = `${row.circle_id}:${row.owner_profile_id}`;
    const list = incomingMap.get(key) ?? [];
    list.push({ category: row.category, product_type: row.product_type });
    incomingMap.set(key, list);
  });

  const members: TrustedCircleMember[] = (memberships.data ?? [])
    .map((row) => {
      const memberProfile = Array.isArray(row.member_profile) ? row.member_profile[0] : row.member_profile;
      if (!memberProfile) {
        return null;
      }
      const circleMeta = circleInfoMap.get(row.circle_id);
      if (circleMeta) {
        circleMeta.member_count += 1;
      }
      const outgoingKey = `${row.circle_id}:${memberProfile.id}`;
      const incomingKey = `${row.circle_id}:${memberProfile.id}`;
      return {
        profile: memberProfile,
        circle_id: row.circle_id,
        circle_name: circleMeta?.name ?? 'Krąg',
        connected_at: row.created_at,
        outgoing_permissions: outgoingMap.get(outgoingKey) ?? [],
        incoming_permissions: incomingMap.get(incomingKey) ?? [],
      };
    })
    .filter((member): member is NonNullable<typeof member> => member !== null);

  return {
    plan: profile.role,
    plan_type: profile.plan_type,
    limit: limitRow,
    pending_invitations: pending.data ?? [],
    circles,
    members,
  };
}
