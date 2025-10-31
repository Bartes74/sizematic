import type { MissionWithContent } from '@/lib/missions/queries';
import { determineInitialStatus, findMissionDefinition } from '@/lib/missions/progression';
import type {
  MissionState,
  MissionTranslation,
  MissionUserState,
  MissionRules,
  MissionRewards,
  MissionMetadata,
  MissionStatus,
} from '@/lib/missions/types';

function normalizeTranslation(translation: unknown): MissionTranslation | null {
  if (!translation || typeof translation !== 'object') return null;
  const record = translation as Record<string, unknown>;
  return {
    locale: typeof record.locale === 'string' ? record.locale : 'pl',
    title: typeof record.title === 'string' ? record.title : '',
    summary: typeof record.summary === 'string' ? record.summary : '',
    reward_short: typeof record.reward_short === 'string' ? record.reward_short : null,
    cta_label: typeof record.cta_label === 'string' ? record.cta_label : null,
  };
}

function normalizeRules(rules: unknown): MissionRules {
  if (!rules || typeof rules !== 'object') return {};
  const record = rules as Record<string, unknown>;
  return {
    triggers: Array.isArray(record.triggers) ? (record.triggers as string[]) : undefined,
    criterion: typeof record.criterion === 'string' ? record.criterion : undefined,
    progress: typeof record.progress === 'string' ? record.progress : undefined,
    validation: Array.isArray(record.validation) ? (record.validation as string[]) : undefined,
    timeframe: typeof record.timeframe === 'string' ? record.timeframe : undefined,
    notes: Array.isArray(record.notes) ? (record.notes as string[]) : undefined,
    antiCheat: Array.isArray(record.antiCheat) ? (record.antiCheat as string[]) : undefined,
  };
}

function normalizeRewards(rewards: unknown): MissionRewards {
  if (!rewards || typeof rewards !== 'object') return {};
  const record = rewards as Record<string, unknown>;
  return {
    xp: typeof record.xp === 'number' ? record.xp : undefined,
    badges: Array.isArray(record.badges) ? (record.badges as string[]) : undefined,
    unlocks: Array.isArray(record.unlocks) ? (record.unlocks as string[]) : undefined,
    premiumDays: typeof record.premiumDays === 'number' ? record.premiumDays : undefined,
    freezeTokens: typeof record.freezeTokens === 'number' ? record.freezeTokens : undefined,
    boosters: Array.isArray(record.boosters)
      ? (record.boosters as Array<{ type: string; value: string }>)
      : undefined,
    extras: Array.isArray(record.extras) ? (record.extras as string[]) : undefined,
  };
}

function normalizeMetadata(metadata: unknown): MissionMetadata {
  if (!metadata || typeof metadata !== 'object') return {};
  const record = metadata as Record<string, unknown>;
  return {
    rewardSummary: typeof record.rewardSummary === 'string' ? record.rewardSummary : undefined,
    requirementsSummary: typeof record.requirementsSummary === 'string' ? record.requirementsSummary : undefined,
    repeatability: typeof record.repeatability === 'string' ? record.repeatability : undefined,
  };
}

function normalizeUserState(state: unknown): MissionUserState | null {
  if (!state || typeof state !== 'object') return null;
  const record = state as Record<string, unknown>;
  return {
    status: (record.status as MissionStatus) ?? 'available',
    progress: typeof record.progress === 'object' && record.progress !== null ? (record.progress as Record<string, unknown>) : {},
    streakCounter: typeof record.streak_counter === 'number' ? record.streak_counter : 0,
    attempts: typeof record.attempts === 'number' ? record.attempts : 0,
    startedAt: typeof record.started_at === 'string' ? record.started_at : null,
    completedAt: typeof record.completed_at === 'string' ? record.completed_at : null,
    nextEligibleAt: typeof record.next_eligible_at === 'string' ? record.next_eligible_at : null,
    lastEventAt: typeof record.last_event_at === 'string' ? record.last_event_at : null,
  };
}

export function mapMissionState(record: MissionWithContent, locale: 'pl' | 'en', now: Date): MissionState {
  const definition = findMissionDefinition(record.code);
  const translation = normalizeTranslation(
    record.translations.find((item) => item.locale === locale) ?? record.translations[0] ?? null
  );

  const status: MissionStatus = record.userState?.status
    ? (record.userState.status as MissionStatus)
    : definition
    ? determineInitialStatus(definition, now)
    : 'available';

  return {
    id: record.id,
    code: record.code,
    status,
    repeatable: record.repeatable,
    cooldownDays: record.cooldown_days,
    rules: normalizeRules(record.rules),
    rewards: normalizeRewards(record.rewards),
    metadata: normalizeMetadata(record.metadata),
    translation,
    userState: normalizeUserState(record.userState),
  };
}
