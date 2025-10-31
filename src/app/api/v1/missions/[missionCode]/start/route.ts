import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMissionsWithState, upsertMissionState, insertMissionProgressEvent } from '@/lib/missions/queries';
import { mapMissionState } from '@/lib/missions/mapper';

export async function POST(
  _request: Request,
  { params }: { params: { missionCode: string } }
) {
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

  const code = params.missionCode.toUpperCase();
  const locale = (profile.locale ?? 'pl') as 'pl' | 'en';

  const missions = await getMissionsWithState({ profileId: profile.id, locale }, supabase);
  const mission = missions.find((item) => item.code === code);

  if (!mission) {
    return NextResponse.json({ error: 'Misja nie istnieje' }, { status: 404 });
  }

  const mapped = mapMissionState(mission, locale, new Date());

  if (mapped.status === 'in_progress' || mapped.status === 'claimable' || mapped.status === 'completed') {
    return NextResponse.json({ mission: mapped });
  }

  if (mapped.status === 'cooldown') {
    return NextResponse.json({ error: 'Misja jest w cooldownie.' }, { status: 409 });
  }

  if (mapped.status === 'hidden' || mapped.status === 'locked') {
    return NextResponse.json({ error: 'Misja nie jest jeszcze dostępna.' }, { status: 409 });
  }

  const now = new Date();
  const nowIso = now.toISOString();

  await upsertMissionState(
    {
      profileId: profile.id,
      missionId: mission.id,
      status: 'in_progress',
      progress: mapped.userState?.progress ?? {},
      streakCounter: mapped.userState?.streakCounter ?? 0,
      attempts: mapped.userState?.attempts ?? 0,
      startedAt: nowIso,
      completedAt: mapped.userState?.completedAt ?? null,
      nextEligibleAt: mapped.userState?.nextEligibleAt ?? null,
      lastEventAt: nowIso,
    },
    supabase
  );

  await insertMissionProgressEvent(
    {
      profileId: profile.id,
      missionId: mission.id,
      eventType: 'MISSION_STARTED',
      payload: {
        startedAt: nowIso,
      },
    },
    supabase
  );

  const refreshed = await getMissionsWithState({ profileId: profile.id, locale }, supabase);
  const updated = refreshed.find((item) => item.code === code);

  if (!updated) {
    return NextResponse.json({ error: 'Nie udało się odświeżyć stanu misji.' }, { status: 500 });
  }

  return NextResponse.json({ mission: mapMissionState(updated, locale, new Date()) });
}
