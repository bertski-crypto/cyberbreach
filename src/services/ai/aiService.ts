/**
 * AI service abstraction.
 * Generates incident flavor text, hints, and debriefs. Every method has a
 * deterministic local fallback so the game is fully playable with no API key.
 * AI never executes real attacks — it only writes scenario text.
 */
import type { Incident, MissionResult } from "../../types/game";

export interface AIDebriefInput {
  result: MissionResult;
  missionTitle: string;
}

const FALLBACK_HINTS = [
  "Check which device the alert points to, then match the response to the threat type.",
  "Workstations get isolated. External floods get blocked at the firewall.",
  "When in doubt: investigate first for recon, isolate immediately for spreading malware.",
];

export async function generateHint(incident: Incident): Promise<{ text: string; ai: boolean }> {
  const apiKey = import.meta.env.VITE_AI_API_KEY as string | undefined;
  const endpoint = import.meta.env.VITE_AI_ENDPOINT as string | undefined;
  if (!apiKey || !endpoint) {
    return { text: incident.hint, ai: false };
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        prompt: `Give a one-sentence hint for a trainee responding to: ${incident.title}. ${incident.description}`,
        maxTokens: 60,
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`AI ${res.status}`);
    const data = (await res.json()) as { text?: string };
    if (data.text) return { text: data.text, ai: true };
    throw new Error("empty");
  } catch {
    return { text: incident.hint, ai: false };
  }
}

export function fallbackDebrief(result: MissionResult, missionTitle: string): string {
  const parts: string[] = [];
  if (result.success) {
    parts.push(`You contained "${missionTitle}" with ${result.accuracy}% accuracy.`);
  } else {
    parts.push(
      `The attack in "${missionTitle}" caused ${result.networkDamagePct}% network damage — review which alerts you deprioritized.`,
    );
  }
  if (result.incorrectDecisions > 0) {
    parts.push(
      `${result.incorrectDecisions} decision${result.incorrectDecisions > 1 ? "s were" : " was"} incorrect. Match ISOLATE to endpoints, BLOCK to external floods, INVESTIGATE to recon.`,
    );
  } else {
    parts.push("Zero incorrect decisions — textbook triage discipline.");
  }
  if (result.avgResponseTimeSec > 15) {
    parts.push(
      `Average response ${result.avgResponseTimeSec.toFixed(1)}s is slow for critical alerts — aim to act within 10 seconds on CRITICAL severity.`,
    );
  } else {
    parts.push(`Average response ${result.avgResponseTimeSec.toFixed(1)}s kept damage contained.`);
  }
  return parts.join(" ");
}

export async function generateDebrief(input: AIDebriefInput): Promise<{ text: string; ai: boolean }> {
  const apiKey = import.meta.env.VITE_AI_API_KEY as string | undefined;
  const endpoint = import.meta.env.VITE_AI_ENDPOINT as string | undefined;
  if (!apiKey || !endpoint) {
    return { text: fallbackDebrief(input.result, input.missionTitle), ai: false };
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ prompt: `Debrief: ${JSON.stringify(input.result)}`, maxTokens: 150 }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`AI ${res.status}`);
    const data = (await res.json()) as { text?: string };
    if (data.text) return { text: data.text, ai: true };
    throw new Error("empty");
  } catch {
    return { text: fallbackDebrief(input.result, input.missionTitle), ai: false };
  }
}

export function randomFallbackHint(seed: number): string {
  return FALLBACK_HINTS[Math.abs(seed) % FALLBACK_HINTS.length];
}
