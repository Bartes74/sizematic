export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMissionsWithState } from '@/lib/missions/queries';
import { mapMissionState } from '@/lib/missions/mapper';

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
    return NextResponse.json({ error: 'Nieautoryzowano' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, locale')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'Profil nie został znaleziony' }, { status: 404 });
  }

  const locale = (profile.locale ?? 'pl') as 'pl' | 'en';
  const missions = await getMissionsWithState(
    {
      profileId: profile.id,
      locale,
    },
    supabase
  );

  const now = new Date();
  const payload = missions.map((mission) => mapMissionState(mission, locale, now));

  return NextResponse.json({ missions: payload });
}
