import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { migrate } from "./db/migrate.js";
import { closeDb } from "./db/client.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  try {
    const ran = await migrate();
    logger.info("database ready", { migrationsApplied: ran.length });
  } catch (err) {
    logger.error("database unavailable at startup", { message: String(err) });
    if (env.nodeEnv === "production") throw err;
  }
  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info("CYBER//BREACH API listening", { port: env.port, env: env.nodeEnv });
  });

  const shutdown = (signal: string) => {
    logger.info("shutting down", { signal });
    server.close(() => {
      closeDb().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error("fatal startup error", { message: String(err) });
  process.exit(1);
});
