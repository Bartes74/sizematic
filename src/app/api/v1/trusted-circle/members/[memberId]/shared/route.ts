import { NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: { memberId: string } }) {
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

  const { data: membership } = await admin
    .from('trusted_circle_memberships')
    .select('id')
    .eq('owner_profile_id', memberId)
    .eq('member_profile_id', profile.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'Ta osoba nie udostępnia Ci swoich rozmiarów.' }, { status: 404 });
  }

  const { data: permissions } = await admin
    .from('trusted_circle_permissions')
    .select('category, product_type')
    .eq('owner_profile_id', memberId)
    .eq('member_profile_id', profile.id);

  if (!permissions || permissions.length === 0) {
    return NextResponse.json({ size_labels: [] });
  }

  const fullCategories = new Set<string>();
  const typeMap = new Map<string, Set<string>>();

  permissions.forEach((perm) => {
    if (!perm.product_type) {
      fullCategories.add(perm.category);
    } else {
      const set = typeMap.get(perm.category) ?? new Set<string>();
      set.add(perm.product_type);
      typeMap.set(perm.category, set);
    }
  });

  const categoriesToFetch = new Set<string>([...fullCategories, ...typeMap.keys()]);

  if (categoriesToFetch.size === 0) {
    return NextResponse.json({ size_labels: [] });
  }

  const { data: sizeLabels, error: sizeLabelsError } = await admin
    .from('size_labels')
    .select('id, category, product_type, label, brand_name, notes, created_at')
    .eq('profile_id', memberId)
    .in('category', Array.from(categoriesToFetch));

  if (sizeLabelsError) {
    return NextResponse.json({ error: sizeLabelsError.message }, { status: 500 });
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

  return NextResponse.json({ size_labels: filtered });
}
