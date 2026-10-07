/**
 * Central progression configuration — levels, ranks, XP table, skill rules,
 * replay rules, and unlock gates. The single source of truth for career
 * progression; UI components read, never duplicate, these values.
 * (Future AI-director phases can extend the tables without touching logic.)
 */
import type { Mission, PerformanceRating, SkillKey } from "../../types/game";

/** Total lifetime XP required to reach each level (index 0 = Level 1). */
export const LEVEL_THRESHOLDS = [0, 500, 1200, 2000, 3000, 4500, 6500, 9000, 12000, 16000];

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export interface Rank {
  level: number;
  name: string;
  description: string;
}

export const RANKS: Rank[] = [
  { level: 1, name: "Junior Analyst", description: "New operator. Learning to read alerts and follow the triage loop." },
  { level: 2, name: "Security Analyst", description: "Trusted with live alerts and first-response decisions." },
  { level: 3, name: "Network Defender", description: "Responsible for the health of whole network segments." },
  { level: 4, name: "Incident Responder", description: "You are trusted to investigate and contain active security incidents." },
  { level: 5, name: "Security Specialist", description: "Deep specialism across malware, intrusion, and firewall defense." },
  { level: 6, name: "SOC Specialist", description: "A anchor of the Security Operations Center under multi-threat pressure." },
  { level: 7, name: "Cyber Defense Expert", description: "Recognized expert. Campaigns are planned around your judgment." },
  { level: 8, name: "Senior Security Analyst", description: "Mentor-grade operator handling the hardest simultaneous incidents." },
  { level: 9, name: "Threat Intelligence Specialist", description: "You see campaigns in the noise and stop them before they peak." },
  { level: 10, name: "Cyber Defense Commander", description: "Full command authority over the simulated security operation." },
];

export function rankForLevel(level: number): Rank {
  const clamped = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  return RANKS[clamped - 1];
}

export function levelFromXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  for (let l = 1; l <= MAX_LEVEL; l++) {
    if (xp >= LEVEL_THRESHOLDS[l - 1]) level = l;
  }
  return level;
}

/** XP span of `level` (XP needed to advance to the next level). */
export function xpSpanForLevel(level: number): number {
  const clamped = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  if (clamped >= MAX_LEVEL) return 0;
  return LEVEL_THRESHOLDS[clamped] - LEVEL_THRESHOLDS[clamped - 1];
}

/** 0–1 progress within the current level. */
export function levelProgressFromXp(totalXp: number): number {
  const level = levelFromXp(totalXp);
  if (level >= MAX_LEVEL) return 1;
  const base = LEVEL_THRESHOLDS[level - 1];
  const span = xpSpanForLevel(level);
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (totalXp - base) / span));
}

/** XP still needed to reach the next level (0 at max). */
export function xpToNextLevel(totalXp: number): number {
  const level = levelFromXp(totalXp);
  if (level >= MAX_LEVEL) return 0;
  return LEVEL_THRESHOLDS[level] - Math.floor(totalXp);
}

/** Meaningful-decision XP table. Only these events award XP. */
export const XP_TABLE = {
  THREAT_DETECTED: 25,
  THREAT_INVESTIGATED: 20,
  CORRECT_RESPONSE: 50,
  SOURCE_BLOCKED: 40,
  DEVICE_ISOLATED: 35,
  SERVER_PROTECTED: 60,
  THREAT_CONTAINED: 100,
  EXCELLENT_HEALTH_BONUS: 100,
  FAST_RESPONSE_BONUS: 50,
  PERFECT_MISSION_BONUS: 200,
  EXCELLENT_PERFORMANCE_BONUS: 100,
  REPLAY_BASE_RATE: 0.25,
  REPLAY_BEAT_SCORE_BONUS: 50,
  REPLAY_BETTER_HEALTH_BONUS: 30,
  REPLAY_FASTER_BONUS: 30,
  REPLAY_BETTER_RATING_BONUS: 50,
} as const;

export const SKILL_DEFS: Array<{ key: SkillKey; label: string; description: string }> = [
  { key: "threatDetection", label: "Threat Detection", description: "Identify suspicious activity quickly." },
  { key: "incidentResponse", label: "Incident Response", description: "Correctly contain incidents." },
  { key: "networkDefense", label: "Network Defense", description: "Protect network infrastructure." },
  { key: "firewallManagement", label: "Firewall Management", description: "Correctly block malicious sources." },
  { key: "decisionMaking", label: "Decision Making", description: "Make correct decisions under pressure." },
];

export const INITIAL_SKILLS: Record<SkillKey, number> = {
  threatDetection: 10,
  incidentResponse: 10,
  networkDefense: 10,
  firewallManagement: 10,
  decisionMaking: 10,
};

/** Diminishing returns: full base gain at 0, ~1 point near the 100 cap. */
export function skillGain(current: number, base: number): number {
  const v = Math.min(100, Math.max(0, current));
  return Math.max(1, Math.round(base * (1 - v / 120)));
}

const RATING_ORDER: PerformanceRating[] = ["F", "D", "C", "B", "A", "A_PLUS", "S"];

export function ratingRank(r: PerformanceRating): number {
  return RATING_ORDER.indexOf(r);
}

export function betterRating(a: PerformanceRating, b: PerformanceRating): boolean {
  return ratingRank(a) > ratingRank(b);
}

export interface UnlockCheck {
  unlocked: boolean;
  reasons: string[];
}

/** Campaign + progression gate: previous mission complete AND required level. */
export function canUnlock(
  mission: Mission,
  completedMissionIds: string[],
  level: number,
  prevMissionId: string,
): UnlockCheck {
  const reasons: string[] = [];
  if (prevMissionId !== "" && !completedMissionIds.includes(prevMissionId)) {
    reasons.push("Complete the previous mission");
  }
  if (level < mission.requiredLevel) {
    reasons.push(`Reach Level ${mission.requiredLevel} (${rankForLevel(mission.requiredLevel).name})`);
  }
  return { unlocked: reasons.length === 0, reasons };
}

/** Progression event names — the game emits these; systems (and later AI/backend) listen. */
export const PROGRESSION_EVENTS = [
  "THREAT_DETECTED",
  "THREAT_INVESTIGATED",
  "THREAT_CONTAINED",
  "SOURCE_BLOCKED",
  "DEVICE_ISOLATED",
  "SERVER_PROTECTED",
  "MISSION_COMPLETED",
  "MISSION_FAILED",
  "PERFECT_MISSION",
  "FAST_RESPONSE",
  "NETWORK_SAVED",
  "ACHIEVEMENT_UNLOCKED",
  "LEVEL_UP",
] as const;

export type ProgressionEvent = (typeof PROGRESSION_EVENTS)[number];
