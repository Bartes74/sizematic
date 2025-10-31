import type { MissionStatus as ApiMissionStatus } from '@/lib/types';

export type MissionStatus = ApiMissionStatus;

export type MissionTranslation = {
  locale: string;
  title: string;
  summary: string;
  reward_short: string | null;
  cta_label: string | null;
};

export type MissionRules = {
  triggers?: string[];
  criterion?: string;
  progress?: string;
  validation?: string[];
  timeframe?: string;
  notes?: string[];
  antiCheat?: string[];
};

export type MissionRewards = {
  xp?: number;
  badges?: string[];
  unlocks?: string[];
  premiumDays?: number;
  freezeTokens?: number;
  boosters?: Array<{ type: string; value: string }>;
  extras?: string[];
};

export type MissionMetadata = {
  rewardSummary?: string;
  requirementsSummary?: string;
  repeatability?: string;
};

export type MissionUserState = {
  status: MissionStatus;
  progress: Record<string, unknown>;
  streakCounter: number;
  attempts: number;
  startedAt: string | null;
  completedAt: string | null;
  nextEligibleAt: string | null;
  lastEventAt: string | null;
};

export type MissionState = {
  id: string;
  code: string;
  status: MissionStatus;
  repeatable: boolean;
  cooldownDays: number;
  rules: MissionRules;
  rewards: MissionRewards;
  metadata: MissionMetadata;
  translation: MissionTranslation | null;
  userState: MissionUserState | null;
};

export type MissionCategoryGroup = {
  label: string;
  description: string;
  missions: MissionState[];
};
