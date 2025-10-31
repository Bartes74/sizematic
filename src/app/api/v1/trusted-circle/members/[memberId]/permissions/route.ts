import { NextResponse } from 'next/server';
import { createClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { processMissionEvent } from '@/lib/missions/events';

export async function PUT(request: Request, { params }: { params: { memberId: string } }) {
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

  const body = await request.json().catch(() => null) as { selections?: Array<{ category: string; productType?: string | null }> } | null;
  const selections = body?.selections ?? [];

  const memberId = params.memberId;

  const { data: membership } = await admin
    .from('trusted_circle_memberships')
    .select('id')
    .eq('owner_profile_id', profile.id)
    .eq('member_profile_id', memberId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'Ta osoba nie znajduje się w Twoim Kręgu Zaufanych.' }, { status: 404 });
  }

  await admin
    .from('trusted_circle_permissions')
    .delete()
    .match({ owner_profile_id: profile.id, member_profile_id: memberId });

  if (selections.length > 0) {
    const payload = selections.map((item) => ({
      owner_profile_id: profile.id,
      member_profile_id: memberId,
      category: item.category,
      product_type: item.productType ?? null,
    }));

    await admin
      .from('trusted_circle_permissions')
      .insert(payload);
  }

  const now = new Date().toISOString();

  try {
    await processMissionEvent(
      {
        type: 'ITEM_CREATED',
        profileId: profile.id,
        payload: {
          source: 'trusted_circle',
          category: 'permissions-update',
          createdAt: now,
          fieldCount: selections.length,
        },
      },
      admin
    );
  } catch (missionError) {
    console.warn('Mission event failed during permission update:', missionError);
  }

  return NextResponse.json({ ok: true });
}
