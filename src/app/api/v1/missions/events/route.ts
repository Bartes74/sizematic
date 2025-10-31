import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processMissionEvent } from '@/lib/missions/events';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Nieautoryzowano' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'Profil nie został znaleziony' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Nieprawidłowe dane wejściowe' }, { status: 400 });
  }

  const { type, payload } = body as { type?: string; payload?: Record<string, unknown> };

  if (type !== 'ITEM_CREATED') {
    return NextResponse.json({ error: 'Nieobsługiwany typ zdarzenia' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Brak danych zdarzenia' }, { status: 400 });
  }

  const event = {
    type: 'ITEM_CREATED' as const,
    profileId: profile.id,
    payload: {
      source: (payload.source as string) ?? 'other',
      category: (payload.category as string) ?? 'other',
      subtype: (payload.subtype as string | null | undefined) ?? null,
      createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : new Date().toISOString(),
      fieldCount: typeof payload.fieldCount === 'number' ? payload.fieldCount : 0,
      criticalFieldCompleted: Boolean(payload.criticalFieldCompleted),
      uniqueHash: typeof payload.uniqueHash === 'string' ? payload.uniqueHash : undefined,
    },
  };

  try {
    await processMissionEvent(event, supabase);
  } catch (error) {
    console.error('Mission event processing failed:', error);
    return NextResponse.json({ error: 'Nie udało się przetworzyć zdarzenia misji.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
