import { Router, type Response } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { ok } from "../utils/respond.js";
import { db } from "../db/client.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/system", async (_req: AuthedRequest, res: Response, next) => {
  try {
    const database = await db();
    const [users, profiles, attempts, achievements, today] = await Promise.all([
      database.query<{ n: string }>("SELECT COUNT(*) AS n FROM users"),
      database.query<{ n: string }>("SELECT COUNT(*) AS n FROM player_profiles"),
      database.query<{ total: string; completed: string }>(
        "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE completed) AS completed FROM mission_attempts",
      ),
      database.query<{ n: string }>("SELECT COUNT(*) AS n FROM player_achievements"),
      database.query<{ n: string }>("SELECT COUNT(*) AS n FROM mission_attempts WHERE completed AND completed_at::date = CURRENT_DATE"),
    ]);
    res.json(
      ok({
        status: "ok",
        database: "connected",
        uptimeSec: Math.round(process.uptime()),
        users: Number(users.rows[0]?.n ?? 0),
        operators: Number(profiles.rows[0]?.n ?? 0),
        missionAttempts: Number(attempts.rows[0]?.total ?? 0),
        missionsCompleted: Number(attempts.rows[0]?.completed ?? 0),
        completedToday: Number(today.rows[0]?.n ?? 0),
        achievementsUnlocked: Number(achievements.rows[0]?.n ?? 0),
      }),
    );
  } catch (e) {
    next(e);
  }
});
