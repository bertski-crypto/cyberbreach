/**
 * Field-appropriate cloud merge — never blindly server-wins or local-wins:
 * unions for sets, max for monotonic progress, per-skill max, best-record wins.
 * Pure functions, fully unit-testable.
 */
import type { SaveData } from "../storage/saveService";
import type { PerformanceRating, SkillKey } from "../../types/game";

const RATING_ORDER: PerformanceRating[] = ["F", "D", "C", "B", "A", "A_PLUS", "S"];

function betterRating(a: PerformanceRating | null, b: PerformanceRating | null): PerformanceRating | null {
  if (!a) return b;
  if (!b) return a;
  return RATING_ORDER.indexOf(a) >= RATING_ORDER.indexOf(b) ? a : b;
}

export interface CloudSnapshot {
  profile?: { total_xp?: number; codename?: string } | null;
  skills?: Record<string, number> | null;
  stats?: Record<string, number> | null;
  achievements?: Array<{ achievement_id: string }>;
  attempts?: Array<{ mission_id: string; score: number; rating: string; network_health: number; response_time: number; completed: boolean; client_key: string }>;
}

const SKILL_KEYS: SkillKey[] = ["threatDetection", "incidentResponse", "networkDefense", "firewallManagement", "decisionMaking"];

export function mergeCloudIntoLocal(local: SaveData, cloud: CloudSnapshot): SaveData {
  const cloudXp = Math.max(0, Math.floor(cloud.profile?.total_xp ?? 0));
  const skills = { ...local.skills };
  for (const k of SKILL_KEYS) {
    const cv = cloud.skills?.[k];
    if (typeof cv === "number") skills[k] = Math.min(100, Math.max(skills[k], Math.round(cv)));
  }
  const cloudCompleted = new Set<string>();
  for (const a of cloud.attempts ?? []) {
    if (a.completed) cloudCompleted.add(a.mission_id);
  }
  const bests: SaveData["bests"] = { ...local.bests };
  for (const a of cloud.attempts ?? []) {
    const prev = bests[a.mission_id];
    if ((!prev || a.score > prev.score) && a.completed) {
      bests[a.mission_id] = {
        score: a.score,
        rating: (a.rating ?? "F") as PerformanceRating,
        responseSec: a.response_time ?? 0,
        health: a.network_health ?? 100,
        at: Date.now(),
      };
    }
  }
  const cloudAch = new Set((cloud.achievements ?? []).map((a) => a.achievement_id));
  const st = cloud.stats ?? {};
  const num = (v: unknown, fb: number) => (typeof v === "number" && Number.isFinite(v) ? v : fb);
  const rec = { ...local.records };
  rec.bestScoreOverall = Math.max(rec.bestScoreOverall, num(st.best_score, 0));
  rec.bestRating = betterRating(rec.bestRating, (st.best_rating as unknown as PerformanceRating | undefined) ?? null);
  rec.bestHealthPct = Math.max(rec.bestHealthPct, num(st.best_network_health, 0));
  rec.longestStreak = Math.max(rec.longestStreak, num(st.missions_completed, 0) > 0 ? rec.longestStreak : 0);
  return {
    ...local,
    xp: Math.max(local.xp, cloudXp),
    score: Math.max(local.score, num(st.total_score, 0)),
    completedMissionIds: Array.from(new Set([...local.completedMissionIds, ...cloudCompleted])),
    achievements: Array.from(new Set([...local.achievements, ...cloudAch])),
    skills,
    bests,
    totalDetected: Math.max(local.totalDetected, num(st.threats_detected, 0)),
    successfulBlocks: local.successfulBlocks,
    records: rec,
    stats: {
      ...local.stats,
      completedMissions: Math.max(local.stats.completedMissions, num(st.missions_completed, 0)),
      failedMissions: local.stats.failedMissions,
      threatsNeutralized: Math.max(local.stats.threatsNeutralized, num(st.threats_contained, 0)),
      incorrectDecisions: local.stats.incorrectDecisions,
      firewallRulesCreated: local.stats.firewallRulesCreated,
      totalResponseTimeSec: local.stats.totalResponseTimeSec,
      responsesCount: local.stats.responsesCount,
    },
  };
}
