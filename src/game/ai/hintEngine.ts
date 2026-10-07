/**
 * Contextual hint engine — three guidance levels, never auto-solves.
 * Level advances with repeated requests; budget enforced by the caller.
 */
import { THREAT_META } from "../data/threats";
import type { GeneratedHint, HintSnapshot } from "./aiTypes";
import { trimText } from "./scenarioGenerator";

export const HINT_BUDGET_PER_MISSION = 3;

export function hintLevelFor(used: number): 1 | 2 | 3 {
  return used <= 0 ? 1 : used === 1 ? 2 : 3;
}

export function buildDeterministicHint(snap: HintSnapshot): GeneratedHint {
  const level = hintLevelFor(snap.hintsUsed);
  const pattern = THREAT_META[snap.threatType].pattern.toLowerCase();
  let text: string;
  if (!snap.investigated) {
    text =
      level === 1
        ? `Something on the network appears unusual around ${snap.targetHostname}. Threat pattern: ${pattern}.`
        : level === 2
          ? `Review recent activity on ${snap.targetHostname} (${snap.severity} ${snap.threatType.toLowerCase().replace(/_/g, " ")}). Investigation has not started yet.`
          : `Investigating ${snap.targetHostname} will reveal the source of the incident. Act before escalation level ${snap.escalationLevel + 1}.`;
  } else if (snap.escalationLevel >= 2) {
    text =
      level === 1
        ? `The ${snap.targetHostname} situation is worsening while it stays unresolved.`
        : level === 2
          ? `Escalation is accelerating on ${snap.targetHostname}. Re-read the investigation recommendation.`
          : `Containment is overdue on ${snap.targetHostname}. Match the response to the pattern: ${pattern}.`;
  } else {
    text =
      level === 1
        ? `Intel is in hand for ${snap.targetHostname} — the next step is containment.`
        : level === 2
          ? `Traffic from ${snap.sourceIp} towards ${snap.targetHostname} is confirmed hostile.`
          : `A block against ${snap.sourceIp} or isolation of ${snap.targetHostname} will end this. Choose the one that fits the pattern: ${pattern}.`;
  }
  return { level, text: trimText(text, 300), provider: "DETERMINISTIC" };
}
