import { Router, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateQuery } from "../middleware/errorHandler.js";
import { ok, Errors } from "../utils/respond.js";
import { isCategory, leaderboard, missionBoard, myPositions } from "../services/leaderboardService.js";
import { MISSION_RULES } from "../services/missionRules.js";

export const leaderboardRouter = Router();

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Public board (only non-sensitive operator stats are returned).
leaderboardRouter.get("/", validateQuery(pageSchema.extend({ category: z.string().default("overall") })), async (req, res: Response, next) => {
  try {
    const q = req.query as { page?: number; limit?: number; category?: string };
    const category = String(q.category ?? "overall");
    if (!isCategory(category)) throw Errors.badRequest("Unknown leaderboard category.");
    res.json(ok({ category, ...(await leaderboard(category, Number(q.page ?? 1), Number(q.limit ?? 20))) }));
  } catch (e) {
    next(e);
  }
});

leaderboardRouter.get("/mission/:missionId", validateQuery(pageSchema), async (req, res: Response, next) => {
  try {
    const missionId = String(req.params.missionId);
    if (!MISSION_RULES[missionId]) throw Errors.notFound("Unknown mission.");
    const q = req.query as { page?: number; limit?: number };
    res.json(ok({ missionId, ...(await missionBoard(missionId, Number(q.page ?? 1), Number(q.limit ?? 20))) }));
  } catch (e) {
    next(e);
  }
});

leaderboardRouter.get("/category/:category", validateQuery(pageSchema), async (req, res: Response, next) => {
  try {
    const category = String(req.params.category);
    if (!isCategory(category)) throw Errors.badRequest("Unknown leaderboard category.");
    const q = req.query as { page?: number; limit?: number };
    res.json(ok({ category, ...(await leaderboard(category, Number(q.page ?? 1), Number(q.limit ?? 20))) }));
  } catch (e) {
    next(e);
  }
});

leaderboardRouter.get("/me", requireAuth, async (req: AuthedRequest, res: Response, next) => {
  try {
    res.json(ok(await myPositions(req.auth!.sub)));
  } catch (e) {
    next(e);
  }
});
