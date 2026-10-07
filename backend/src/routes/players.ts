import { Router, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/errorHandler.js";
import { codenameUpdateSchema } from "../validation/schemas.js";
import { ok } from "../utils/respond.js";
import { getHistory, getProfile, getProgression, getSkills, getStatistics, updateCodename } from "../services/playerService.js";

export const playersRouter = Router();

playersRouter.use(requireAuth);

playersRouter.get("/profile", async (req: AuthedRequest, res: Response, next) => {
  try {
    res.json(ok(await getProfile(req.auth!.sub)));
  } catch (e) {
    next(e);
  }
});

playersRouter.patch("/profile", validateBody(codenameUpdateSchema), async (req: AuthedRequest, res: Response, next) => {
  try {
    res.json(ok(await updateCodename(req.auth!.sub, (req.body as { codename: string }).codename)));
  } catch (e) {
    next(e);
  }
});

playersRouter.get("/progression", async (req: AuthedRequest, res: Response, next) => {
  try {
    res.json(ok(await getProgression(req.auth!.sub)));
  } catch (e) {
    next(e);
  }
});

playersRouter.get("/skills", async (req: AuthedRequest, res: Response, next) => {
  try {
    res.json(ok(await getSkills(req.auth!.sub)));
  } catch (e) {
    next(e);
  }
});

playersRouter.get("/statistics", async (req: AuthedRequest, res: Response, next) => {
  try {
    res.json(ok(await getStatistics(req.auth!.sub)));
  } catch (e) {
    next(e);
  }
});

playersRouter.get(
  "/history",
  validateQuery(z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) })),
  async (req: AuthedRequest, res: Response, next) => {
    try {
      const limit = Number((req.query as { limit?: number }).limit ?? 20);
      res.json(ok(await getHistory(req.auth!.sub, limit)));
    } catch (e) {
      next(e);
    }
  },
);
