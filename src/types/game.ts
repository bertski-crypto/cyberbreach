/**
 * CYBER//BREACH — core domain types.
 * All simulated threats are fictional and educational. No real
 * offensive-security functionality exists anywhere in this codebase.
 */

export type DeviceStatus =
  | "ONLINE"
  | "OFFLINE"
  | "WARNING"
  | "COMPROMISED"
  | "ISOLATED"
  | "UNDER_ATTACK";

export type DeviceType =
  | "FIREWALL"
  | "ROUTER"
  | "WORKSTATION"
  | "SERVER"
  | "DATABASE"
  | "PRINTER"
  | "IOT"
  | "INTERNET";

export type NetworkSegment =
  | "WAN"
  | "DMZ"
  | "CORE"
  | "WORKSTATIONS"
  | "SERVERS"
  | "IOT";

export interface NetworkDevice {
  id: string;
  hostname: string;
  ip: string;
  type: DeviceType;
  segment: NetworkSegment;
  status: DeviceStatus;
  health: number; // 0–100
  /** Grid position (percent 0–100) for the SVG map */
  x: number;
  y: number;
}

export type ThreatSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ThreatType =
  | "BRUTE_FORCE"
  | "MALWARE"
  | "PHISHING"
  | "PORT_SCAN"
  | "DDOS"
  | "UNAUTHORIZED_ACCESS"
  | "DATA_EXFILTRATION"
  | "SUSPICIOUS_LOGIN"
  | "RANSOMWARE"
  | "INSIDER_THREAT";

export type IncidentStatus =
  | "ACTIVE"
  | "INVESTIGATING"
  | "QUEUED"
  | "CONTAINED"
  | "RESOLVED"
  | "IGNORED"
  | "ESCALATED";

export interface Incident {
  id: string;
  /** Template this incident was spawned from (for scoring rules) */
  templateId?: string;
  threatType: ThreatType;
  severity: ThreatSeverity;
  title: string;
  description: string;
  source: string;
  /** Machine-readable attacker address used for firewall blocks */
  sourceIp: string;
  /** Observed malicious attempt count, when the sensor reports one */
  attempts?: number;
  targetDeviceId: string;
  targetHostname: string;
  status: IncidentStatus;
  /** Simulated escalation stage 0–5, rises while the threat is unresolved */
  escalationLevel: number;
  /** Staged activation wave for AI scenarios (0 = live at mission start) */
  wave?: number;
  createdAt: number;
  /** Seconds the player has to respond (0 = no timer) */
  timeLimitSec: number;
  expiresAt: number | null;
  recommendedActions: IncidentActionKind[];
  hint: string;
}

export type IncidentActionKind =
  | "ISOLATE_DEVICE"
  | "BLOCK_TRAFFIC"
  | "BLOCK_SOURCE"
  | "INVESTIGATE"
  | "IGNORE"
  | "RESTART_DEVICE"
  | "ADD_FIREWALL_RULE";

export interface IncidentActionResult {
  success: boolean;
  message: string;
  xpAwarded: number;
  scoreDelta: number;
  correct: boolean;
}

export interface FirewallRule {
  id: string;
  source: string;
  destination: string;
  port: number;
  protocol: "TCP" | "UDP" | "ICMP" | "ANY";
  action: "ALLOW" | "BLOCK";
  enabled: boolean;
  hits: number;
}

export type MissionDifficulty = 1 | 2 | 3 | 4 | 5;

export type ObjectiveKind =
  | "DETECT"
  | "INVESTIGATE"
  | "BLOCK_SOURCE"
  | "ISOLATE"
  | "PROTECT"
  | "CONTAIN_ALL"
  | "FAST_RESPONSE"
  | "MAINTAIN_HEALTH";

export interface ObjectiveTemplate {
  id: string;
  label: string;
  kind: ObjectiveKind;
  /** Device this objective refers to (isolate / protect / investigate) */
  targetDeviceId?: string;
  /** Attacker address for block-source objectives */
  ip?: string;
  /** Minimum network health for MAINTAIN_HEALTH */
  minHealth?: number;
  /** Max average response seconds for FAST_RESPONSE */
  maxSec?: number;
}

export interface Mission {
  id: string;
  code: string;
  title: string;
  briefing: string;
  objective: string;
  /** Short campaign description shown on the mission card */
  description: string;
  /** Step-by-step field orders shown in briefing and tracked live */
  objectives: ObjectiveTemplate[];
  /** Threat types featured (mission card + briefing) */
  threats: ThreatType[];
  /** Win condition text for the briefing */
  successCondition: string;
  /** Fail condition text for the briefing */
  failureCondition: string;
  difficulty: MissionDifficulty;
  xpReward: number;
  /** Minimum player level required (campaign + progression gate) */
  requiredLevel: number;
  /** Incident template ids spawned by this mission */
  incidentIds: string[];
  /** Mission countdown in seconds (mission fails at zero) */
  timeLimitSec: number;
  mode: "TRAINING" | "INCIDENT_RESPONSE" | "NETWORK_DEFENSE" | "AI_ADAPTIVE";
  locked: boolean;
  /** AI Director briefing envelope for generated scenarios */
  aiBriefing?: {
    assessment: string;
    focus: string;
    why: string;
    provider: string;
    difficultyName: string;
  };
}

export type GameStatus =
  | "MENU"
  | "BRIEFING"
  | "PLAYING"
  | "PAUSED"
  | "MISSION_COMPLETE"
  | "MISSION_FAILED";

export interface PlayerStats {
  completedMissions: number;
  failedMissions: number;
  threatsNeutralized: number;
  incorrectDecisions: number;
  totalResponseTimeSec: number;
  responsesCount: number;
  firewallRulesCreated: number;
}

export interface Player {
  id: string;
  username: string;
  level: number;
  xp: number;
  reputation: number; // 0–100
  score: number;
  stats: PlayerStats;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt: number | null;
}

export type AchievementRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export type AchievementCategory =
  | "COMBAT"
  | "DEFENSE"
  | "SPEED"
  | "ACCURACY"
  | "CAMPAIGN"
  | "MASTERY";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  xpReward: number;
}

export type SkillKey =
  | "threatDetection"
  | "incidentResponse"
  | "networkDefense"
  | "firewallManagement"
  | "decisionMaking";

export type Skills = Record<SkillKey, number>;

export interface XpBreakdownItem {
  label: string;
  amount: number;
}

export type ThreatLevel = "LOW" | "GUARDED" | "ELEVATED" | "HIGH" | "CRITICAL";

export type PerformanceRating = "S" | "A_PLUS" | "A" | "B" | "C" | "D" | "F";

export function ratingLabel(r: PerformanceRating): string {
  return r === "A_PLUS" ? "A+" : r;
}

export interface PersonalBest {
  score: number;
  rating: PerformanceRating;
  responseSec: number;
  health: number;
  at: number;
}

export type NoticeTone = "info" | "success" | "warning" | "error";

export type LogSeverity = "INFO" | "HIGH" | "SUCCESS" | "WARN" | "ERROR";

export interface GameLogEntry {
  id: string;
  at: number;
  message: string;
  sev?: LogSeverity;
}

export interface MissionResult {
  missionId: string;
  success: boolean;
  score: number;
  accuracy: number; // 0–100
  avgResponseTimeSec: number;
  /** Response tier label (Excellent / Good / Average / Slow) */
  responseTier: string;
  threatsNeutralized: number;
  incorrectDecisions: number;
  /** Escalation events during the mission */
  escalations: number;
  networkDamagePct: number;
  networkHealthPct: number;
  /** Objectives completed / total */
  objectivesDone: number;
  objectivesTotal: number;
  xpEarned: number;
  /** Itemized XP for the mission report (actions live + completion bonuses) */
  xpBreakdown: XpBreakdownItem[];
  /** Skill gains earned during this mission */
  skillGains: Partial<Record<SkillKey, number>>;
  /** Achievement ids unlocked by this mission attempt */
  achievementsEarned: string[];
  securityRating: PerformanceRating;
  debrief: string;
  completedAt: number;
}
