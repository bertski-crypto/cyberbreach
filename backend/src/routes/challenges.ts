import { Router, type Response } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { ok } from "../utils/respond.js";
import { completeDaily, getDaily } from "../services/challengeService.js";

export const challengesRouter = Router();

challengesRouter.use(requireAuth);

challengesRouter.get("/daily", async (req: AuthedRequest, res: Response, next) => {
  try {
    res.json(ok(await getDaily(req.auth!.sub)));
  } catch (e) {
    next(e);
  }
});

challengesRouter.post("/daily/complete", async (req: AuthedRequest, res: Response, next) => {
  try {
    res.json(ok(await completeDaily(req.auth!.sub)));
  } catch (e) {
    next(e);
  }
});
