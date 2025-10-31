import { createSupabaseAdminClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types';

type TrustedCircleSnapshot = {
  plan: string | null;
  limit: number | null;
  pending_invitations: Array<{ id: string; invitee_email: string; status: string; created_at: string }>;
  members: Array<{
    profile: {
      id: string;
      display_name: string | null;
      email: string | null;
      avatar_url: string | null;
    };
    connected_at: string;
    outgoing_permissions: { category: string; product_type: string | null }[];
    incoming_permissions: { category: string; product_type: string | null }[];
  }>;
};

export async function getTrustedCircleSnapshot(ownerId: string): Promise<TrustedCircleSnapshot> {
  const supabase = await createClient();
  const admin = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) {
    throw new Error('Profil nie istnieje.');
  }

  const limitRow = await import('@/lib/trusted-circle/utils').then((mod) =>
    mod.getTrustedCircleLimit(profile.role as UserRole | null | undefined)
  );

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
    throw new Error(pending.error.message);
  }

  if (memberships.error) {
    throw new Error(memberships.error.message);
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
    throw new Error(outgoingPermissions.error.message);
  }
  if (incomingPermissions.error) {
    throw new Error(incomingPermissions.error.message);
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

  const members = (memberships.data ?? [])
    .map((row) => {
      const memberProfile = Array.isArray(row.member_profile) ? row.member_profile[0] : row.member_profile;
      if (!memberProfile) {
        return null;
      }
      return {
        profile: memberProfile,
        connected_at: row.created_at,
        outgoing_permissions: outgoingMap.get(memberProfile.id) ?? [],
        incoming_permissions: incomingMap.get(memberProfile.id) ?? [],
      };
    })
    .filter((member): member is NonNullable<typeof member> => member !== null);

  return {
    plan: profile.role,
    limit: limitRow,
    pending_invitations: pending.data ?? [],
    members,
  };
}
