import { Router, type Response } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/errorHandler.js";
import { achievementUnlockSchema } from "../validation/schemas.js";
import { ok } from "../utils/respond.js";
import { listAchievements, unlockAchievement } from "../services/achievementService.js";

export const achievementsRouter = Router();

achievementsRouter.use(requireAuth);

achievementsRouter.get("/", async (req: AuthedRequest, res: Response, next) => {
  try {
    res.json(ok(await listAchievements(req.auth!.sub)));
  } catch (e) {
    next(e);
  }
});

achievementsRouter.post("/unlock", validateBody(achievementUnlockSchema), async (req: AuthedRequest, res: Response, next) => {
  try {
    const { achievementId } = req.body as { achievementId: string };
    // Server decides unlocks from mission results; this endpoint records
    // client-observed unlocks only for catalogue ids (no XP granted here).
    res.json(ok(await unlockAchievement(req.auth!.sub, achievementId)));
  } catch (e) {
    next(e);
  }
});
