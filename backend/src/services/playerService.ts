import { db } from "../db/client.js";
import { Errors } from "../utils/respond.js";
import { levelFromXp, rankForLevel } from "./missionRules.js";

export async function profileIdForUser(userId: string): Promise<string> {
  const database = await db();
  const found = await database.query<{ id: string }>("SELECT id FROM player_profiles WHERE user_id=$1", [userId]);
  if (!found.rows[0]) throw Errors.notFound("Player profile not found.");
  return found.rows[0].id;
}

export async function getProfile(userId: string) {
  const database = await db();
  const profileId = await profileIdForUser(userId);
  const profile = await database.query(
    `SELECT id, codename, level, current_xp, total_xp, rank, created_at, updated_at
     FROM player_profiles WHERE id=$1`,
    [profileId],
  );
  return profile.rows[0];
}

export async function updateCodename(userId: string, codename: string) {
  const database = await db();
  const profileId = await profileIdForUser(userId);
  await database.query(
    "UPDATE player_profiles SET codename=$2, updated_at=NOW() WHERE id=$1",
    [profileId, codename.trim()],
  );
  return getProfile(userId);
}

export async function getProgression(userId: string) {
  const profile = (await getProfile(userId)) as {
    level: number;
    current_xp: number;
    total_xp: number;
    rank: string;
  };
  return {
    level: profile.level,
    currentXp: profile.current_xp,
    totalXp: profile.total_xp,
    rank: profile.rank,
    computedLevel: levelFromXp(profile.total_xp),
    computedRank: rankForLevel(levelFromXp(profile.total_xp)),
  };
}

export async function getSkills(userId: string) {
  const database = await db();
  const profileId = await profileIdForUser(userId);
  const skills = await database.query("SELECT * FROM player_skills WHERE player_id=$1", [profileId]);
  return skills.rows[0] ?? null;
}

export async function getStatistics(userId: string) {
  const database = await db();
  const profileId = await profileIdForUser(userId);
  const stats = await database.query("SELECT * FROM player_statistics WHERE player_id=$1", [profileId]);
  return stats.rows[0] ?? null;
}

export async function getHistory(userId: string, limit = 20) {
  const database = await db();
  const profileId = await profileIdForUser(userId);
  const capped = Math.min(100, Math.max(1, limit));
  const attempts = await database.query(
    `SELECT mission_id, score, rating, network_health, response_time, xp_earned,
            completed, objectives_done, objectives_total, started_at, completed_at, created_at
     FROM mission_attempts WHERE player_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [profileId, capped],
  );
  const bests = await database.query(
    `SELECT mission_id, MAX(score) AS best_score
     FROM mission_attempts WHERE player_id=$1 AND completed=true GROUP BY mission_id`,
    [profileId],
  );
  return { attempts: attempts.rows, bests: bests.rows };
}
