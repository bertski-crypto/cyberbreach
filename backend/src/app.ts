import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { db } from "./db/client.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimit.js";
import { ok } from "./utils/respond.js";
import { authRouter } from "./routes/auth.js";
import { playersRouter } from "./routes/players.js";
import { missionsRouter } from "./routes/missions.js";
import { achievementsRouter } from "./routes/achievements.js";
import { syncRouter } from "./routes/sync.js";
import { aiRouter } from "./routes/ai.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { operatorsRouter } from "./routes/operators.js";
import { challengesRouter } from "./routes/challenges.js";
import { adminRouter } from "./routes/admin.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "256kb" }));
  app.use(generalLimiter);

  app.get("/api/health", async (_req, res, _next) => {
    try {
      await (await db()).query("SELECT 1 AS ok");
      res.json(ok({ status: "ok", database: "connected" }));
    } catch {
      // Never expose DATABASE_URL, credentials, or SQL details.
      res.status(200).json(ok({ status: "ok", database: "disconnected" }));
    }
  });

  app.use("/api/auth", authRouter);
  app.use("/api/player", playersRouter);
  app.use("/api/missions", missionsRouter);
  app.use("/api/achievements", achievementsRouter);
  app.use("/api/sync", syncRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/leaderboard", leaderboardRouter);
  app.use("/api/operators", operatorsRouter);
  app.use("/api/challenges", challengesRouter);
  app.use("/api/admin", adminRouter);

  app.use("/api", notFound);
  app.use(errorHandler);
  return app;
}
