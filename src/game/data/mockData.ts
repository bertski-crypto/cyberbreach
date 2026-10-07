/**
 * Backwards-compatible barrel over the split game-data modules.
 * New code should import from ./devices, ./threats, ./incidents, ./missions, ./achievements.
 */
import type { Achievement, FirewallRule } from "../../types/game";
import { ACHIEVEMENT_DEFS } from "./achievements";

export { INITIAL_DEVICES, NETWORK_LINKS } from "./devices";
export { THREAT_META } from "./threats";
export type { ThreatMeta } from "./threats";
export {
  CORRECT_ACTIONS,
  INCIDENT_TEMPLATES,
  SUBOPTIMAL_CONTAINMENT,
} from "./incidents";
export type { IncidentTemplate } from "./incidents";
export { MISSIONS } from "./missions";

export const INITIAL_FIREWALL_RULES: FirewallRule[] = [
  { id: "rule-001", source: "0.0.0.0/0", destination: "10.0.1.10", port: 443, protocol: "TCP", action: "ALLOW", enabled: true, hits: 1284 },
  { id: "rule-002", source: "0.0.0.0/0", destination: "10.0.1.10", port: 22, protocol: "TCP", action: "BLOCK", enabled: true, hits: 37 },
  { id: "rule-003", source: "192.168.1.0/24", destination: "10.0.2.10", port: 5432, protocol: "TCP", action: "ALLOW", enabled: true, hits: 512 },
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = ACHIEVEMENT_DEFS.map((d) => ({
  id: d.id,
  name: d.name,
  description: d.description,
  unlocked: false,
  unlockedAt: null,
}));

export const DEMO_LEADERBOARD = [
  { rank: 1, player: "cipher_owl", level: 7, score: 48250, missions: 25, accuracy: 96, rating: "S" },
  { rank: 2, player: "packet_pirate", level: 6, score: 41100, missions: 22, accuracy: 93, rating: "A" },
  { rank: 3, player: "null_pointer", level: 6, score: 38900, missions: 21, accuracy: 91, rating: "A" },
  { rank: 4, player: "subnet_sam", level: 5, score: 31200, missions: 18, accuracy: 89, rating: "A" },
  { rank: 5, player: "you", level: 1, score: 0, missions: 0, accuracy: 0, rating: "—" },
];
