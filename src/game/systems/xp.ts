/**
 * Player progression math — thin wrappers over the central tables in
 * game/systems/progression.ts. Pure functions, safe to unit test.
 */
import {
  LEVEL_THRESHOLDS,
  MAX_LEVEL,
  levelFromXp as progLevelFromXp,
  levelProgressFromXp,
  rankForLevel,
  xpSpanForLevel,
  xpToNextLevel as progXpToNext,
} from "./progression";

/** XP required to advance FROM `level` TO `level + 1` (0 at max level). */
export function xpForLevel(level: number): number {
  return xpSpanForLevel(level);
}

/** Total cumulative XP required to reach `level` (level 1 = 0). */
export function totalXpForLevel(level: number): number {
  const clamped = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  return LEVEL_THRESHOLDS[clamped - 1];
}

/** Derive level (1-based) from lifetime XP. */
export function levelFromXp(totalXp: number): number {
  return progLevelFromXp(totalXp);
}

/** XP progress within the current level: 0–1. */
export function levelProgress(totalXp: number): number {
  return levelProgressFromXp(totalXp);
}

export function levelTitle(level: number): string {
  return rankForLevel(level).name;
}

export function rankDescription(level: number): string {
  return rankForLevel(level).description;
}

/** XP remaining to the next level (0 at max). */
export function xpToNext(totalXp: number): number {
  return progXpToNext(totalXp);
}

/** Apply XP: returns new totals + level-up info. Lifetime XP never decreases. */
export function applyXp(
  currentLevel: number,
  currentXp: number,
  earned: number,
): { xp: number; level: number; leveledUp: boolean; levelsGained: number } {
  const xp = Math.max(0, currentXp + Math.max(0, Math.floor(earned)));
  const level = levelFromXp(xp);
  return {
    xp,
    level,
    leveledUp: level > currentLevel,
    levelsGained: Math.max(0, level - currentLevel),
  };
}

/** Network health 0–100 from device health values. */
export function networkHealth(deviceHealth: number[]): number {
  if (deviceHealth.length === 0) return 100;
  const sum = deviceHealth.reduce((a, b) => a + Math.min(100, Math.max(0, b)), 0);
  return Math.round(sum / deviceHealth.length);
}
