/**
 * Adaptive difficulty engine — controlled ±1-step adjustments from
 * performance signals. Never jumps wildly, never punishes unfairly.
 */
import type { DifficultyName, DifficultyState, PlayerAnalysis } from "./aiTypes";

const ORDER: DifficultyName[] = ["EASY", "NORMAL", "HARD", "EXPERT", "ELITE"];

const PRESETS: Record<DifficultyName, Omit<DifficultyState, "tier" | "reason">> = {
  EASY: { level: 1, escalationPacing: 1.6, timerMultiplier: 1.5, maxIncidents: 1 },
  NORMAL: { level: 2, escalationPacing: 1.25, timerMultiplier: 1.25, maxIncidents: 2 },
  HARD: { level: 3, escalationPacing: 1.0, timerMultiplier: 1.0, maxIncidents: 3 },
  EXPERT: { level: 4, escalationPacing: 0.8, timerMultiplier: 0.9, maxIncidents: 4 },
  ELITE: { level: 5, escalationPacing: 0.65, timerMultiplier: 0.8, maxIncidents: 4 },
};

export function difficultyFromAnalysis(a: PlayerAnalysis): DifficultyName {
  return a.recommendedDifficulty;
}

export function difficultyState(tier: DifficultyName, reason: string): DifficultyState {
  return { tier, ...PRESETS[tier], reason };
}

/**
 * Adapt one step at most toward the recommended tier.
 * - success ≥90% + excellent response + health ≥95 → step up
 * - failure ≥40% or poor response/health → step down
 * - otherwise hold (hysteresis against oscillation)
 */
export function adaptDifficulty(
  current: DifficultyName,
  a: PlayerAnalysis,
): { next: DifficultyName; reason: string } {
  const idx = ORDER.indexOf(current);
  const target = ORDER.indexOf(a.recommendedDifficulty);
  const failRate = 1 - a.missionSuccessRate;
  const excellent = a.averageResponseTime > 0 && a.averageResponseTime < 5 && a.averageNetworkHealth >= 95;
  const struggling = failRate > 0.4 || (a.averageResponseTime >= 20 && a.missionsSampled > 0) || a.averageNetworkHealth < 60;

  if (excellent && a.missionSuccessRate > 0.9 && idx < target) {
    const next = ORDER[Math.min(ORDER.length - 1, idx + 1)];
    return { next, reason: `Success ${(a.missionSuccessRate * 100).toFixed(0)}% with excellent response — stepping ${current} → ${next}.` };
  }
  if (struggling && idx > 0) {
    const next = ORDER[idx - 1];
    return { next, reason: `Failure ${(failRate * 100).toFixed(0)}% / health ${a.averageNetworkHealth}% — easing ${current} → ${next} to rebuild fundamentals.` };
  }
  if (idx < target && a.missionSuccessRate >= 0.75 && a.recentTrend !== "DECLINING") {
    const next = ORDER[idx + 1];
    return { next, reason: `Steady ${(a.missionSuccessRate * 100).toFixed(0)}% success — advancing ${current} → ${next}.` };
  }
  if (idx > target && a.recentTrend === "DECLINING") {
    const next = ORDER[idx - 1];
    return { next, reason: `Declining trend (${a.trendDelta}) — easing ${current} → ${next}.` };
  }
  return { next: current, reason: `Performance stable — holding ${current}.` };
}

export function difficultyLevelName(level: number): string {
  return ["", "TRAINING", "STANDARD", "ADVANCED", "EXPERT", "ELITE"][Math.min(5, Math.max(1, level))] ?? "STANDARD";
}
