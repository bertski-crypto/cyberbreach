import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().max(254).email("Provide a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.")
  .regex(/[A-Za-z]/, "Password must include a letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const codenameSchema = z
  .string()
  .trim()
  .min(3, "Codename must be at least 3 characters.")
  .max(24, "Codename must be at most 24 characters.")
  .regex(/^[A-Za-z0-9_\-]+$/, "Codename may contain letters, numbers, _ and -.");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  codename: codenameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.").max(128),
});

export const codenameUpdateSchema = z.object({
  codename: codenameSchema,
});

export const ratingSchema = z.enum(["S", "A_PLUS", "A", "B", "C", "D", "F"]);

export const missionCompleteSchema = z.object({
  clientKey: z.string().trim().min(8).max(128),
  score: z.number().int().min(0).max(20000),
  rating: ratingSchema,
  accuracy: z.number().min(0).max(100),
  avgResponseTimeSec: z.number().min(0).max(3600),
  threatsNeutralized: z.number().int().min(0).max(16),
  incorrectDecisions: z.number().int().min(0).max(64),
  escalations: z.number().int().min(0).max(64).default(0),
  networkHealthPct: z.number().min(0).max(100),
  networkDamagePct: z.number().min(0).max(100),
  objectivesDone: z.number().int().min(0).max(16),
  objectivesTotal: z.number().int().min(0).max(16),
  success: z.boolean(),
  startedAt: z.string().datetime({ offset: true }).optional(),
});

export const achievementUnlockSchema = z.object({
  achievementId: z.string().trim().min(1).max(64),
  clientKey: z.string().trim().min(8).max(128).optional(),
});

export const aiAnalyzeSchema = z.object({
  skills: z.object({
    threatDetection: z.number().int().min(0).max(100),
    incidentResponse: z.number().int().min(0).max(100),
    networkDefense: z.number().int().min(0).max(100),
    firewallManagement: z.number().int().min(0).max(100),
    decisionMaking: z.number().int().min(0).max(100),
  }),
  averageResponseTimeSec: z.number().min(0).max(3600),
  averageNetworkHealth: z.number().min(0).max(100),
  missionSuccessRate: z.number().min(0).max(1),
  threatContainmentRate: z.number().min(0).max(1),
  missionsSampled: z.number().int().min(0).max(1000),
});

export const aiScenarioSchema = z.object({
  focus: z.enum(["threatDetection", "incidentResponse", "networkDefense", "firewallManagement", "decisionMaking", "AUTO"]).default("AUTO"),
  difficulty: z.enum(["EASY", "NORMAL", "HARD", "EXPERT", "ELITE"]).optional(),
  incidentCount: z.number().int().min(1).max(4).optional(),
});

export const aiHintSchema = z.object({
  incidentTitle: z.string().max(200),
  threatType: z.string().max(64),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  targetHostname: z.string().max(64),
  investigated: z.boolean().default(false),
  escalationLevel: z.number().int().min(0).max(5).default(0),
  hintsUsed: z.number().int().min(0).max(10).default(0),
});

export const aiDebriefSchema = z.object({
  missionTitle: z.string().max(120),
  success: z.boolean(),
  accuracy: z.number().min(0).max(100),
  avgResponseTimeSec: z.number().min(0).max(3600),
  networkHealthPct: z.number().min(0).max(100),
  threatsNeutralized: z.number().int().min(0).max(16),
  incorrectDecisions: z.number().int().min(0).max(64),
});

export const syncPushSchema = z.object({
  clientUpdatedAt: z.string().datetime({ offset: true }).optional(),
  profile: z.object({
    codename: codenameSchema.optional(),
    xp: z.number().int().min(0).max(1000000),
    level: z.number().int().min(1).max(99),
    score: z.number().int().min(0).max(100000000),
    reputation: z.number().int().min(0).max(100),
    completedMissionIds: z.array(z.string().max(64)).max(64),
    achievements: z.array(z.string().max(64)).max(64),
    skills: z.object({
      threatDetection: z.number().int().min(0).max(100),
      incidentResponse: z.number().int().min(0).max(100),
      networkDefense: z.number().int().min(0).max(100),
      firewallManagement: z.number().int().min(0).max(100),
      decisionMaking: z.number().int().min(0).max(100),
    }),
    bests: z.record(z.string(), z.object({
      score: z.number().int().min(0),
      rating: ratingSchema,
      responseSec: z.number().min(0),
      health: z.number().min(0).max(100),
      at: z.number().int().min(0),
    })).default({}),
    totalDetected: z.number().int().min(0).max(100000),
    successfulBlocks: z.number().int().min(0).max(100000),
    stats: z.object({
      completedMissions: z.number().int().min(0),
      failedMissions: z.number().int().min(0),
      threatsNeutralized: z.number().int().min(0),
      incorrectDecisions: z.number().int().min(0),
      totalResponseTimeSec: z.number().min(0),
      responsesCount: z.number().int().min(0),
      firewallRulesCreated: z.number().int().min(0),
    }),
    records: z.object({
      bestScoreOverall: z.number().int().min(0),
      bestRating: ratingSchema.nullable(),
      fastestCriticalSec: z.number().min(0).nullable(),
      bestHealthPct: z.number().min(0).max(100),
      mostContainedSingle: z.number().int().min(0),
      currentStreak: z.number().int().min(0),
      longestStreak: z.number().int().min(0),
      missionsPlayed: z.number().int().min(0),
    }),
  }),
});
