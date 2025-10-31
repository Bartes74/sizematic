import type { SupabaseClient } from '@supabase/supabase-js';
import type { MissionStatus, UserMissionState } from '@/lib/types';
import { getMissionsWithState, upsertMissionState, insertMissionProgressEvent } from '@/lib/missions/queries';
import { findMissionDefinition, determineInitialStatus } from '@/lib/missions/progression';

export type MissionEvent =
  | {
      type: 'ITEM_CREATED';
      profileId: string;
      payload: {
        source: 'measurement' | 'garment' | 'size_label' | 'wishlist' | 'trusted_circle' | 'other';
        category?: string;
        subtype?: string | null;
        createdAt: string;
        fieldCount?: number;
        criticalFieldCompleted?: boolean;
        uniqueHash?: string;
        wishlistId?: string;
        matchedSize?: string | null;
      };
    };

type MissionHandlerContext = {
  missionId: string;
  profileId: string;
  definitionCode: string;
  state: UserMissionState | null;
  event: MissionEvent;
  supabase: SupabaseClient;
};

type MissionHandlerResult = {
  status?: MissionStatus;
  progress?: Record<string, unknown>;
  nextEligibleAt?: string | null;
  logs?: Record<string, unknown>;
};

type MissionHandler = (context: MissionHandlerContext) => Promise<MissionHandlerResult | null>;

const MISSION_EVENT_HANDLERS: Record<string, MissionHandler> = {
  ROZRUCH_7_7: handleRozruchSevenSeven,
  SIX_PILLARS: handleSixPillars,
  WISHLIST_PRO: handleWishlistPro,
  STREAK_RESCUER: handleStreakRescuer,
  SECRET_HELPER: handleSecretHelper,
};

export async function processMissionEvent(event: MissionEvent, supabase: SupabaseClient) {
  const missions = await getMissionsWithState({ profileId: event.profileId, locale: 'pl' }, supabase);

  const relevantMissions = missions.filter((mission) => {
    const definition = findMissionDefinition(mission.code);
    if (!definition) return false;
    return definition.triggers.includes(event.type);
  });

  const nowIso = new Date().toISOString();

  for (const mission of relevantMissions) {
    const handler = MISSION_EVENT_HANDLERS[mission.code];
    if (!handler) continue;

    const result = await handler({
      missionId: mission.id,
      profileId: event.profileId,
      definitionCode: mission.code,
      state: mission.userState ?? null,
      event,
      supabase,
    });

    if (!result) continue;

    const missionDefinition = findMissionDefinition(mission.code);
    if (!missionDefinition) {
      continue;
    }

    const nextStatus =
      result.status ?? mission.userState?.status ?? determineInitialStatus(missionDefinition, new Date());

    const progress = result.progress ?? mission.userState?.progress ?? {};

    await upsertMissionState(
      {
        profileId: event.profileId,
        missionId: mission.id,
        status: nextStatus,
        progress,
        streakCounter: typeof progress === 'object' && progress !== null && 'streak' in progress
          ? Number((progress as { streak: number }).streak) || 0
          : mission.userState?.streak_counter ?? 0,
        attempts: mission.userState?.attempts ?? 0,
        startedAt:
          mission.userState?.started_at ??
          (nextStatus === 'in_progress' && mission.userState?.status !== 'in_progress' ? nowIso : mission.userState?.started_at ?? null),
        completedAt: mission.userState?.completed_at ?? null,
        nextEligibleAt: result.nextEligibleAt ?? mission.userState?.next_eligible_at ?? null,
        lastEventAt: nowIso,
      },
      supabase
    );

    await insertMissionProgressEvent(
      {
        profileId: event.profileId,
        missionId: mission.id,
        eventType: event.type,
        payload: {
          progress,
          status: nextStatus,
          logs: result.logs,
        },
      },
      supabase
    );
  }
}

async function handleRozruchSevenSeven(
  context: MissionHandlerContext
): Promise<MissionHandlerResult | null> {
  const { event, state } = context;

  if (event.type !== 'ITEM_CREATED') {
    return null;
  }

  const { payload } = event;
  const fieldCount = payload.fieldCount ?? 0;
  if (fieldCount < 3 && !payload.criticalFieldCompleted) {
    return null;
  }

  const day = payload.createdAt.slice(0, 10);

  const previousProgress = (state?.progress ?? {}) as {
    streak?: number;
    lastDay?: string;
    completedDays?: string[];
  };

  const lastDay = previousProgress.lastDay ?? null;
  const completedDays = new Set(previousProgress.completedDays ?? []);

  if (completedDays.has(day)) {
    return null;
  }

  let streak = previousProgress.streak ?? 0;

  if (!lastDay) {
    streak = 1;
  } else {
    const diffDays = differenceInDays(lastDay, day);
    if (diffDays === 0) {
      return null;
    }
    if (diffDays === 1) {
      streak += 1;
    } else {
      streak = 1;
    }
  }

  completedDays.add(day);

  const progress = {
    streak,
    lastDay: day,
    completedDays: Array.from(completedDays).sort(),
  };

  const status: MissionStatus =
    streak >= 7 ? 'claimable' : (state?.status && state.status !== 'completed' ? 'in_progress' : 'in_progress');

  return {
    status,
    progress,
    logs: {
      streak,
      day,
    },
  };
}

function differenceInDays(previous: string, current: string): number {
  const prevDate = new Date(`${previous}T00:00:00Z`);
  const currentDate = new Date(`${current}T00:00:00Z`);
  const diff = currentDate.getTime() - prevDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const SIX_PILLARS_REQUIRED = ['outerwear', 'tops', 'bottoms', 'headwear', 'accessories', 'footwear'];

async function handleSixPillars(
  context: MissionHandlerContext
): Promise<MissionHandlerResult | null> {
  const { event, supabase, profileId, state } = context;

  if (event.type !== 'ITEM_CREATED') {
    return null;
  }

  const [garments, sizeLabels, measurements] = await Promise.all([
    supabase.from('garments').select('category').eq('profile_id', profileId),
    supabase.from('size_labels').select('category').eq('profile_id', profileId),
    supabase.from('measurements').select('category').eq('profile_id', profileId),
  ]);

  const present = new Set<string>();

  const collect = (rows?: { category?: string | null }[] | null) => {
    (rows ?? []).forEach((row) => {
      if (!row || !row.category) return;
      const normalized = row.category.toLowerCase();
      present.add(normalized);
      if (normalized === 'headwear') {
        present.add('lingerie'); // alias for clarity
      }
      if (normalized === 'accessories') {
        present.add('jewelry');
      }
    });
  };

  collect(garments.data as { category?: string | null }[] | null);
  collect(sizeLabels.data as { category?: string | null }[] | null);
  collect(measurements.data as { category?: string | null }[] | null);

  const completed = SIX_PILLARS_REQUIRED.filter((category) => present.has(category));
  const missing = SIX_PILLARS_REQUIRED.filter((category) => !present.has(category));

  const progress = {
    required: SIX_PILLARS_REQUIRED,
    completed,
    missing,
    updatedAt: new Date().toISOString(),
  };

  const status: MissionStatus =
    missing.length === 0
      ? 'claimable'
      : state?.status === 'completed'
      ? 'completed'
      : 'in_progress';

  return {
    status,
    progress,
  };
}

async function handleWishlistPro(
  context: MissionHandlerContext
): Promise<MissionHandlerResult | null> {
  const { event, supabase, profileId, state } = context;

  if (event.type !== 'ITEM_CREATED') {
    return null;
  }

  if (event.payload.source !== 'wishlist') {
    return null;
  }

  const { data: wishlists, error: wishlistsError } = await supabase
    .from('wishlists')
    .select('id')
    .eq('owner_profile_id', profileId);

  if (wishlistsError) {
    throw new Error(`Failed to load wishlists for missions: ${wishlistsError.message}`);
  }

  const wishlistIds = (wishlists ?? []).map((row) => row.id);

  let count = 0;
  if (wishlistIds.length > 0) {
    const { count: matchedCount, error: countError } = await supabase
      .from('wishlist_items')
      .select('id', { count: 'exact', head: true })
      .in('wishlist_id', wishlistIds)
      .not('matched_size', 'is', null);

    if (countError) {
      throw new Error(`Failed to count wishlist items: ${countError.message}`);
    }

    count = matchedCount ?? 0;
  }

  const progress = {
    itemsWithSizes: count,
    required: 5,
  };

  const status: MissionStatus =
    count >= 5
      ? 'claimable'
      : state?.status === 'completed'
      ? 'completed'
      : state?.status === 'cooldown'
      ? 'cooldown'
      : 'in_progress';

  return {
    status,
    progress,
  };
}

const STREAK_REQUIRED_DAYS = 14;

async function handleStreakRescuer(
  context: MissionHandlerContext
): Promise<MissionHandlerResult | null> {
  const { event, supabase, profileId, state } = context;

  if (event.type !== 'ITEM_CREATED') {
    return null;
  }

  if (!event.payload.category || event.payload.category === 'wishlist-share') {
    return null;
  }

  const { data: progression, error: progressionError } = await supabase
    .from('profile_progression')
    .select('current_streak, freezes_owned')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (progressionError) {
    throw new Error(`Failed to load profile progression: ${progressionError.message}`);
  }

  const streak = progression?.current_streak ?? 0;
  const freezesOwned = progression?.freezes_owned ?? 0;

  const progress = {
    streak,
    required: STREAK_REQUIRED_DAYS,
    freezesOwned,
  };

  const status: MissionStatus =
    streak >= STREAK_REQUIRED_DAYS
      ? 'claimable'
      : state?.status === 'completed'
      ? 'completed'
      : 'in_progress';

  return {
    status,
    progress,
  };
}

async function handleSecretHelper(
  context: MissionHandlerContext
): Promise<MissionHandlerResult | null> {
  const { event, supabase, profileId, state } = context;

  if (event.type !== 'ITEM_CREATED') {
    return null;
  }

  if (event.payload.source !== 'trusted_circle') {
    return null;
  }

  const { count, error } = await supabase
    .from('trusted_circle_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('owner_profile_id', profileId);

  if (error) {
    throw new Error(`Failed to count trusted circle members: ${error.message}`);
  }

  const membersCount = count ?? 0;

  return {
    status: membersCount >= 1 ? 'claimable' : state?.status ?? 'in_progress',
    progress: {
      members: membersCount,
      required: 1,
    },
  };
}
