import { Router, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/errorHandler.js";
import { missionCompleteSchema } from "../validation/schemas.js";
import { ok, Errors } from "../utils/respond.js";
import { completeMission, listAttempts } from "../services/missionService.js";
import { MISSION_RULES } from "../services/missionRules.js";

export const missionsRouter = Router();

missionsRouter.use(requireAuth);

missionsRouter.post(
  "/:missionId/complete",
  validateBody(missionCompleteSchema),
  async (req: AuthedRequest, res: Response, next) => {
    try {
      const missionId = String(req.params.missionId);
      if (!MISSION_RULES[missionId]) throw Errors.notFound("Unknown mission.");
      const body = req.body as Record<string, unknown>;
      const result = await completeMission(req.auth!.sub, {
        missionId,
        clientKey: String(body.clientKey),
        score: Number(body.score),
        rating: String(body.rating),
        accuracy: Number(body.accuracy),
        avgResponseTimeSec: Number(body.avgResponseTimeSec),
        threatsNeutralized: Number(body.threatsNeutralized),
        incorrectDecisions: Number(body.incorrectDecisions),
        escalations: Number(body.escalations ?? 0),
        networkHealthPct: Number(body.networkHealthPct),
        networkDamagePct: Number(body.networkDamagePct),
        objectivesDone: Number(body.objectivesDone),
        objectivesTotal: Number(body.objectivesTotal),
        success: Boolean(body.success),
        startedAt: typeof body.startedAt === "string" ? body.startedAt : undefined,
      });
      res.status(result.deduped ? 200 : 201).json(ok(result));
    } catch (e) {
      next(e);
    }
  },
);

missionsRouter.get(
  "/attempts",
  validateQuery(z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) })),
  async (req: AuthedRequest, res: Response, next) => {
    try {
      const limit = Number((req.query as { limit?: number }).limit ?? 20);
      res.json(ok(await listAttempts(req.auth!.sub, limit)));
    } catch (e) {
      next(e);
    }
  },
);
