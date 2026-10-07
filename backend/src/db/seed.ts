import { env, isProd } from "../config/env.js";
import { db, closeDb, withTx } from "./client.js";
import { hashPassword, newId } from "../utils/security.js";
import { logger } from "../utils/logger.js";
import { ACHIEVEMENTS } from "./seed-data.js";

async function seed(): Promise<void> {
  if (isProd || !env.allowSeed) {
    throw new Error("Refusing to seed: production or ALLOW_SEED != true");
  }
  const { migrate } = await import("./migrate.js");
  await migrate();
  const database = await db();
  await withTx(async (client) => {
    for (const a of ACHIEVEMENTS) {
      await client.query(
        `INSERT INTO achievements(id, name, description, category, rarity, xp_reward)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description,
           category=EXCLUDED.category, rarity=EXCLUDED.rarity, xp_reward=EXCLUDED.xp_reward`,
        [a.id, a.name, a.description, a.category, a.rarity, a.xpReward],
      );
    }
    const email = env.seedDemoEmail.toLowerCase();
    const existing = await client.query("SELECT id FROM users WHERE email=$1", [email]);
    if (existing.rowCount === 0) {
      const userId = newId();
      const profileId = newId();
      await client.query(
        "INSERT INTO users(id, email, password_hash) VALUES ($1,$2,$3)",
        [userId, email, await hashPassword(env.seedDemoPassword)],
      );
      await client.query(
        `INSERT INTO player_profiles(id, user_id, codename, level, current_xp, total_xp, rank)
         VALUES ($1,$2,$3,1,0,0,'Junior Analyst')`,
        [profileId, userId, env.seedDemoCodename],
      );
      await client.query("INSERT INTO player_skills(player_id) VALUES ($1)", [profileId]);
      await client.query("INSERT INTO player_statistics(player_id) VALUES ($1)", [profileId]);
      logger.info("demo account seeded", { email });
    } else {
      logger.info("demo account already exists", { email });
    }
  });
  logger.info("seed complete", { achievements: ACHIEVEMENTS.length });
}

if (process.argv[1] === new URL(import.meta.url).pathname || process.argv[1]?.endsWith("seed.ts")) {
  seed()
    .then(() => closeDb())
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error("seed failed", { message: String(err) });
      process.exit(1);
    });
}

export { seed };
