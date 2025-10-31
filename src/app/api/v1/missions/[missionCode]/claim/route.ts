import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getMissionsWithState,
  getProfileProgression,
  upsertProfileProgression,
  upsertMissionState,
  addMissionReward,
  insertMissionProgressEvent,
} from '@/lib/missions/queries';
import { findMissionDefinition, determineInitialStatus } from '@/lib/missions/progression';
import { getLevelForXp } from '@/lib/missions/rewards';
import { mapMissionState } from '@/lib/missions/mapper';
import type { MissionStatus } from '@/lib/types';

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

  const missionCode = params.missionCode.toUpperCase();
  const locale = (profile.locale ?? 'pl') as 'pl' | 'en';

  const missions = await getMissionsWithState({ profileId: profile.id, locale }, supabase);
  const mission = missions.find((item) => item.code === missionCode);

  if (!mission) {
    return NextResponse.json({ error: 'Misja nie istnieje' }, { status: 404 });
  }

  const definition = findMissionDefinition(mission.code);
  if (!definition) {
    return NextResponse.json({ error: 'Brak definicji misji' }, { status: 500 });
  }

  const state = mission.userState;
  if (!state || state.status !== 'claimable') {
    return NextResponse.json({ error: 'Misja nie jest gotowa do odebrania' }, { status: 409 });
  }

  const now = new Date();
  const nowIso = now.toISOString();

  const xpReward = Number(definition.rewards?.xp ?? 0);
  const freezeTokensReward = Number(definition.rewards?.freezeTokens ?? 0);

  let nextStatus: MissionStatus = 'completed';
  let nextEligibleAt: string | null = null;

  if (definition.repeatable) {
    if (definition.cooldownDays > 0) {
      nextStatus = 'cooldown';
      nextEligibleAt = new Date(now.getTime() + definition.cooldownDays * 24 * 60 * 60 * 1000).toISOString();
    } else {
      nextStatus = determineInitialStatus(definition, now);
      nextEligibleAt = null;
    }
  } else {
    nextStatus = 'completed';
  }

  const currentProgression = await getProfileProgression(profile.id, supabase);
  const currentXp = currentProgression?.xp ?? 0;
  const newXpTotal = currentXp + xpReward;
  const newLevel = getLevelForXp(newXpTotal);
  const newFreezeOwned = (currentProgression?.freezes_owned ?? 0) + freezeTokensReward;

  await addMissionReward(
    {
      profileId: profile.id,
      missionId: mission.id,
      source: 'mission_claim',
      xp: xpReward,
      rewards: definition.rewards,
    },
    supabase
  );

  await upsertMissionState(
    {
      profileId: profile.id,
      missionId: mission.id,
      status: nextStatus,
      progress: {},
      streakCounter: state.streak_counter ?? 0,
      attempts: (state.attempts ?? 0) + 1,
      startedAt: nextStatus === 'in_progress' ? nowIso : null,
      completedAt: nowIso,
      nextEligibleAt,
      lastEventAt: nowIso,
    },
    supabase
  );

  await upsertProfileProgression(
    {
      profile_id: profile.id,
      xp: newXpTotal,
      level: newLevel,
      current_streak: currentProgression?.current_streak ?? 0,
      best_streak: currentProgression?.best_streak ?? 0,
      freezes_owned: newFreezeOwned,
      freezes_used: currentProgression?.freezes_used ?? 0,
      last_active_date: currentProgression?.last_active_date ?? null,
      last_reward_claim_at: nowIso,
    },
    supabase
  );

  await insertMissionProgressEvent(
    {
      profileId: profile.id,
      missionId: mission.id,
      eventType: 'MISSION_CLAIMED',
      payload: {
        xpReward,
        freezeTokensReward,
        nextStatus,
        nextEligibleAt,
      },
    },
    supabase
  );

  const refreshed = await getMissionsWithState({ profileId: profile.id, locale }, supabase);
  const updated = refreshed.find((item) => item.code === missionCode);

  if (!updated) {
    return NextResponse.json({ error: 'Nie udało się odświeżyć misji po odebraniu nagrody.' }, { status: 500 });
  }

  return NextResponse.json({
    mission: mapMissionState(updated, locale, new Date()),
    progression: {
      xp: newXpTotal,
      level: newLevel,
      freezeTokensOwned: newFreezeOwned,
      xpAwarded: xpReward,
      freezeTokensAwarded: freezeTokensReward,
    },
  });
}
