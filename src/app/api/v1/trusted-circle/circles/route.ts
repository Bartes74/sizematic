'use server';

import { NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { getTrustedCircleLimit } from '@/lib/trusted-circle/utils';
import type { PlanType, UserRole } from '@/lib/types';

type CreateCirclePayload = {
  name?: string;
  allowWishlistAccess?: boolean;
  allowSizeAccess?: boolean;
};

export async function POST(request: Request) {
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
    .select('id, plan_type, role')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'Profil użytkownika nie istnieje.' }, { status: 404 });
  }

  const payload = (await request.json().catch(() => ({}))) as CreateCirclePayload;
  const circleName = payload.name?.trim() || 'Nowy krąg';
  const allowWishlistAccess = Boolean(payload.allowWishlistAccess);
  const allowSizeAccess = payload.allowSizeAccess !== undefined ? Boolean(payload.allowSizeAccess) : true;

  const planKey = (profile.plan_type ?? profile.role) as PlanType | UserRole | null | undefined;
  const planLimit = getTrustedCircleLimit(planKey);

  if (planLimit !== null) {
    const { count: currentCircles, error: circlesError } = await admin
      .from('trusted_circles')
      .select('id', { count: 'exact', head: true })
      .eq('owner_profile_id', profile.id);

    if (circlesError) {
      return NextResponse.json({ error: circlesError.message }, { status: 500 });
    }

    if ((currentCircles ?? 0) >= planLimit) {
      return NextResponse.json(
        {
          error: 'max_circles',
          message: 'Osiągnąłeś limit Kręgów Zaufanych na swoim planie.',
        },
        { status: 402 },
      );
    }
  }

  const { data: inserted, error: insertError } = await admin
    .from('trusted_circles')
    .insert({
      owner_profile_id: profile.id,
      name: circleName,
      allow_wishlist_access: allowWishlistAccess,
      allow_size_access: allowSizeAccess,
    })
    .select('id, name, allow_wishlist_access, allow_size_access, created_at')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Nie udało się utworzyć kręgu.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    circle: inserted,
  });
}

