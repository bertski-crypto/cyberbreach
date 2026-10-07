import { db } from "../db/client.js";
import { newId } from "../utils/security.js";
import { profileIdForUser } from "./playerService.js";

export type SessionType = "ADAPTIVE_SCENARIO" | "AI_TRAINING" | "DEBRIEF" | "FREE_SIMULATION";

const SKILLS = ["threatDetection", "incidentResponse", "networkDefense", "firewallManagement", "decisionMaking"] as const;

export interface AnalysisInput {
  skills: Record<string, number>;
  averageResponseTimeSec: number;
  averageNetworkHealth: number;
  missionSuccessRate: number;
  threatContainmentRate: number;
  missionsSampled: number;
}

export function analyzePerformance(input: AnalysisInput) {
  const pick = (k: string) => Math.min(100, Math.max(0, Math.round(Number(input.skills[k]) || 0)));
  const skills: Record<string, number> = Object.fromEntries(SKILLS.map((k) => [k, pick(k)]));
  const overall = Math.round(SKILLS.reduce((a, k) => a + skills[k], 0) / SKILLS.length);
  const ranked = [...SKILLS].sort((a, b) => skills[b] - skills[a]);
  const trained = ranked.filter((k) => skills[k] > 12);
  const weakest = trained.length > 0 ? trained[trained.length - 1] : ranked[ranked.length - 1];
  const success = Math.min(1, Math.max(0, input.missionSuccessRate));
  const difficulty =
    overall >= 85 && success >= 0.9 ? "ELITE"
    : overall >= 70 && success >= 0.75 ? "EXPERT"
    : overall >= 55 && success >= 0.6 ? "HARD"
    : overall >= 35 ? "NORMAL"
    : "EASY";
  return {
    overallSkill: overall,
    skills,
    strongestSkill: ranked[0],
    weakestSkill: weakest,
    recommendedDifficulty: difficulty,
    trainingFocus: weakest,
    provider: "DETERMINISTIC" as const,
  };
}

const FOCUS_TEMPLATES: Record<string, string[]> = {
  threatDetection: ["inc-port-scan", "inc-susp-login", "inc-phishing"],
  incidentResponse: ["inc-malware", "inc-ransomware", "inc-m3-beacon"],
  networkDefense: ["inc-ddos", "inc-exfil", "inc-unauth"],
  firewallManagement: ["inc-brute-force", "inc-m2-auth", "inc-susp-login"],
  decisionMaking: ["inc-m4-foothold", "inc-insider", "inc-unauth"],
};

const DIFF_NUM: Record<string, number> = { EASY: 1, NORMAL: 2, HARD: 3, EXPERT: 4, ELITE: 5 };

export function assembleScenario(input: { focus: string; difficulty?: string; incidentCount?: number }) {
  const focus = (FOCUS_TEMPLATES[input.focus] ? input.focus : "threatDetection") as keyof typeof FOCUS_TEMPLATES;
  const tier = input.difficulty && DIFF_NUM[input.difficulty] ? input.difficulty : "NORMAL";
  const pool = FOCUS_TEMPLATES[focus];
  const maxByTier = [1, 2, 3, 4, 4][DIFF_NUM[tier] - 1];
  const count = Math.min(Math.max(1, input.incidentCount ?? 2), maxByTier, 4);
  const threats = pool.slice(0, count).map((templateId, i) => ({ templateId, wave: DIFF_NUM[tier] >= 3 && count > 1 ? Math.min(i, 2) : 0 }));
  return {
    id: `srv-${Date.now().toString(36)}`,
    title: "SERVER ASSEMBLED DRILL",
    difficulty: DIFF_NUM[tier],
    threatLevel: DIFF_NUM[tier] >= 4 ? "CRITICAL" : DIFF_NUM[tier] === 3 ? "HIGH" : "MEDIUM",
    threats,
    trainingFocus: focus,
    provider: "DETERMINISTIC" as const,
  };
}

export function buildHint(input: { severity: string; targetHostname: string; investigated: boolean; escalationLevel: number; hintsUsed: number }): { level: 1 | 2 | 3; text: string } {
  const level = input.hintsUsed <= 0 ? 1 : input.hintsUsed === 1 ? 2 : 3;
  const base = !input.investigated
    ? `Investigate ${input.targetHostname} to identify the ${input.severity} threat before it escalates further.`
    : `Intel on ${input.targetHostname} is in hand (escalation Lv${input.escalationLevel}) — contain it now.`;
  const text = level === 1 ? base : level === 2 ? `${base} Review the incident timeline for the source.` : `${base} A block or isolation matched to the pattern will end this.`;
  return { level, text: text.slice(0, 300) };
}

export function buildDebrief(input: {
  success: boolean;
  accuracy: number;
  avgResponseTimeSec: number;
  networkHealthPct: number;
  threatsNeutralized: number;
  incorrectDecisions: number;
}): { classification: string; overallLabel: string; responseQualityPct: number; strengths: string[]; improvements: string[]; recommendation: string } {
  const speed = Math.min(100, Math.max(0, 100 - Math.max(0, input.avgResponseTimeSec - 5) * 4));
  const composite = input.accuracy * 0.5 + input.networkHealthPct * 0.3 + speed * 0.2;
  const classification = composite >= 92 ? "EXCEPTIONAL" : composite >= 80 ? "STRONG" : composite >= 65 ? "PROFICIENT" : composite >= 45 ? "DEVELOPING" : "NEEDS_TRAINING";
  const strengths: string[] = [];
  if (input.threatsNeutralized > 0 && input.incorrectDecisions === 0) strengths.push("Clean containment record.");
  if (input.avgResponseTimeSec < 10) strengths.push(`Fast response (${input.avgResponseTimeSec}s average).`);
  if (input.networkHealthPct >= 90) strengths.push(`Health preserved at ${input.networkHealthPct}%.`);
  const improvements: string[] = [];
  if (input.incorrectDecisions > 0) improvements.push(`${input.incorrectDecisions} incorrect decision(s) — match response to threat pattern.`);
  if (input.networkHealthPct < 85) improvements.push(`Health fell to ${input.networkHealthPct}% — contain faster.`);
  if (!input.success) improvements.push("Mission failed — replay focusing on the first 60 seconds.");
  return {
    classification,
    overallLabel: classification === "EXCEPTIONAL" ? "Excellent" : classification,
    responseQualityPct: Math.round(composite),
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 4),
    recommendation: "Practice early-stage detection scenarios to cut response time.",
  };
}

export async function recordSession(
  userId: string,
  sessionType: SessionType,
  difficulty: string,
  trainingFocus: string | undefined,
  analysis: { overallSkill: number; strongestSkill: string; weakestSkill: string; recommendedDifficulty: string; performanceTrend: string; trainingFocus: string } | null,
): Promise<string> {
  const database = await db();
  const profileId = await profileIdForUser(userId);
  const sessionId = newId();
  await database.query(
    "INSERT INTO ai_sessions(id, player_id, session_type, difficulty, training_focus) VALUES ($1,$2,$3,$4,$5)",
    [sessionId, profileId, sessionType, difficulty, trainingFocus ?? null],
  );
  if (analysis) {
    await database.query(
      `INSERT INTO ai_analysis(id, player_id, ai_session_id, overall_skill, strongest_skill, weakest_skill,
        recommended_difficulty, performance_trend, training_focus)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [newId(), profileId, sessionId, analysis.overallSkill, analysis.strongestSkill, analysis.weakestSkill, analysis.recommendedDifficulty, analysis.performanceTrend, analysis.trainingFocus],
    );
  }
  return sessionId;
}

export async function aiHistory(userId: string, limit = 20) {
  const database = await db();
  const profileId = await profileIdForUser(userId);
  const capped = Math.min(50, Math.max(1, limit));
  const sessions = await database.query(
    "SELECT id, session_type, difficulty, training_focus, created_at, completed_at FROM ai_sessions WHERE player_id=$1 ORDER BY created_at DESC LIMIT $2",
    [profileId, capped],
  );
  const analyses = await database.query(
    `SELECT ai_session_id, overall_skill, strongest_skill, weakest_skill, recommended_difficulty,
            performance_trend, training_focus, created_at
     FROM ai_analysis WHERE player_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [profileId, capped],
  );
  return { sessions: sessions.rows, analyses: analyses.rows };
}
