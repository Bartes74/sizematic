export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTrustedCircleSnapshot } from '@/server/trusted-circle';
import { getTrustedCircleLimit } from '@/lib/trusted-circle/utils';
import type { UserRole } from '@/lib/types';

export async function GET() {
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

  try {
    const snapshot = await getTrustedCircleSnapshot(user.id);

    return NextResponse.json({
      plan: profile.role,
      plan_type: snapshot.plan_type,
      limit:
        snapshot.limit ??
        getTrustedCircleLimit((snapshot.plan_type ?? profile.role) as UserRole | string | null | undefined),
      pending_invitations: snapshot.pending_invitations,
      circles: snapshot.circles,
      members: snapshot.members,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się pobrać danych.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
