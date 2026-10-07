/**
 * Server-side mission rulebook (mirrors frontend data, authoritative bounds).
 * The server recomputes XP — it never trusts client-submitted totals.
 */
export interface MissionRule {
  id: string;
  difficulty: number;
  baseXp: number;
  maxThreats: number;
  maxObjectives: number;
}

export const MISSION_RULES: Record<string, MissionRule> = {
  m1: { id: "m1", difficulty: 1, baseXp: 250, maxThreats: 1, maxObjectives: 5 },
  m2: { id: "m2", difficulty: 2, baseXp: 400, maxThreats: 2, maxObjectives: 6 },
  m3: { id: "m3", difficulty: 3, baseXp: 600, maxThreats: 2, maxObjectives: 5 },
  m4: { id: "m4", difficulty: 4, baseXp: 850, maxThreats: 3, maxObjectives: 6 },
  m5: { id: "m5", difficulty: 5, baseXp: 1200, maxThreats: 3, maxObjectives: 5 },
};

export const MAX_SCORE_PER_ATTEMPT = 12000;
export const MAX_XP_PER_ATTEMPT = 5000;

export const LEVEL_THRESHOLDS = [0, 500, 1200, 2000, 3000, 4500, 6500, 9000, 12000, 16000];

export function levelFromXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  for (let l = 1; l <= LEVEL_THRESHOLDS.length; l++) {
    if (xp >= LEVEL_THRESHOLDS[l - 1]) level = l;
  }
  return level;
}

const RANKS = [
  "Junior Analyst",
  "Security Analyst",
  "Network Defender",
  "Incident Responder",
  "Security Specialist",
  "SOC Specialist",
  "Cyber Defense Expert",
  "Senior Security Analyst",
  "Threat Intelligence Specialist",
  "Cyber Defense Commander",
];

export function rankForLevel(level: number): string {
  return RANKS[Math.min(RANKS.length, Math.max(1, level)) - 1];
}

export interface ValidatedResult {
  xpEarned: number;
  achievements: string[];
}

/** Recompute XP + achievement unlocks from a validated mission result. */
export function adjudicateMission(input: {
  missionId: string;
  success: boolean;
  score: number;
  accuracy: number;
  avgResponseTimeSec: number;
  threatsNeutralized: number;
  incorrectDecisions: number;
  networkHealthPct: number;
  objectivesDone: number;
  objectivesTotal: number;
  isReplay: boolean;
  prevBestScore: number | null;
}): ValidatedResult {
  const rule = MISSION_RULES[input.missionId];
  if (!rule) throw new Error("unknown mission");
  // Plausibility: score must be achievable (generous upper bound).
  const plausibleMax = input.threatsNeutralized * 1200 + (input.success ? 1000 : 0) + 2000;
  if (input.score > Math.min(plausibleMax, MAX_SCORE_PER_ATTEMPT)) {
    throw new Error("score out of bounds");
  }
  if (input.threatsNeutralized > rule.maxThreats || input.objectivesDone > rule.maxObjectives) {
    throw new Error("result exceeds mission bounds");
  }
  let xp = 0;
  if (input.success) {
    xp += input.isReplay ? Math.round(rule.baseXp * 0.25) : rule.baseXp;
    if (input.networkHealthPct === 100) xp += 100;
    if (input.avgResponseTimeSec < 5) xp += 50;
    if (input.incorrectDecisions === 0 && input.networkHealthPct >= 95 && input.avgResponseTimeSec < 5) xp += 200;
    if (input.prevBestScore !== null && input.score > input.prevBestScore) xp += 50;
  } else {
    xp += Math.round(rule.baseXp * 0.25);
  }
  const achievements: string[] = [];
  if (input.success && input.networkHealthPct === 100) achievements.push("zero-damage");
  if (input.success && rule.maxThreats >= 2 && input.threatsNeutralized >= 2) achievements.push("network-savior");
  if (
    input.success &&
    input.incorrectDecisions === 0 &&
    input.avgResponseTimeSec < 5 &&
    input.networkHealthPct >= 95
  ) {
    achievements.push("perfect-response");
  }
  return { xpEarned: Math.min(xp, MAX_XP_PER_ATTEMPT), achievements };
}
