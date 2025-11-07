import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAccessibleSizeLabels } from '@/server/trusted-circle/access';

export async function GET(_request: Request, context: unknown) {
  const { params } = context as { params: { memberId: string } };
  const supabase = await createClient();
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

  try {
    const sizeLabels = await getAccessibleSizeLabels(memberId, profile.id);
    if (sizeLabels.length === 0) {
      return NextResponse.json({ size_labels: [] });
    }
    return NextResponse.json({ size_labels });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się pobrać danych.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
