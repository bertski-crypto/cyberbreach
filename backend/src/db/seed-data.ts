/** Achievement catalogue mirrored from the frontend (server is authoritative). */
export interface AchievementSeed {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  xpReward: number;
}

export const ACHIEVEMENTS: AchievementSeed[] = [
  { id: "first-response", name: "First Response", description: "Contain your first cybersecurity incident.", category: "CAMPAIGN", rarity: "COMMON", xpReward: 100 },
  { id: "threat-hunter", name: "Threat Hunter", description: "Detect 10 threats across your career.", category: "COMBAT", rarity: "COMMON", xpReward: 150 },
  { id: "firewall-master", name: "Firewall Master", description: "Successfully block 10 malicious sources.", category: "DEFENSE", rarity: "RARE", xpReward: 250 },
  { id: "zero-damage", name: "Zero Damage", description: "Complete a mission while maintaining 100% network health.", category: "DEFENSE", rarity: "EPIC", xpReward: 500 },
  { id: "lightning", name: "Lightning Response", description: "Contain a critical incident in under 10 seconds.", category: "SPEED", rarity: "RARE", xpReward: 300 },
  { id: "network-savior", name: "Network Savior", description: "Complete a mission involving multiple simultaneous threats.", category: "CAMPAIGN", rarity: "EPIC", xpReward: 500 },
  { id: "incident-commander", name: "Incident Commander", description: "Complete all five campaign missions.", category: "CAMPAIGN", rarity: "LEGENDARY", xpReward: 1000 },
  { id: "perfect-response", name: "Perfect Response", description: "No mistakes, no unnecessary isolation, excellent response time, 95%+ health.", category: "MASTERY", rarity: "LEGENDARY", xpReward: 1000 },
];
