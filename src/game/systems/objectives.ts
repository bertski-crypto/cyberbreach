/**
 * Mission objective evaluation — pure functions over a state snapshot,
 * so objectives stay synchronized with the single game store.
 */
import { networkHealth } from "./xp";
import type { FirewallRule, Incident, NetworkDevice, ObjectiveTemplate } from "../../types/game";

export interface ObjectiveState {
  incidents: Incident[];
  investigatedIds: string[];
  firewallRules: FirewallRule[];
  devices: NetworkDevice[];
  totalResponseTimeSec: number;
  responsesCount: number;
}

export function evaluateObjective(s: ObjectiveState, o: ObjectiveTemplate): boolean {
  switch (o.kind) {
    case "DETECT":
      return s.incidents.length > 0;
    case "INVESTIGATE": {
      if (s.investigatedIds.length === 0) return false;
      if (!o.targetDeviceId) return true;
      const ids = new Set(s.incidents.filter((i) => i.targetDeviceId === o.targetDeviceId).map((i) => i.id));
      return s.investigatedIds.some((id) => ids.has(id));
    }
    case "BLOCK_SOURCE":
      if (!o.ip) return false;
      return s.firewallRules.some((r) => r.enabled && r.action === "BLOCK" && r.source === o.ip);
    case "ISOLATE": {
      if (!o.targetDeviceId) return false;
      return s.devices.some((d) => d.id === o.targetDeviceId && d.status === "ISOLATED");
    }
    case "PROTECT": {
      if (!o.targetDeviceId) return false;
      const d = s.devices.find((x) => x.id === o.targetDeviceId);
      return !!d && d.status !== "COMPROMISED" && d.health > 25;
    }
    case "CONTAIN_ALL":
      return s.incidents.length > 0 && s.incidents.every((i) => i.status === "CONTAINED");
    case "FAST_RESPONSE": {
      if (s.responsesCount === 0) return false;
      return s.totalResponseTimeSec / s.responsesCount <= (o.maxSec ?? 20);
    }
    case "MAINTAIN_HEALTH":
      return networkHealth(s.devices.map((d) => d.health)) >= (o.minHealth ?? 50);
  }
}

export function objectivesSummary(
  s: ObjectiveState,
  objectives: ObjectiveTemplate[],
): { done: number; total: number } {
  return {
    done: objectives.filter((o) => evaluateObjective(s, o)).length,
    total: objectives.length,
  };
}
