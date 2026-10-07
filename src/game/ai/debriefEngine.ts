/**
 * After-action review engine — classification, strengths, improvements,
 * and the next training recommendation, all derived from the result.
 */
import { FOCUS_LABELS, FOCUS_REASONS } from "../data/scenarios";
import type { DebriefReport, DebriefSnapshot, TrainingRecommendation } from "./aiTypes";
import { skillObservation } from "./playerAnalyzer";

export function buildDeterministicDebrief(snap: DebriefSnapshot): DebriefReport {
  const composite = snap.accuracy * 0.5 + snap.networkHealthPct * 0.3 +
    Math.min(100, Math.max(0, 100 - Math.max(0, snap.avgResponseTimeSec - 5) * 4)) * 0.2;

  const classification: DebriefReport["classification"] =
    composite >= 92 ? "EXCEPTIONAL"
    : composite >= 80 ? "STRONG"
    : composite >= 65 ? "PROFICIENT"
    : composite >= 45 ? "DEVELOPING"
    : "NEEDS_TRAINING";

  const overallLabel =
    classification === "EXCEPTIONAL" ? "Excellent" :
    classification === "STRONG" ? "Strong" :
    classification === "PROFICIENT" ? "Proficient" :
    classification === "DEVELOPING" ? "Developing" : "Needs training";

  const strengths: string[] = [];
  if (snap.threatsNeutralized > 0 && snap.incorrectDecisions === 0) strengths.push("Clean containment record — zero incorrect decisions.");
  if (snap.avgResponseTimeSec < 10) strengths.push(`Fast threat containment (${snap.avgResponseTimeSec}s average).`);
  if (snap.networkHealthPct >= 90) strengths.push(`Network health preserved at ${snap.networkHealthPct}%.`);
  if (snap.objectivesDone === snap.objectivesTotal && snap.objectivesTotal > 0) strengths.push(`All ${snap.objectivesTotal} objectives completed.`);
  if (snap.escalations === 0) strengths.push("No threat was allowed to escalate.");
  if (strengths.length === 0 && snap.success) strengths.push("Mission accomplished under pressure.");

  const improvements: string[] = [];
  if (snap.incorrectDecisions > 0) improvements.push(`${snap.incorrectDecisions} incorrect decision(s) — match ISOLATE to endpoints, BLOCK to external floods.`);
  if (snap.avgResponseTimeSec >= 10) improvements.push(`Response averaged ${snap.avgResponseTimeSec}s (your career average is ${snap.analysis.averageResponseTime}s) — triage critical alerts first.`);
  if (snap.networkHealthPct < 85) improvements.push(`Network health fell to ${snap.networkHealthPct}% — contain faster to limit damage.`);
  if (snap.escalations > 0) improvements.push(`${snap.escalations} escalation event(s) — investigate early, before stage 2.`);
  if (snap.objectivesDone < snap.objectivesTotal) improvements.push(`${snap.objectivesTotal - snap.objectivesDone} objective(s) incomplete — read the full briefing before starting.`);
  if (!snap.success) improvements.push("Mission failed — replay with focus on the first 60 seconds.");

  const focus = snap.analysis.trainingFocus;
  return {
    classification,
    overallLabel,
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 4),
    responseQualityPct: Math.round(Math.min(100, Math.max(0, composite))),
    recommendation: FOCUS_REASONS[focus],
    recommendedFocus: focus,
    provider: "DETERMINISTIC",
  };
}

export function trainingRecommendation(a: {
  trainingFocus: keyof typeof FOCUS_LABELS;
  weakestSkill: keyof typeof FOCUS_LABELS;
}): TrainingRecommendation {
  return {
    focus: a.trainingFocus,
    title: `Early ${FOCUS_LABELS[a.trainingFocus]} drill`,
    reason: skillObservation(a.weakestSkill, 0, "weakness"),
  };
}
