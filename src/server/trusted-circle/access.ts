'use server';

import { createSupabaseAdminClient } from '@/lib/supabase';

type CircleMembershipRow = {
  circle_id: string;
  circle?: {
    name: string;
    allow_wishlist_access: boolean;
    allow_size_access: boolean;
  } | null;
  created_at: string;
};

type PermissionRow = {
  circle_id: string;
  category: string;
  product_type: string | null;
};

export type CircleMembershipAccess = {
  circle_id: string;
  circle_name: string;
  allow_wishlist_access: boolean;
  allow_size_access: boolean;
  created_at: string;
};

export async function getCircleMembershipAccess(
  ownerProfileId: string,
  memberProfileId: string
): Promise<{ memberships: CircleMembershipAccess[]; permissions: PermissionRow[] }> {
  const admin = createSupabaseAdminClient();

  const [{ data: membershipsData, error: membershipsError }, { data: permissionsData, error: permissionsError }] =
    await Promise.all([
      admin
        .from('trusted_circle_memberships')
        .select('circle_id, circle:circle_id(name, allow_wishlist_access, allow_size_access), created_at')
        .eq('owner_profile_id', ownerProfileId)
        .eq('member_profile_id', memberProfileId),
      admin
        .from('trusted_circle_permissions')
        .select('circle_id, category, product_type')
        .eq('owner_profile_id', ownerProfileId)
        .eq('member_profile_id', memberProfileId),
    ]);

  if (membershipsError) {
    throw new Error(`Failed to load trusted circle memberships: ${membershipsError.message}`);
  }

  if (permissionsError) {
    throw new Error(`Failed to load trusted circle permissions: ${permissionsError.message}`);
  }

  const memberships = (membershipsData ?? []).map((row: CircleMembershipRow) => ({
    circle_id: row.circle_id,
    circle_name: row.circle?.name ?? 'Krąg',
    allow_wishlist_access: row.circle?.allow_wishlist_access ?? false,
    allow_size_access: row.circle?.allow_size_access ?? false,
    created_at: row.created_at,
  }));

  return {
    memberships,
    permissions: permissionsData ?? [],
  };
}

export async function hasWishlistAccess(ownerProfileId: string, memberProfileId: string): Promise<boolean> {
  const { memberships } = await getCircleMembershipAccess(ownerProfileId, memberProfileId);
  return memberships.some((membership) => membership.allow_wishlist_access);
}

export async function getAccessibleWishlists(
  ownerProfileId: string,
  memberProfileId: string
): Promise<Array<Record<string, unknown>>> {
  const admin = createSupabaseAdminClient();
  const { memberships } = await getCircleMembershipAccess(ownerProfileId, memberProfileId);

  if (!memberships.some((membership) => membership.allow_wishlist_access)) {
    return [];
  }

  const { data, error } = await admin
    .from('wishlists')
    .select('*')
    .eq('owner_profile_id', ownerProfileId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load wishlists: ${error.message}`);
  }

  return data ?? [];
}

export async function getAccessibleSizeLabels(
  ownerProfileId: string,
  memberProfileId: string
): Promise<Array<Record<string, unknown>>> {
  const admin = createSupabaseAdminClient();
  const { memberships, permissions } = await getCircleMembershipAccess(ownerProfileId, memberProfileId);
  const accessibleCircleIds = memberships
    .filter((membership) => membership.allow_size_access)
    .map((membership) => membership.circle_id);

  if (accessibleCircleIds.length === 0 || permissions.length === 0) {
    return [];
  }

  const circlePermissionMap = new Map<string, PermissionRow[]>();
  permissions.forEach((permission) => {
    if (!accessibleCircleIds.includes(permission.circle_id)) {
      return;
    }
    const list = circlePermissionMap.get(permission.circle_id) ?? [];
    list.push(permission);
    circlePermissionMap.set(permission.circle_id, list);
  });

  if (circlePermissionMap.size === 0) {
    return [];
  }

  const fullCategories = new Set<string>();
  const typeMap = new Map<string, Set<string>>();

  circlePermissionMap.forEach((list) => {
    list.forEach((entry) => {
      if (!entry.product_type) {
        fullCategories.add(entry.category);
      } else {
        const set = typeMap.get(entry.category) ?? new Set<string>();
        set.add(entry.product_type);
        typeMap.set(entry.category, set);
      }
    });
  });

  const categoriesToFetch = new Set<string>([...fullCategories, ...typeMap.keys()]);
  if (categoriesToFetch.size === 0) {
    return [];
  }

  const { data: sizeLabels, error: sizeLabelsError } = await admin
    .from('size_labels')
    .select('id, category, product_type, label, brand_name, notes, created_at')
    .eq('profile_id', ownerProfileId)
    .in('category', Array.from(categoriesToFetch));

  if (sizeLabelsError) {
    throw new Error(`Failed to load size labels: ${sizeLabelsError.message}`);
  }

  const filtered = (sizeLabels ?? []).filter((label) => {
    if (fullCategories.has(label.category)) {
      return true;
    }
    const allowedTypes = typeMap.get(label.category);
    if (!allowedTypes) {
      return false;
    }
    return label.product_type ? allowedTypes.has(label.product_type) : false;
  });

  return filtered;
}

