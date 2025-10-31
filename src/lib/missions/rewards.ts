const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 150 },
  { level: 3, xp: 400 },
  { level: 4, xp: 800 },
  { level: 5, xp: 1400 },
  { level: 6, xp: 2200 },
  { level: 7, xp: 3200 },
  { level: 8, xp: 4400 },
  { level: 9, xp: 5800 },
  { level: 10, xp: 7400 },
];

export function getLevelForXp(totalXp: number): number {
  let currentLevel = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (totalXp >= threshold.xp) {
      currentLevel = threshold.level;
    } else {
      break;
    }
  }
  return currentLevel;
}

export function getNextLevelThreshold(currentLevel: number): { level: number; xp: number } | null {
  const next = LEVEL_THRESHOLDS.find((threshold) => threshold.level === currentLevel + 1);
  return next ?? null;
}

export function getLevelProgress(totalXp: number): {
  level: number;
  currentXp: number;
  currentLevelFloor: number;
  nextLevelXp: number | null;
  progressToNext: number;
} {
  const level = getLevelForXp(totalXp);
  const currentThreshold = LEVEL_THRESHOLDS.find((threshold) => threshold.level === level)!;
  const nextThreshold = getNextLevelThreshold(level);

  const currentLevelFloor = currentThreshold?.xp ?? 0;
  const nextLevelXp = nextThreshold?.xp ?? null;

  let progressToNext = 1;
  if (nextLevelXp !== null) {
    const range = nextLevelXp - currentLevelFloor;
    const progress = totalXp - currentLevelFloor;
    progressToNext = range > 0 ? Math.min(1, Math.max(0, progress / range)) : 1;
  }

  return {
    level,
    currentXp: totalXp,
    currentLevelFloor,
    nextLevelXp,
    progressToNext,
  };
}
