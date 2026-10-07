/**
 * Threat engine — priority, escalation pacing, severity impact,
 * and global threat-level math. Pure functions; the store owns state.
 */
import type { Incident, ThreatLevel, ThreatSeverity } from "../../types/game";

/** Incidents still requiring analyst action. */
export function isOpenIncident(i: Incident): boolean {
  return i.status === "ACTIVE" || i.status === "INVESTIGATING";
}

/** Priority 1 (highest) – 4 (lowest). Escalation raises priority. */
export function priorityOf(i: Incident): 1 | 2 | 3 | 4 {
  const base = i.severity === "CRITICAL" ? 1 : i.severity === "HIGH" ? 2 : i.severity === "MEDIUM" ? 3 : 4;
  const bump = Math.floor((i.escalationLevel ?? 0) / 2);
  return Math.max(1, base - bump) as 1 | 2 | 3 | 4;
}

export function priorityLabel(p: number): string {
  return `P${p}`;
}

/** Seconds between escalation ticks — harder missions escalate faster. */
export function escalationIntervalSec(difficulty: number): number {
  return Math.max(9, 24 - Math.max(1, Math.min(5, difficulty)) * 3);
}

/** Target-device damage per escalation tick. Severity drives magnitude. */
export function escalationDamage(severity: ThreatSeverity, level: number): number {
  const weight = severity === "CRITICAL" ? 7 : severity === "HIGH" ? 4 : severity === "MEDIUM" ? 2 : 1;
  return weight + Math.max(0, level) * 2;
}

/** Response-time tiers — scoring guidance only, never a fail condition. */
export function responseTier(sec: number): "Excellent" | "Good" | "Average" | "Slow" {
  if (sec < 5) return "Excellent";
  if (sec < 10) return "Good";
  if (sec < 20) return "Average";
  return "Slow";
}

const ORDER: ThreatLevel[] = ["LOW", "GUARDED", "ELEVATED", "HIGH", "CRITICAL"];

function bump(level: ThreatLevel, steps = 1): ThreatLevel {
  return ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(level) + steps)];
}

/**
 * Global SOC threat posture from live incidents, ignored alerts,
 * escalation pressure, and overall network health.
 */
export function globalThreatLevel(args: {
  openCritical: number;
  openTotal: number;
  ignoredTotal: number;
  escalationTotal: number;
  networkHealth: number;
}): ThreatLevel {
  let level: ThreatLevel;
  if (args.openCritical >= 2) level = "CRITICAL";
  else if (args.openCritical === 1) level = "HIGH";
  else if (args.openTotal >= 3) level = "ELEVATED";
  else if (args.openTotal >= 1) level = "GUARDED";
  else level = "LOW";
  if (args.ignoredTotal > 0 && (level === "LOW" || level === "GUARDED")) level = "ELEVATED";
  if (args.escalationTotal >= 3) level = bump(level);
  if (args.networkHealth < 50) level = level === "LOW" || level === "GUARDED" ? "ELEVATED" : bump(level);
  return level;
}
