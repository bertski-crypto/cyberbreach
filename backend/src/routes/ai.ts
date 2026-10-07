import { Router, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/errorHandler.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { aiAnalyzeSchema, aiDebriefSchema, aiHintSchema, aiScenarioSchema } from "../validation/schemas.js";
import { ok } from "../utils/respond.js";
import { aiHistory, analyzePerformance, assembleScenario, buildDebrief, buildHint, recordSession } from "../services/aiService.js";

export const aiRouter = Router();

aiRouter.use(requireAuth, aiLimiter);

aiRouter.post("/analyze", validateBody(aiAnalyzeSchema), async (req: AuthedRequest, res: Response, next) => {
  try {
    const body = req.body as {
      skills: Record<string, number>;
      averageResponseTimeSec: number;
      averageNetworkHealth: number;
      missionSuccessRate: number;
      threatContainmentRate: number;
      missionsSampled: number;
    };
    const analysis = analyzePerformance({
      skills: body.skills,
      averageResponseTimeSec: body.averageResponseTimeSec,
      averageNetworkHealth: body.averageNetworkHealth,
      missionSuccessRate: body.missionSuccessRate,
      threatContainmentRate: body.threatContainmentRate,
      missionsSampled: body.missionsSampled,
    });
    const sessionId = await recordSession(req.auth!.sub, "ADAPTIVE_SCENARIO", analysis.recommendedDifficulty, analysis.trainingFocus, {
      ...analysis,
      performanceTrend: "STABLE",
    });
    res.json(ok({ ...analysis, sessionId }));
  } catch (e) {
    next(e);
  }
});

aiRouter.post("/scenario", validateBody(aiScenarioSchema), async (req: AuthedRequest, res: Response, next) => {
  try {
    const body = req.body as { focus?: string; difficulty?: string; incidentCount?: number };
    const scenario = assembleScenario({ focus: body.focus ?? "AUTO", difficulty: body.difficulty, incidentCount: body.incidentCount });
    const sessionId = await recordSession(req.auth!.sub, "AI_TRAINING", scenario.difficulty === 5 ? "ELITE" : "NORMAL", scenario.trainingFocus, null);
    res.json(ok({ ...scenario, sessionId }));
  } catch (e) {
    next(e);
  }
});

aiRouter.post("/hint", validateBody(aiHintSchema), async (req: AuthedRequest, res: Response, next) => {
  try {
    const body = req.body as {
      severity: string;
      targetHostname: string;
      investigated: boolean;
      escalationLevel: number;
      hintsUsed: number;
    };
    res.json(ok(buildHint(body)));
  } catch (e) {
    next(e);
  }
});

aiRouter.post("/debrief", validateBody(aiDebriefSchema), async (req: AuthedRequest, res: Response, next) => {
  try {
    const body = req.body as {
      missionTitle: string;
      success: boolean;
      accuracy: number;
      avgResponseTimeSec: number;
      networkHealthPct: number;
      threatsNeutralized: number;
      incorrectDecisions: number;
    };
    const report = buildDebrief(body);
    const sessionId = await recordSession(req.auth!.sub, "DEBRIEF", "NORMAL", undefined, {
      overallSkill: report.responseQualityPct,
      strongestSkill: "incidentResponse",
      weakestSkill: "threatDetection",
      recommendedDifficulty: "NORMAL",
      performanceTrend: body.success ? "STABLE" : "DECLINING",
      trainingFocus: "threatDetection",
    });
    res.json(ok({ ...report, sessionId }));
  } catch (e) {
    next(e);
  }
});

aiRouter.get(
  "/history",
  validateQuery(z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) })),
  async (req: AuthedRequest, res: Response, next) => {
    try {
      const limit = Number((req.query as { limit?: number }).limit ?? 20);
      res.json(ok(await aiHistory(req.auth!.sub, limit)));
    } catch (e) {
      next(e);
    }
  },
);
