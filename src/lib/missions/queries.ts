import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildMissionSeedRows } from '@/data/missions';
import { findMissionDefinition, determineInitialStatus } from '@/lib/missions/progression';
import type {
  Mission,
  MissionTranslation,
  MissionStatus,
  UserMissionState,
  ProfileProgression,
  MissionRewardLedger,
} from '@/lib/types';

export type MissionWithContent = Mission & {
  translations: MissionTranslation[];
  userState?: UserMissionState | null;
};

export type MissionListOptions = {
  profileId: string;
  locale: 'pl' | 'en';
};

async function ensureMissionStatesForProfile(profileId: string, supabase: SupabaseClient, now: Date) {
  const [{ data: missions, error: missionsError }, { data: states, error: statesError }] = await Promise.all([
    supabase.from('missions').select('id, code'),
    supabase.from('user_mission_states').select('mission_id, status').eq('profile_id', profileId),
  ]);

  if (missionsError) {
    throw new Error(`Nie udało się pobrać misji przy inicjalizacji stanu: ${missionsError.message}`);
  }
  if (statesError) {
    throw new Error(`Nie udało się pobrać stanu misji użytkownika: ${statesError.message}`);
  }

  const existing = new Set((states ?? []).map((state) => state.mission_id));

  for (const mission of missions ?? []) {
    if (existing.has(mission.id)) continue;
    const definition = mission.code ? findMissionDefinition(mission.code) : null;
    const initialStatus: MissionStatus = definition ? determineInitialStatus(definition, now) : 'available';

    const { error: insertError } = await supabase.from('user_mission_states').insert({
      profile_id: profileId,
      mission_id: mission.id,
      status: initialStatus,
      progress: {},
      started_at: initialStatus === 'in_progress' ? now.toISOString() : null,
    });

    if (insertError) {
      throw new Error(`Nie udało się utworzyć stanu misji ${mission.code}: ${insertError.message}`);
    }
  }
}

async function ensureMissionsSeeded(supabase: SupabaseClient): Promise<void> {
  const { data: missionRows, error: missionListError } = await supabase.from('missions').select('id, code');
  if (missionListError) {
    throw new Error(`Nie udało się pobrać listy misji: ${missionListError.message}`);
  }

  const missionMap = new Map<string, string>();
  (missionRows ?? []).forEach((row) => {
    missionMap.set(row.code, row.id);
  });

  const seeds = buildMissionSeedRows();

  for (const seed of seeds) {
    const payload = {
      ...seed.mission,
      ...(missionMap.has(seed.mission.code) ? { id: missionMap.get(seed.mission.code) } : {}),
    };

    const { data: upserted, error: upsertError } = await supabase
      .from('missions')
      .upsert(payload, { onConflict: 'code' })
      .select('id, code')
      .eq('code', seed.mission.code)
      .maybeSingle();

    if (upsertError) {
      throw new Error(`Nie udało się zapisać misji ${seed.mission.code}: ${upsertError.message}`);
    }

    const missionId = upserted?.id ?? missionMap.get(seed.mission.code);
    if (!missionId) {
      throw new Error(`Nie udało się ustalić identyfikatora misji ${seed.mission.code}`);
    }

    missionMap.set(seed.mission.code, missionId);

    const translationsPayload = seed.translations.map((translation) => ({
      mission_id: missionId,
      locale: translation.locale,
      title: translation.title,
      summary: translation.summary,
      reward_short: translation.rewardShort,
      cta_label: translation.ctaLabel ?? null,
    }));

    const { error: translationError } = await supabase
      .from('mission_translations')
      .upsert(translationsPayload, { onConflict: 'mission_id,locale' });

    if (translationError) {
      throw new Error(`Nie udało się zapisać tłumaczeń misji ${seed.mission.code}: ${translationError.message}`);
    }
  }
}

export async function getMissionsWithState(
  options: MissionListOptions,
  supabaseClient?: SupabaseClient
): Promise<MissionWithContent[]> {
  const supabase = supabaseClient ?? (await createClient());
  await ensureMissionsSeeded(supabase);
  await ensureMissionStatesForProfile(options.profileId, supabase, new Date());

  const [{ data: missionRows, error: missionError }, { data: translationRows, error: translationError }] =
    await Promise.all([
      supabase.from('missions').select('*').order('display_order', { ascending: true }),
      supabase.from('mission_translations').select('*'),
    ]);

  if (missionError) {
    throw new Error(`Nie udało się pobrać misji: ${missionError.message}`);
  }
  if (translationError) {
    throw new Error(`Nie udało się pobrać tłumaczeń misji: ${translationError.message}`);
  }

  const missions = (missionRows ?? []) as Mission[];
  const translations = (translationRows ?? []) as MissionTranslation[];

  const { data: states, error: stateError } = await supabase
    .from('user_mission_states')
    .select('*')
    .eq('profile_id', options.profileId);

  if (stateError) {
    throw new Error(`Nie udało się pobrać stanu misji użytkownika: ${stateError.message}`);
  }

  const stateMap = new Map<string, UserMissionState>();
  (states ?? []).forEach((state) => {
    stateMap.set(state.mission_id, state as UserMissionState);
  });

  return missions.map((mission) => ({
    ...mission,
    translations: translations.filter((translation) => translation.mission_id === mission.id),
    userState: stateMap.get(mission.id) ?? null,
  }));
}

export async function upsertMissionState(input: {
  profileId: string;
  missionId: string;
  status?: MissionStatus;
  progress?: Record<string, unknown>;
  streakCounter?: number;
  attempts?: number;
  startedAt?: string | null;
  completedAt?: string | null;
  nextEligibleAt?: string | null;
  lastEventAt?: string | null;
}, supabaseClient?: SupabaseClient) {
  const supabase = supabaseClient ?? (await createClient());
  const { error } = await supabase.from('user_mission_states').upsert({
    profile_id: input.profileId,
    mission_id: input.missionId,
    status: input.status,
    progress: input.progress,
    streak_counter: input.streakCounter,
    attempts: input.attempts,
    started_at: input.startedAt,
    completed_at: input.completedAt,
    next_eligible_at: input.nextEligibleAt,
    last_event_at: input.lastEventAt,
  });
  if (error) {
    throw new Error(`Nie udało się zaktualizować stanu misji: ${error.message}`);
  }
}

export async function insertMissionProgressEvent(
  input: {
  profileId: string;
  missionId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  },
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient ?? (await createClient());
  const { error } = await supabase.from('mission_progress_events').insert({
    profile_id: input.profileId,
    mission_id: input.missionId,
    event_type: input.eventType,
    payload: input.payload ?? {},
  });
  if (error) {
    throw new Error(`Nie udało się zapisać zdarzenia misji: ${error.message}`);
  }
}

export async function addMissionReward(
  input: {
  profileId: string;
  missionId: string;
  source: string;
  xp: number;
  rewards?: Record<string, unknown>;
  },
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient ?? (await createClient());
  const { error } = await supabase.from('mission_reward_ledger').insert({
    profile_id: input.profileId,
    mission_id: input.missionId,
    source: input.source,
    xp: input.xp,
    rewards: input.rewards ?? {},
  });
  if (error) {
    throw new Error(`Nie udało się zapisać nagrody: ${error.message}`);
  }
}

export async function getProfileProgression(
  profileId: string,
  supabaseClient?: SupabaseClient
): Promise<ProfileProgression | null> {
  const supabase = supabaseClient ?? (await createClient());
  const { data, error } = await supabase
    .from('profile_progression')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Nie udało się pobrać progresji profilu: ${error.message}`);
  }

  return (data as ProfileProgression | null) ?? null;
}

export async function upsertProfileProgression(
  input: Partial<ProfileProgression> & { profile_id: string },
  supabaseClient?: SupabaseClient
) {
  const supabase = supabaseClient ?? (await createClient());
  const { error } = await supabase.from('profile_progression').upsert(input);
  if (error) {
    throw new Error(`Nie udało się zaktualizować progresji profilu: ${error.message}`);
  }
}

export async function listMissionRewards(
  profileId: string,
  supabaseClient?: SupabaseClient
): Promise<MissionRewardLedger[]> {
  const supabase = supabaseClient ?? (await createClient());
  const { data, error } = await supabase
    .from('mission_reward_ledger')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Nie udało się pobrać nagród: ${error.message}`);
  }

  return (data ?? []) as MissionRewardLedger[];
}
