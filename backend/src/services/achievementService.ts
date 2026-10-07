import { db } from "../db/client.js";
import { newId } from "../utils/security.js";
import { profileIdForUser } from "./playerService.js";

export async function listAchievements(userId: string) {
  const database = await db();
  const profileId = await profileIdForUser(userId);
  const rows = await database.query(
    `SELECT a.id, a.name, a.description, a.category, a.rarity, a.xp_reward,
            pa.unlocked_at AS "unlockedAt",
            CASE WHEN pa.id IS NULL THEN false ELSE true END AS unlocked
     FROM achievements a LEFT JOIN player_achievements pa
       ON pa.achievement_id = a.id AND pa.player_id = $1
     ORDER BY a.id`,
    [profileId],
  );
  return rows.rows;
}

export async function unlockAchievement(userId: string, achievementId: string): Promise<{ unlocked: boolean }> {
  const database = await db();
  const profileId = await profileIdForUser(userId);
  const def = await database.query("SELECT id FROM achievements WHERE id=$1", [achievementId]);
  if (!def.rows[0]) return { unlocked: false };
  // Pre-check keeps semantics stable across drivers (rowCount on
  // ON CONFLICT DO NOTHING varies); the unique constraint is the real guard.
  const existing = await database.query(
    "SELECT id FROM player_achievements WHERE player_id=$1 AND achievement_id=$2",
    [profileId, achievementId],
  );
  if (existing.rows[0]) return { unlocked: false };
  await database.query(
    `INSERT INTO player_achievements(id, player_id, achievement_id)
     VALUES ($1,$2,$3) ON CONFLICT (player_id, achievement_id) DO NOTHING`,
    [newId(), profileId, achievementId],
  );
  return { unlocked: true };
}
