import { Router, type Response } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/errorHandler.js";
import { syncPushSchema } from "../validation/schemas.js";
import { ok } from "../utils/respond.js";
import { pullSnapshot, pushSnapshot } from "../services/syncService.js";

export const syncRouter = Router();

syncRouter.use(requireAuth);

syncRouter.get("/pull", async (req: AuthedRequest, res: Response, next) => {
  try {
    res.json(ok(await pullSnapshot(req.auth!.sub)));
  } catch (e) {
    next(e);
  }
});

syncRouter.post("/push", validateBody(syncPushSchema), async (req: AuthedRequest, res: Response, next) => {
  try {
    const body = req.body as {
      profile: {
        codename?: string;
        xp: number;
        level: number;
        score: number;
        reputation: number;
        completedMissionIds: string[];
        achievements: string[];
        skills: Record<string, number>;
        bests: Record<string, { score: number; rating: string; responseSec: number; health: number; at: number }>;
        totalDetected: number;
        successfulBlocks: number;
        stats: Record<string, number>;
        records: Record<string, number | string | null>;
      };
    };
    const p = body.profile;
    const attempts: Array<{
      clientKey: string;
      missionId: string;
      score: number;
      rating: string;
      networkHealth: number;
      responseTime: number;
      xpEarned: number;
      completed: boolean;
      objectivesDone: number;
      objectivesTotal: number;
    }> = [];
    // Bests are synced as lightweight completion markers (attempts carry detail).
    for (const [missionId, b] of Object.entries(p.bests ?? {}).slice(0, 20)) {
      attempts.push({
        clientKey: `sync-best-${missionId}`,
        missionId,
        score: Math.max(0, Math.floor(b.score ?? 0)),
        rating: String(b.rating ?? "F"),
        networkHealth: Math.max(0, Math.min(100, Math.round(b.health ?? 100))),
        responseTime: Math.max(0, b.responseSec ?? 0),
        xpEarned: 0,
        completed: true,
        objectivesDone: 0,
        objectivesTotal: 0,
      });
    }
    const merged = await pushSnapshot(req.auth!.sub, {
      codename: p.codename,
      xp: p.xp,
      level: p.level,
      score: p.score,
      reputation: p.reputation,
      completedMissionIds: p.completedMissionIds ?? [],
      achievements: p.achievements ?? [],
      skills: p.skills ?? {},
      bests: p.bests ?? {},
      totalDetected: p.totalDetected ?? 0,
      successfulBlocks: p.successfulBlocks ?? 0,
      stats: {
        missionsPlayed: p.stats?.missionsPlayed ?? 0,
        completedMissions: p.stats?.completedMissions ?? 0,
        threatsDetected: p.totalDetected ?? 0,
        threatsContained: p.stats?.threatsNeutralized ?? 0,
        threatsFailed: p.stats?.incorrectDecisions ?? 0,
        totalScore: p.score ?? 0,
        bestScore: (p.records?.bestScoreOverall as number) ?? 0,
        bestHealth: (p.records?.bestHealthPct as number) ?? 0,
      },
      records: p.records ?? {},
      attempts,
    });
    res.json(ok(merged));
  } catch (e) {
    next(e);
  }
});
