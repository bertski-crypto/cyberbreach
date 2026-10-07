/** Achievement catalogue — unlock logic lives in the store, rewards here. */
import type { AchievementDef } from "../../types/game";

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "first-response",
    name: "First Response",
    description: "Contain your first cybersecurity incident.",
    icon: "shield",
    category: "CAMPAIGN",
    rarity: "COMMON",
    xpReward: 100,
  },
  {
    id: "threat-hunter",
    name: "Threat Hunter",
    description: "Detect 10 threats across your career.",
    icon: "radar",
    category: "COMBAT",
    rarity: "COMMON",
    xpReward: 150,
  },
  {
    id: "firewall-master",
    name: "Firewall Master",
    description: "Successfully block 10 malicious sources.",
    icon: "flame",
    category: "DEFENSE",
    rarity: "RARE",
    xpReward: 250,
  },
  {
    id: "zero-damage",
    name: "Zero Damage",
    description: "Complete a mission while maintaining 100% network health.",
    icon: "heart",
    category: "DEFENSE",
    rarity: "EPIC",
    xpReward: 500,
  },
  {
    id: "lightning",
    name: "Lightning Response",
    description: "Contain a critical incident in under 10 seconds.",
    icon: "zap",
    category: "SPEED",
    rarity: "RARE",
    xpReward: 300,
  },
  {
    id: "network-savior",
    name: "Network Savior",
    description: "Complete a mission involving multiple simultaneous threats.",
    icon: "network",
    category: "CAMPAIGN",
    rarity: "EPIC",
    xpReward: 500,
  },
  {
    id: "incident-commander",
    name: "Incident Commander",
    description: "Complete all five campaign missions.",
    icon: "crown",
    category: "CAMPAIGN",
    rarity: "LEGENDARY",
    xpReward: 1000,
  },
  {
    id: "perfect-response",
    name: "Perfect Response",
    description: "No mistakes, no unnecessary isolation, excellent response time, 95%+ health.",
    icon: "star",
    category: "MASTERY",
    rarity: "LEGENDARY",
    xpReward: 1000,
  },
];

/** Legacy Phase 1–3 achievement ids mapped onto the Phase 4 catalogue. */
export const LEGACY_ACHIEVEMENT_MAP: Record<string, string> = {
  "first-response": "first-response",
  "threat-hunter": "threat-hunter",
  "firewall-master": "firewall-master",
  lightning: "lightning",
  savior: "incident-commander",
  "zero-day": "perfect-response",
};
