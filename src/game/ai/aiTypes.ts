/**
 * AI Game Director contracts. All scenario content stays inside the
 * fictional simulation: template ids, documentation-range addresses,
 * game objectives. No real-world attack data, ever.
 */
import type {
  Mission,
  ObjectiveTemplate,
  PerformanceRating,
  SkillKey,
  ThreatType,
} from "../../types/game";
import { INCIDENT_TEMPLATES } from "../data/incidents";

export type DifficultyName = "EASY" | "NORMAL" | "HARD" | "EXPERT" | "ELITE";

export type Trend = "IMPROVING" | "STABLE" | "DECLINING";

export interface PlayerAnalysis {
  overallSkill: number;
  skills: Record<SkillKey, number>;
  averageResponseTime: number;
  averageNetworkHealth: number;
  missionSuccessRate: number;
  threatContainmentRate: number;
  recentTrend: Trend;
  trendDelta: number;
  strongestSkill: SkillKey;
  weakestSkill: SkillKey;
  recommendedDifficulty: DifficultyName;
  trainingFocus: SkillKey;
  missionsSampled: number;
}

export interface DifficultyState {
  tier: DifficultyName;
  /** 1–5, aligned with mission difficulty scale */
  level: number;
  /** Escalation-tick pacing multiplier (higher = slower escalation) */
  escalationPacing: number;
  /** Mission timer multiplier */
  timerMultiplier: number;
  /** Max simultaneous open incidents the director will schedule */
  maxIncidents: number;
  reason: string;
}

export interface GeneratedThreat {
  templateId: string;
  /** Fictional source override (documentation-range address pool) */
  sourceIp?: string;
  /** Activation wave: 0 starts live, higher waves release later */
  wave?: number;
}

export interface GeneratedStage {
  index: number;
  name: string;
  templateIds: string[];
}

export interface GeneratedScenario {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  estimatedTimeSec: number;
  threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  objectives: ObjectiveTemplate[];
  threats: GeneratedThreat[];
  stages: GeneratedStage[];
  affectedDevices: string[];
  recommendedSkills: SkillKey[];
  briefing: string;
  why: string;
  successConditions: string[];
  failureConditions: string[];
  trainingFocus: SkillKey;
  provider: "DETERMINISTIC" | "EXTERNAL";
}

export interface ScenarioRequest {
  focus: SkillKey | "AUTO";
  difficulty?: DifficultyName;
  incidentCount?: number;
  threatTypes?: ThreatType[];
  missionId?: string;
}

export interface GeneratedHint {
  level: 1 | 2 | 3;
  text: string;
  provider: "DETERMINISTIC" | "EXTERNAL";
}

export interface DebriefReport {
  classification: "EXCEPTIONAL" | "STRONG" | "PROFICIENT" | "DEVELOPING" | "NEEDS_TRAINING";
  overallLabel: string;
  strengths: string[];
  improvements: string[];
  responseQualityPct: number;
  recommendation: string;
  recommendedFocus: SkillKey;
  provider: "DETERMINISTIC" | "EXTERNAL";
}

export interface TrainingRecommendation {
  focus: SkillKey;
  title: string;
  reason: string;
}

export interface GameAIProvider {
  readonly name: "DETERMINISTIC" | "EXTERNAL";
  analyzePlayer(input: PlayerSnapshot): Promise<PlayerAnalysis>;
  generateScenario(input: ScenarioRequest & { analysis: PlayerAnalysis }): Promise<GeneratedScenario>;
  generateHint(input: HintSnapshot): Promise<GeneratedHint>;
  generateDebrief(input: DebriefSnapshot): Promise<DebriefReport>;
}

/** Minimal serializable snapshots — never personal data, only game stats. */
export interface PlayerSnapshot {
  skills: Record<SkillKey, number>;
  missionHistory: Array<{
    missionId: string;
    success: boolean;
    score: number;
    accuracy: number;
    avgResponseTimeSec: number;
    networkHealthPct: number;
    threatsNeutralized: number;
    incorrectDecisions: number;
    completedAt: number;
  }>;
  totalDetected: number;
  successfulBlocks: number;
  incorrectDecisions: number;
  responsesCount: number;
  totalResponseTimeSec: number;
  firewallRulesCreated: number;
  level: number;
}

export interface HintSnapshot {
  incidentTitle: string;
  threatType: ThreatType;
  severity: string;
  targetHostname: string;
  sourceIp: string;
  investigated: boolean;
  escalationLevel: number;
  hintsUsed: number;
  weakestSkill: SkillKey;
}

export interface DebriefSnapshot {
  missionTitle: string;
  success: boolean;
  score: number;
  accuracy: number;
  avgResponseTimeSec: number;
  networkHealthPct: number;
  threatsNeutralized: number;
  incorrectDecisions: number;
  escalations: number;
  objectivesDone: number;
  objectivesTotal: number;
  rating: PerformanceRating;
  analysis: PlayerAnalysis;
}

export function scenarioToMission(s: GeneratedScenario): Mission {
  const threats = [...new Set(
    s.threats
      .map((t) => INCIDENT_TEMPLATES.find((x) => x.templateId === t.templateId)?.threatType)
      .filter((t): t is ThreatType => !!t),
  )];
  return {
    id: s.id,
    code: "AI TRAINING",
    title: s.title,
    briefing: s.briefing,
    objective: s.description,
    description: s.description,
    objectives: s.objectives,
    threats,
    successCondition: s.successConditions.join(" "),
    failureCondition: s.failureConditions.join(" "),
    difficulty: Math.min(5, Math.max(1, s.difficulty)) as Mission["difficulty"],
    xpReward: 300 + s.difficulty * 100,
    requiredLevel: 1,
    incidentIds: s.threats.map((t) => t.templateId),
    timeLimitSec: s.estimatedTimeSec,
    mode: "AI_ADAPTIVE",
    locked: false,
    aiBriefing: {
      assessment: "",
      focus: s.trainingFocus,
      why: s.why,
      provider: s.provider,
      difficultyName: "",
    },
  };
}
