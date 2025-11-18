'use server';

import { createSupabaseAdminClient } from '@/lib/supabase';

type CircleRelation = {
  name: string | null;
  allow_wishlist_access: boolean | null;
  allow_size_access: boolean | null;
};

type CircleMembershipRow = {
  circle_id: string;
  circle?: CircleRelation | CircleRelation[] | null;
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

  // First, get all circles owned by the data owner
  const { data: circlesData, error: circlesError } = await admin
    .from('trusted_circles')
    .select('id')
    .eq('owner_profile_id', ownerProfileId);

  if (circlesError) {
    throw new Error(`Failed to load trusted circles: ${circlesError.message}`);
  }

  const circleIds = (circlesData ?? []).map((c) => c.id);

  if (circleIds.length === 0) {
    return { memberships: [], permissions: [] };
  }

  // Now query memberships and permissions for these circles where member matches
  const [{ data: membershipsData, error: membershipsError }, { data: permissionsData, error: permissionsError }] =
    await Promise.all([
      admin
        .from('trusted_circle_memberships')
        .select('circle_id, circle:trusted_circles!circle_id(name, allow_wishlist_access, allow_size_access), created_at')
        .eq('member_profile_id', memberProfileId)
        .in('circle_id', circleIds),
      admin
        .from('trusted_circle_permissions')
        .select('circle_id, category, product_type')
        .eq('member_profile_id', memberProfileId)
        .in('circle_id', circleIds),
    ]);

  if (membershipsError) {
    throw new Error(`Failed to load trusted circle memberships: ${membershipsError.message}`);
  }

  if (permissionsError) {
    throw new Error(`Failed to load trusted circle permissions: ${permissionsError.message}`);
  }

  const memberships = (membershipsData ?? []).map((row: CircleMembershipRow) => {
    const relation = Array.isArray(row.circle) ? row.circle[0] : row.circle;
    return {
      circle_id: row.circle_id,
      circle_name: relation?.name ?? 'Krąg',
      allow_wishlist_access: relation?.allow_wishlist_access ?? false,
      allow_size_access: relation?.allow_size_access ?? false,
      created_at: row.created_at,
    } satisfies CircleMembershipAccess;
  });

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

export async function getAccessibleGarments(
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

  const { data: garments, error: garmentsError } = await admin
    .from('garments')
    .select('id, category, type, name, brand_name, size, created_at')
    .eq('profile_id', ownerProfileId)
    .in('category', Array.from(categoriesToFetch));

  if (garmentsError) {
    throw new Error(`Failed to load garments: ${garmentsError.message}`);
  }

  const filtered = (garments ?? []).filter((garment) => {
    if (fullCategories.has(garment.category)) {
      return true;
    }
    const sizeObj = garment.size as Record<string, unknown> | null;
    const productTypeId = sizeObj && typeof sizeObj.product_type_id === 'string' ? sizeObj.product_type_id : null;
    if (!productTypeId) {
      return fullCategories.has(garment.category);
    }
    const allowedTypes = typeMap.get(garment.category);
    if (!allowedTypes) {
      return false;
    }
    return allowedTypes.has(productTypeId);
  });

  return filtered;
}

export async function getAccessibleBodyMeasurements(
  ownerProfileId: string,
  memberProfileId: string
): Promise<Record<string, unknown> | null> {
  const admin = createSupabaseAdminClient();
  const { memberships } = await getCircleMembershipAccess(ownerProfileId, memberProfileId);
  const hasAccess = memberships.some((membership) => membership.allow_size_access);

  if (!hasAccess) {
    return null;
  }

  const { data: bodyMeasurements, error: bodyMeasurementsError } = await admin
    .from('body_measurements')
    .select('*')
    .eq('profile_id', ownerProfileId)
    .maybeSingle();

  if (bodyMeasurementsError) {
    throw new Error(`Failed to load body measurements: ${bodyMeasurementsError.message}`);
  }

  return bodyMeasurements ?? null;
}

