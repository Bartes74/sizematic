import type { MissionDefinition } from '@/data/missions';
import { MISSION_DEFINITIONS } from '@/data/missions';
import type {
  Mission,
  MissionStatus,
  UserMissionState,
  ProfileProgression,
  MissionRewardLedger,
} from '@/lib/types';

export type MissionEngineContext = {
  profileId: string;
  mission: Mission;
  definition: MissionDefinition;
  state: UserMissionState | null;
  profileProgression: ProfileProgression | null;
  recentEvents: MissionRewardLedger[];
  now: Date;
};

export type MissionEvaluationResult = {
  nextStatus: MissionStatus;
  progress: Record<string, unknown>;
  actions: Array<
    | { type: 'notify'; payload: Record<string, unknown> }
    | { type: 'reward'; xp: number; rewards?: Record<string, unknown> }
    | { type: 'streak_increment'; value: number }
    | { type: 'freeze_grant'; value: number }
  >;
  logs?: Array<{ event: string; payload?: Record<string, unknown> }>;
  nextEligibleAt?: string | null;
};

export function findMissionDefinition(code: string): MissionDefinition | null {
  return MISSION_DEFINITIONS.find((mission) => mission.code === code) ?? null;
}

export function determineInitialStatus(definition: MissionDefinition, now: Date): MissionStatus {
  if (definition.category === 'seasonal' && definition.season) {
    const month = now.getUTCMonth() + 1;
    const { startMonth, endMonth } = definition.season;
    const inSeason =
      startMonth <= endMonth
        ? month >= startMonth && month <= endMonth
        : month >= startMonth || month <= endMonth;

    return inSeason ? 'available' : 'hidden';
  }

  return 'available';
}

export function computeNextState(context: MissionEngineContext): MissionEvaluationResult {
  const { definition, state } = context;

  if (!state) {
    return {
      nextStatus: determineInitialStatus(definition, context.now),
      progress: {},
      actions: [],
    };
  }

  return {
    nextStatus: state.status,
    progress: state.progress,
    actions: [],
  };
}
