/**
 * Local persistence for demo mode (save key is versioned).
 * Backend sync can be layered on later. Corrupt or partial saves
 * never crash the game — they fall back to a fresh operator file.
 */
import type { PersonalBest, Skills } from "../../types/game";
import type { CareerRecords } from "../../store/gameStore";
import type { TrainingRun } from "../../store/gameStore";
import type { DifficultyName } from "../../game/ai/aiTypes";
const KEY = "cyberbreach.save.v1";

export interface SaveData {
  username: string;
  xp: number;
  level: number;
  score: number;
  reputation: number;
  completedMissionIds: string[];
  achievements: string[];
  bests: Record<string, PersonalBest>;
  skills: Skills;
  records: CareerRecords;
  totalDetected: number;
  successfulBlocks: number;
  aiDifficulty: DifficultyName;
  trainingRuns: TrainingRun[];
  stats: {
    completedMissions: number;
    failedMissions: number;
    threatsNeutralized: number;
    incorrectDecisions: number;
    totalResponseTimeSec: number;
    responsesCount: number;
    firewallRulesCreated: number;
  };
  soundOn: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

/** Validate an unknown parsed value; return null when unusable. */
function validate(raw: unknown): SaveData | null {
  if (!isRecord(raw)) return null;
  try {
    const stats = isRecord(raw.stats) ? raw.stats : {};
    const numStat = (k: string) => num(stats[k], 0);
    return {
      username: str(raw.username, "NEXUS").slice(0, 24),
      xp: Math.max(0, num(raw.xp, 0)),
      level: Math.max(1, Math.floor(num(raw.level, 1))),
      score: Math.max(0, num(raw.score, 0)),
      reputation: Math.min(100, Math.max(0, num(raw.reputation, 50))),
      completedMissionIds: Array.isArray(raw.completedMissionIds)
        ? raw.completedMissionIds.filter((x): x is string => typeof x === "string")
        : [],
      achievements: Array.isArray(raw.achievements)
        ? raw.achievements.filter((x): x is string => typeof x === "string")
        : [],
      bests: isRecord(raw.bests) ? (raw.bests as Record<string, PersonalBest>) : {},
      skills: isRecord(raw.skills) ? (raw.skills as Skills) : ({} as Skills),
      records: isRecord(raw.records) ? (raw.records as unknown as CareerRecords) : ({} as CareerRecords),
      totalDetected: Math.max(0, Math.floor(num(raw.totalDetected, 0))),
      successfulBlocks: Math.max(0, Math.floor(num(raw.successfulBlocks, 0))),
      aiDifficulty: ["EASY", "NORMAL", "HARD", "EXPERT", "ELITE"].includes(raw.aiDifficulty as string)
        ? (raw.aiDifficulty as DifficultyName)
        : "NORMAL",
      trainingRuns: Array.isArray(raw.trainingRuns)
        ? (raw.trainingRuns as unknown[]).filter((r): r is TrainingRun => isRecord(r)).slice(0, 30)
        : [],
      stats: {
        completedMissions: numStat("completedMissions"),
        failedMissions: numStat("failedMissions"),
        threatsNeutralized: numStat("threatsNeutralized"),
        incorrectDecisions: numStat("incorrectDecisions"),
        totalResponseTimeSec: numStat("totalResponseTimeSec"),
        responsesCount: numStat("responsesCount"),
        firewallRulesCreated: numStat("firewallRulesCreated"),
      },
      soundOn: typeof raw.soundOn === "boolean" ? raw.soundOn : true,
    };
  } catch {
    return null;
  }
}

export function loadSave(): SaveData | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const valid = validate(parsed);
    if (!valid) {
      console.warn("[CYBER//BREACH] Saved career data was invalid — starting fresh.");
    }
    return valid;
  } catch {
    console.warn("[CYBER//BREACH] Could not read saved career data — starting fresh.");
    return null;
  }
}

export function persistSave(data: SaveData): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full / private mode — game continues in memory */
  }
}

export function clearSave(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
