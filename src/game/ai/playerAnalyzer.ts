/**
 * Player performance analyzer — derives skill, trend, focus, and difficulty
 * recommendations from REAL gameplay data (Phase 4 career records).
 * Pure functions. Nothing random.
 */
import type { PlayerAnalysis, PlayerSnapshot, Trend } from "./aiTypes";
import type { SkillKey } from "../../types/game";
import { SKILL_DEFS } from "../systems/progression";

const SKILL_KEYS = SKILL_DEFS.map((d) => d.key);

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function composite(m: PlayerSnapshot["missionHistory"][number]): number {
  const speed = Math.min(100, Math.max(0, 100 - Math.max(0, m.avgResponseTimeSec - 5) * 4));
  return m.accuracy * 0.5 + m.networkHealthPct * 0.3 + speed * 0.2;
}

export function analyzePlayer(snap: PlayerSnapshot): PlayerAnalysis {
  const skills = { ...snap.skills };
  const overallSkill = Math.round(avg(SKILL_KEYS.map((k) => skills[k])));

  const history = [...snap.missionHistory].sort((a, b) => a.completedAt - b.completedAt);
  const successRate = history.length === 0 ? 0 : history.filter((m) => m.success).length / history.length;
  const contained = history.reduce((a, m) => a + m.threatsNeutralized, 0);
  const total = history.reduce((a, m) => a + m.threatsNeutralized + m.incorrectDecisions, 0);
  const containmentRate = total === 0 ? 0 : contained / total;
  const avgResponse = snap.responsesCount === 0 ? 0 : snap.totalResponseTimeSec / snap.responsesCount;
  const avgHealth = history.length === 0 ? 100 : avg(history.map((m) => m.networkHealthPct));

  // Trend: recent third vs earlier missions by composite score.
  let recentTrend: Trend = "STABLE";
  let trendDelta = 0;
  if (history.length >= 3) {
    const scores = history.map(composite);
    const cut = Math.max(1, Math.floor(scores.length / 2));
    const earlier = avg(scores.slice(0, cut));
    const recent = avg(scores.slice(cut));
    trendDelta = Math.round(recent - earlier);
    recentTrend = trendDelta >= 5 ? "IMPROVING" : trendDelta <= -5 ? "DECLINING" : "STABLE";
  } else if (history.length > 0) {
    const last = composite(history[history.length - 1]);
    trendDelta = Math.round(last - 70);
    recentTrend = last >= 80 ? "IMPROVING" : last <= 55 ? "DECLINING" : "STABLE";
  }

  const ranked = [...SKILL_KEYS].sort((a, b) => skills[b] - skills[a]);
  const strongestSkill = ranked[0];
  // Weakest *meaningful* skill: ignore near-untouched skills only when everything is fresh.
  const trained = ranked.filter((k) => skills[k] > 12);
  const weakestSkill: SkillKey = (trained.length > 0 ? trained[trained.length - 1] : ranked[ranked.length - 1]);

  const recommendedDifficulty =
    overallSkill >= 85 && successRate >= 0.9
      ? "ELITE"
      : overallSkill >= 70 && successRate >= 0.75
        ? "EXPERT"
        : overallSkill >= 55 && successRate >= 0.6
          ? "HARD"
          : overallSkill >= 35
            ? "NORMAL"
            : "EASY";

  return {
    overallSkill,
    skills,
    averageResponseTime: Math.round(avgResponse * 10) / 10,
    averageNetworkHealth: Math.round(avgHealth),
    missionSuccessRate: Math.round(successRate * 100) / 100,
    threatContainmentRate: Math.round(containmentRate * 100) / 100,
    recentTrend,
    trendDelta,
    strongestSkill,
    weakestSkill,
    recommendedDifficulty,
    trainingFocus: weakestSkill,
    missionsSampled: history.length,
  };
}

/** Human-readable observation lines for the director UI. */
export function skillObservation(skill: SkillKey, value: number, kind: "strength" | "weakness"): string {
  const labels: Record<SkillKey, string> = {
    threatDetection: "early threat identification",
    incidentResponse: "incident containment",
    networkDefense: "infrastructure protection",
    firewallManagement: "malicious-source blocking",
    decisionMaking: "decisions under time pressure",
  };
  if (kind === "strength") {
    return `Consistently strong ${labels[skill]} (${value}/100). The director will probe this less and press harder elsewhere.`;
  }
  if (value < 40) {
    return `Frequently reacts after escalation instead of at first indicators (${value}/100). Early-stage scenarios recommended.`;
  }
  return `Solid but improvable ${labels[skill]} (${value}/100). Targeted drills will sharpen it.`;
}
