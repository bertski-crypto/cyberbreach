/**
 * Deterministic scenario generator — assembles validated adaptive scenarios
 * from the whitelisted template library. Seeded variation, hard safety
 * limits, and strict output validation (also applied to external AI output).
 */
import type { ObjectiveTemplate, ThreatType } from "../../types/game";
import { INCIDENT_TEMPLATES } from "../data/incidents";
import { INITIAL_DEVICES } from "../data/devices";
import { THREAT_META } from "../data/threats";
import {
  FICTIONAL_IP_POOL,
  FOCUS_LABELS,
  FOCUS_TEMPLATES,
  SCENARIO_NAMES,
  THREAT_TEMPLATES,
} from "../data/scenarios";
import type {
  DifficultyName,
  GeneratedScenario,
  GeneratedThreat,
  PlayerAnalysis,
  ScenarioRequest,
} from "./aiTypes";

export const SCENARIO_LIMITS = {
  MAX_THREATS: 8,
  MAX_OBJECTIVES: 8,
  MAX_STAGES: 5,
  MAX_BRIEFING_CHARS: 800,
  MAX_HINT_CHARS: 300,
} as const;

const DIFFICULTY_NUM: Record<DifficultyName, number> = {
  EASY: 1,
  NORMAL: 2,
  HARD: 3,
  EXPERT: 4,
  ELITE: 5,
};

const KNOWN_DEVICES = new Set(INITIAL_DEVICES.map((d) => d.id));

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number, offset = 0): T {
  return arr[(seed + offset) % arr.length];
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function trimText(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Strict validation — rejects anything outside the safe simulation envelope. */
export function validateScenario(s: GeneratedScenario): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!s.id || !s.title) errors.push("missing identity");
  if (s.difficulty < 1 || s.difficulty > 5) errors.push("difficulty out of range");
  if (s.threats.length === 0) errors.push("no threats");
  if (s.threats.length > SCENARIO_LIMITS.MAX_THREATS) errors.push("too many threats");
  if (s.objectives.length === 0) errors.push("no objectives");
  if (s.objectives.length > SCENARIO_LIMITS.MAX_OBJECTIVES) errors.push("too many objectives");
  if (s.stages.length > SCENARIO_LIMITS.MAX_STAGES) errors.push("too many stages");
  for (const t of s.threats) {
    const tpl = INCIDENT_TEMPLATES.find((x) => x.templateId === t.templateId);
    if (!tpl) {
      errors.push(`unknown template ${t.templateId}`);
      continue;
    }
    if (!KNOWN_DEVICES.has(tpl.targetDeviceId)) errors.push(`unknown device for ${t.templateId}`);
  }
  if (s.estimatedTimeSec < 30 || s.estimatedTimeSec > 600) errors.push("time out of range");
  return { ok: errors.length === 0, errors };
}

export function buildDeterministicScenario(
  req: ScenarioRequest & { analysis: PlayerAnalysis },
  provider: GeneratedScenario["provider"] = "DETERMINISTIC",
): GeneratedScenario {
  const { analysis } = req;
  const focus = req.focus === "AUTO" || !req.focus ? analysis.trainingFocus : req.focus;
  const tier: DifficultyName = req.difficulty ?? analysis.recommendedDifficulty;
  const difficulty = DIFFICULTY_NUM[tier];
  const seed = hashSeed(`${focus}|${tier}|${analysis.missionsSampled}|${req.missionId ?? "training"}`);

  // Threat selection: focus pool first, explicit picks honored, deduped.
  let pool = [...FOCUS_TEMPLATES[focus]];
  if (req.threatTypes && req.threatTypes.length > 0) {
    const explicit: string[] = [];
    for (const tt of req.threatTypes as ThreatType[]) {
      const ids = THREAT_TEMPLATES[tt] ?? [];
      if (ids.length > 0) explicit.push(pick(ids, seed, explicit.length));
    }
    if (explicit.length > 0) pool = [...explicit, ...pool];
  }
  const maxByTier = [1, 2, 3, 4, 4][difficulty - 1];
  const count = clamp(req.incidentCount ?? (difficulty >= 4 ? 3 : difficulty >= 2 ? 2 : 1), 1, Math.min(maxByTier, SCENARIO_LIMITS.MAX_THREATS));
  const chosen: string[] = [];
  for (let i = 0; i < pool.length && chosen.length < count; i++) {
    const id = pick(pool, seed, i * 3);
    if (!chosen.includes(id)) chosen.push(id);
  }

  // Waves: EASY/NORMAL all live; HARD+ staggers later stages.
  const stagger = difficulty >= 3 && chosen.length > 1;
  const threats: GeneratedThreat[] = chosen.map((templateId, i) => ({
    templateId,
    sourceIp: pick(FICTIONAL_IP_POOL, seed, i * 2),
    wave: stagger ? Math.min(i, 2) : 0,
  }));

  const stages = stagger
    ? [0, 1, 2]
        .map((w) => ({
          index: w + 1,
          name: ["Initial access", "Establishing presence", "Objective action"][w],
          templateIds: chosen.filter((_, i) => Math.min(i, 2) === w),
        }))
        .filter((st) => st.templateIds.length > 0)
    : [{ index: 1, name: "Single thrust", templateIds: chosen }];

  const devices = [...new Set(chosen.map((id) => INCIDENT_TEMPLATES.find((t) => t.templateId === id)?.targetHostname ?? "?"))];
  const affected = [...new Set(chosen.map((id) => INCIDENT_TEMPLATES.find((t) => t.templateId === id)?.targetDeviceId ?? ""))].filter(Boolean);
  const threatLabels = [...new Set(chosen.map((id) => {
    const t = INCIDENT_TEMPLATES.find((x) => x.templateId === id);
    return t ? THREAT_META[t.threatType].label : "?";
  }))];

  const title = pick(SCENARIO_NAMES, seed);
  const firstIp = threats[0]?.sourceIp ?? FICTIONAL_IP_POOL[0];
  const briefing = trimText(
    `Adaptive training scenario assembled for your ${FOCUS_LABELS[focus]} development. ` +
      `Sensors report ${threatLabels.join(" + ").toLowerCase()} indicators affecting ${devices.join(", ")}. ` +
      (stagger
        ? `Expect ${stages.length} stages: initial access, then presence, then objective action. Later waves activate as earlier ones are contained — or on their own if ignored. `
        : `A single thrust from ${firstIp}. Contain it before escalation. `) +
      `Protect infrastructure and keep network health high.`,
    SCENARIO_LIMITS.MAX_BRIEFING_CHARS,
  );

  const objectives: ObjectiveTemplate[] = [
    { id: "dyn-detect", label: "Detect suspicious activity", kind: "DETECT" as const },
    { id: "dyn-investigate", label: "Investigate an affected device", kind: "INVESTIGATE" as const },
    ...(threats[0]
      ? [{ id: "dyn-block", label: "Block malicious source " + threats[0].sourceIp, kind: "BLOCK_SOURCE" as const, ip: threats[0].sourceIp }]
      : []),
    ...(affected[0]
      ? [{ id: "dyn-protect", label: "Protect " + affected[0].toUpperCase(), kind: "PROTECT" as const, targetDeviceId: affected[0] }]
      : []),
    { id: "dyn-health", label: "Keep network health above 60%", kind: "MAINTAIN_HEALTH" as const, minHealth: 60 },
    { id: "dyn-contain", label: "Contain all incidents", kind: "CONTAIN_ALL" as const },
  ].slice(0, SCENARIO_LIMITS.MAX_OBJECTIVES);

  const timeByTier = [150, 135, 120, 105, 90][difficulty - 1];
  const scenario: GeneratedScenario = {
    id: `dyn-${Date.now().toString(36)}-${(seed % 1296).toString(36)}`,
    title,
    description: `${threatLabels.join(" + ")} drill focused on ${FOCUS_LABELS[focus]}.`,
    difficulty,
    estimatedTimeSec: timeByTier,
    threatLevel: difficulty >= 4 ? "CRITICAL" : difficulty === 3 ? "HIGH" : difficulty === 2 ? "MEDIUM" : "LOW",
    objectives,
    threats,
    stages,
    affectedDevices: affected,
    recommendedSkills: [focus],
    briefing,
    why:
      `Based on your last ${analysis.missionsSampled} mission(s): ` +
      `${FOCUS_LABELS[analysis.strongestSkill]} ${analysis.skills[analysis.strongestSkill]}% (strongest) vs ` +
      `${FOCUS_LABELS[analysis.weakestSkill]} ${analysis.skills[analysis.weakestSkill]}% (training focus). ` +
      `Trend ${analysis.recentTrend}. Difficulty ${tier} selected for a ${(analysis.missionSuccessRate * 100).toFixed(0)}% success rate.`,
    successConditions: ["Contain every incident before the timer expires.", "Keep network health above 50%."],
    failureConditions: ["Timer expires.", "Any targeted host is fully compromised."],
    trainingFocus: focus,
    provider,
  };
  const check = validateScenario(scenario);
  if (!check.ok) throw new Error(`generator produced invalid scenario: ${check.errors.join("; ")}`);
  return scenario;
}
