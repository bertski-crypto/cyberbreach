/**
 * AI Game Director — the central intelligence layer.
 *
 *   performance → analyze → difficulty → focus → scenario → simulation
 *   → hints → result → debrief → profile update
 *
 * Adaptation happens only at safe boundaries (briefing, waves, debrief).
 * The director never flips a live mission unfairly.
 */
import type {
  DebriefReport,
  DebriefSnapshot,
  DifficultyName,
  DifficultyState,
  GeneratedHint,
  GeneratedScenario,
  HintSnapshot,
  PlayerAnalysis,
  PlayerSnapshot,
  ScenarioRequest,
  TrainingRecommendation,
} from "./aiTypes";
import { analyzePlayer, skillObservation } from "./playerAnalyzer";
import { adaptDifficulty, difficultyState } from "./difficultyEngine";
import { FOCUS_LABELS } from "../data/scenarios";
import { DeterministicGameAI } from "./providers/deterministicAI";
import { ExternalGameAI } from "./providers/externalAI";

export type DirectorStatus = "ANALYZING" | "ONLINE" | "OFFLINE";

export interface DirectorPlan {
  analysis: PlayerAnalysis;
  difficulty: DifficultyState;
  scenario: GeneratedScenario;
  provider: "DETERMINISTIC" | "EXTERNAL";
}

const deterministic = new DeterministicGameAI();
const external = new ExternalGameAI();

function externalPreferred(): boolean {
  try {
    const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
    return meta.env?.["VITE_AI_ENABLED"] === "true";
  } catch {
    return false;
  }
}

export function directorStatus(): DirectorStatus {
  // Deterministic core is always present; EXTERNAL only when explicitly enabled.
  return externalPreferred() ? "ONLINE" : "OFFLINE";
}

export async function analyzePerformance(
  snap: PlayerSnapshot,
  log?: (msg: string) => void,
): Promise<{ analysis: PlayerAnalysis; provider: "DETERMINISTIC" | "EXTERNAL" }> {
  log?.("AI DIRECTOR analyzing player performance.");
  try {
    if (externalPreferred()) {
      const analysis = await external.analyzePlayer(snap);
      // External analysis is advisory — re-derive safety-critical fields locally.
      const local = analyzePlayer(snap);
      return { analysis: { ...analysis, trainingFocus: local.trainingFocus, recommendedDifficulty: local.recommendedDifficulty }, provider: "EXTERNAL" };
    }
  } catch {
    /* fall through to deterministic */
  }
  return { analysis: analyzePlayer(snap), provider: "DETERMINISTIC" };
}

export async function planAdaptiveScenario(
  snap: PlayerSnapshot,
  req: ScenarioRequest,
  log?: (msg: string) => void,
): Promise<DirectorPlan> {
  const { analysis, provider } = await analyzePerformance(snap, log);
  const current: DifficultyName = analysis.recommendedDifficulty;
  const { next, reason } = adaptDifficulty(current, analysis);
  const difficulty = difficultyState(next, reason);
  log?.(`Difficulty adjusted: ${current} → ${next}.`);
  log?.(`Training focus selected: ${FOCUS_LABELS[analysis.trainingFocus]}.`);
  const focus = req.focus === "AUTO" || !req.focus ? analysis.trainingFocus : req.focus;
  let scenario: GeneratedScenario;
  let used: "DETERMINISTIC" | "EXTERNAL" = provider;
  try {
    scenario = externalPreferred()
      ? await external.generateScenario({ ...req, focus, analysis })
      : await deterministic.generateScenario({ ...req, focus, analysis });
    used = externalPreferred() ? scenario.provider : "DETERMINISTIC";
  } catch {
    scenario = await deterministic.generateScenario({ ...req, focus, analysis });
    used = "DETERMINISTIC";
  }
  // Bind difficulty + focus into the scenario envelope.
  scenario = {
    ...scenario,
    difficulty: { EASY: 1, NORMAL: 2, HARD: 3, EXPERT: 4, ELITE: 5 }[next],
    trainingFocus: focus,
    provider: used,
  };
  log?.("Adaptive scenario generated.");
  return { analysis, difficulty, scenario, provider: used };
}

export async function directorHint(snap: HintSnapshot): Promise<GeneratedHint> {
  try {
    if (externalPreferred()) return await external.generateHint(snap);
  } catch {
    /* fallback */
  }
  return deterministic.generateHint(snap);
}

export async function directorDebrief(snap: DebriefSnapshot): Promise<DebriefReport> {
  try {
    if (externalPreferred()) return await external.generateDebrief(snap);
  } catch {
    /* fallback */
  }
  return deterministic.generateDebrief(snap);
}

export function directorRecommendation(analysis: PlayerAnalysis): TrainingRecommendation {
  return {
    focus: analysis.trainingFocus,
    title: `${FOCUS_LABELS[analysis.trainingFocus]} drill`,
    reason: skillObservation(analysis.weakestSkill, analysis.skills[analysis.weakestSkill], "weakness"),
  };
}

export function directorWhy(analysis: PlayerAnalysis): string {
  return (
    `Based on your last ${analysis.missionsSampled} mission(s): ` +
    `${FOCUS_LABELS[analysis.strongestSkill]} ${analysis.skills[analysis.strongestSkill]}% vs ` +
    `${FOCUS_LABELS[analysis.weakestSkill]} ${analysis.skills[analysis.weakestSkill]}%. ` +
    `Trend ${analysis.recentTrend} (${analysis.trendDelta >= 0 ? "+" : ""}${analysis.trendDelta}). ` +
    `Difficulty ${analysis.recommendedDifficulty} fits a ${(analysis.missionSuccessRate * 100).toFixed(0)}% success rate.`
  );
}
