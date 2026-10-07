import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, closeDb } from "./client.js";
import { logger } from "../utils/logger.js";

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations");

export async function migrate(): Promise<string[]> {
  const database = await db();
  await database.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const applied = new Set(
    (await database.query<{ version: string }>("SELECT version FROM schema_migrations")).rows.map(
      (r) => r.version,
    ),
  );
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const ran: string[] = [];
  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    if (applied.has(version)) continue;
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await database.query(sql);
    await database.query("INSERT INTO schema_migrations(version) VALUES ($1)", [version]);
    ran.push(version);
    logger.info("migration applied", { version });
  }
  return ran;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate()
    .then((ran) => {
      logger.info("migrations complete", { applied: ran.length });
      return closeDb();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error("migration failed", { message: String(err) });
      process.exit(1);
    });
}
