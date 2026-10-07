/**
 * Modular scoring for the network-defense simulation.
 * Pure functions — safe to unit test, no side effects.
 *
 * Point table (Phase 2 mission design):
 *   investigate (intel, no containment) .... +100
 *   optimal containment ................... +500
 *   suboptimal containment (isolate w/ cost) +300
 *   fast response bonus (<10s) ............. +200
 *   wrong action .......................... -100
 *   ignored threat ........................ -150
 *   mission completion bonus .............. +1000
 */

export const POINTS = {
  INVESTIGATE: 100,
  CONTAIN_OPTIMAL: 500,
  CONTAIN_SUBOPTIMAL: 300,
  FAST_RESPONSE_BONUS: 200,
  FAST_RESPONSE_WINDOW_SEC: 10,
  WRONG_ACTION: -100,
  IGNORE_THREAT: -150,
  MISSION_COMPLETE: 1000,
  UNNECESSARY_ISOLATION: -50,
  ESCALATION_PENALTY: -50,
  ISOLATE_HEALTH_COST: 5,
  INVESTIGATE_TIME_COST_SEC: 5,
  IGNORE_HEALTH_COST: 10,
  WRONG_HEALTH_COST: 5,
  IGNORE_ESCALATION_LIMIT: 3,
  MAX_ESCALATION_LEVEL: 5,
} as const;

export function investigatePoints(): number {
  return POINTS.INVESTIGATE;
}

export function containmentPoints(suboptimal: boolean, responseSec: number): number {
  const base = suboptimal ? POINTS.CONTAIN_SUBOPTIMAL : POINTS.CONTAIN_OPTIMAL;
  const fast = responseSec < POINTS.FAST_RESPONSE_WINDOW_SEC ? POINTS.FAST_RESPONSE_BONUS : 0;
  return base + fast;
}

/** Mission score: containment rewards + completion bonus, minus mistakes/damage/escalation. */
export function missionScore(
  threatsNeutralized: number,
  incorrectDecisions: number,
  avgResponseTimeSec: number,
  networkDamagePct: number,
  success: boolean,
  escalations = 0,
): number {
  const base = Math.max(0, threatsNeutralized) * 500;
  const completion = success ? POINTS.MISSION_COMPLETE : 0;
  const speedBonus = Math.max(0, 2000 - Math.max(0, avgResponseTimeSec) * 120);
  const mistakePenalty = Math.max(0, incorrectDecisions) * 400;
  const damagePenalty = Math.min(100, Math.max(0, networkDamagePct)) * 25;
  const escalationPenalty = Math.max(0, escalations) * Math.abs(POINTS.ESCALATION_PENALTY);
  return Math.max(
    0,
    Math.round(base + completion + speedBonus - mistakePenalty - damagePenalty - escalationPenalty),
  );
}

import type { PerformanceRating } from "../../types/game";

/**
 * Composite performance rating — S ≥95, A+ 90–94, A 85–89, B 75–84,
 * C 65–74, D 50–64, F below 50.
 */
export function performanceRating(args: {
  accuracyPct: number;
  networkHealthPct: number;
  avgResponseSec: number;
}): PerformanceRating {
  const a = Math.min(100, Math.max(0, args.accuracyPct));
  const h = Math.min(100, Math.max(0, args.networkHealthPct));
  const speed = Math.min(100, Math.max(0, 100 - Math.max(0, args.avgResponseSec - 5) * 4));
  const composite = a * 0.5 + h * 0.3 + speed * 0.2;
  if (composite >= 95) return "S";
  if (composite >= 90) return "A_PLUS";
  if (composite >= 85) return "A";
  if (composite >= 75) return "B";
  if (composite >= 65) return "C";
  if (composite >= 50) return "D";
  return "F";
}
