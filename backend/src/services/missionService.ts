import type { PoolClient } from "pg";
import { db, withTx } from "../db/client.js";
import { Errors } from "../utils/respond.js";
import { newId } from "../utils/security.js";
import { adjudicateMission, levelFromXp, MISSION_RULES, rankForLevel } from "./missionRules.js";
import { profileIdForUser } from "./playerService.js";

export interface MissionCompleteInput {
  missionId: string;
  clientKey: string;
  score: number;
  rating: string;
  accuracy: number;
  avgResponseTimeSec: number;
  threatsNeutralized: number;
  incorrectDecisions: number;
  escalations: number;
  networkHealthPct: number;
  networkDamagePct: number;
  objectivesDone: number;
  objectivesTotal: number;
  success: boolean;
  startedAt?: string;
}

const RATING_ORDER = ["F", "D", "C", "B", "A", "A_PLUS", "S"];

async function applyProgress(
  client: PoolClient,
  profileId: string,
  xpEarned: number,
): Promise<{ level: number; rank: string; totalXp: number }> {
  const cur = await client.query<{ total_xp: number }>("SELECT total_xp FROM player_profiles WHERE id=$1", [profileId]);
  const totalXp = (cur.rows[0]?.total_xp ?? 0) + xpEarned;
  const level = levelFromXp(totalXp);
  const rank = rankForLevel(level);
  await client.query(
    "UPDATE player_profiles SET total_xp=$2, current_xp=$2, level=$3, rank=$4, updated_at=NOW() WHERE id=$1",
    [profileId, totalXp, level, rank],
  );
  return { level, rank, totalXp };
}

async function applyStats(
  client: PoolClient,
  profileId: string,
  input: MissionCompleteInput,
  rating: string,
): Promise<void> {
  const cur = await client.query(
    `SELECT missions_played, missions_completed, threats_detected, threats_contained,
            threats_failed, total_score, best_score, best_rating, fastest_response_time, best_network_health,
            current_streak, longest_streak
     FROM player_statistics WHERE player_id=$1`,
    [profileId],
  );
  const row = cur.rows[0] ?? {
    missions_played: 0,
    missions_completed: 0,
    threats_detected: 0,
    threats_contained: 0,
    threats_failed: 0,
    total_score: 0,
    best_score: 0,
    best_rating: "F",
    fastest_response_time: null,
    best_network_health: 0,
    current_streak: 0,
    longest_streak: 0,
  };
  const better =
    RATING_ORDER.indexOf(rating) > RATING_ORDER.indexOf(String(row.best_rating ?? "F"));
  const newStreak = input.success ? (Number(row.current_streak ?? 0) + 1) : 0;
  const params = [
    profileId,
    input.success ? 1 : 0,
    input.threatsNeutralized + input.incorrectDecisions,
    input.threatsNeutralized,
    input.incorrectDecisions,
    input.score,
    input.score,
    rating,
    input.avgResponseTimeSec,
    Math.round(input.networkHealthPct),
    better,
    newStreak,
  ];
  await client.query(
    `INSERT INTO player_statistics(
       player_id, missions_played, missions_completed, threats_detected, threats_contained,
       threats_failed, total_score, best_score, best_rating, fastest_response_time, best_network_health,
       current_streak, longest_streak, updated_at
     ) VALUES ($1,1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$12,$12,NOW())
     ON CONFLICT (player_id) DO UPDATE SET
       missions_played = player_statistics.missions_played + 1,
       missions_completed = player_statistics.missions_completed + EXCLUDED.missions_completed,
       threats_detected = player_statistics.threats_detected + EXCLUDED.threats_detected,
       threats_contained = player_statistics.threats_contained + EXCLUDED.threats_contained,
       threats_failed = player_statistics.threats_failed + EXCLUDED.threats_failed,
       total_score = player_statistics.total_score + EXCLUDED.total_score,
       best_score = GREATEST(player_statistics.best_score, EXCLUDED.best_score),
       best_rating = CASE WHEN $11 THEN EXCLUDED.best_rating ELSE player_statistics.best_rating END,
       fastest_response_time = CASE
         WHEN EXCLUDED.fastest_response_time IS NULL THEN player_statistics.fastest_response_time
         WHEN player_statistics.fastest_response_time IS NULL THEN EXCLUDED.fastest_response_time
         ELSE LEAST(player_statistics.fastest_response_time, EXCLUDED.fastest_response_time) END,
       best_network_health = GREATEST(player_statistics.best_network_health, EXCLUDED.best_network_health),
       current_streak = EXCLUDED.current_streak,
       longest_streak = GREATEST(player_statistics.longest_streak, EXCLUDED.current_streak),
       updated_at = NOW()`,
    params,
  );
  void row;
}

/** Grant inside a transaction; returns true only on first unlock. */
async function grantTx(
  client: PoolClient,
  profileId: string,
  achievementId: string,
  unlocked: string[],
): Promise<void> {
  const existing = await client.query(
    "SELECT id FROM player_achievements WHERE player_id=$1 AND achievement_id=$2",
    [profileId, achievementId],
  );
  if (existing.rows[0]) return;
  await client.query(
    `INSERT INTO player_achievements(id, player_id, achievement_id)
     VALUES ($1,$2,$3) ON CONFLICT (player_id, achievement_id) DO NOTHING`,
    [newId(), profileId, achievementId],
  );
  unlocked.push(achievementId);
}

export async function completeMission(userId: string, input: MissionCompleteInput) {
  const rule = MISSION_RULES[input.missionId];
  if (!rule) throw Errors.notFound("Unknown mission.");
  return withTx(async (client) => {
    const profileId = await (async () => {
      const found = await client.query<{ id: string }>("SELECT id FROM player_profiles WHERE user_id=$1", [userId]);
      if (!found.rows[0]) throw Errors.notFound("Player profile not found.");
      return found.rows[0].id;
    })();

    // Idempotency: same clientKey returns the original result, no double XP.
    const existing = await client.query(
      "SELECT id, score, rating, xp_earned, completed FROM mission_attempts WHERE player_id=$1 AND client_key=$2",
      [profileId, input.clientKey],
    );
    if (existing.rows[0]) {
      return { deduped: true, attempt: existing.rows[0], xpEarned: existing.rows[0].xp_earned, achievements: [] as string[] };
    }

    const prevBest = await client.query<{ score: number }>(
      "SELECT MAX(score) AS score FROM mission_attempts WHERE player_id=$1 AND mission_id=$2 AND completed=true",
      [profileId, input.missionId],
    );
    let adjudicated;
    try {
      adjudicated = adjudicateMission({
        missionId: input.missionId,
        success: input.success,
        score: input.score,
        accuracy: input.accuracy,
        avgResponseTimeSec: input.avgResponseTimeSec,
        threatsNeutralized: input.threatsNeutralized,
        incorrectDecisions: input.incorrectDecisions,
        networkHealthPct: input.networkHealthPct,
        objectivesDone: input.objectivesDone,
        objectivesTotal: input.objectivesTotal,
        isReplay: prevBest.rows[0]?.score !== null && prevBest.rows[0]?.score !== undefined,
        prevBestScore: prevBest.rows[0]?.score ?? null,
      });
    } catch {
      throw Errors.unprocessable("Result failed server validation.");
    }

    const attemptId = newId();
    await client.query(
      `INSERT INTO mission_attempts(
         id, player_id, mission_id, client_key, score, rating, network_health, response_time,
         xp_earned, completed, objectives_done, objectives_total, threats_contained, started_at, completed_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())`,
      [
        attemptId,
        profileId,
        input.missionId,
        input.clientKey,
        input.score,
        input.rating,
        Math.round(input.networkHealthPct),
        input.avgResponseTimeSec,
        adjudicated.xpEarned,
        input.success,
        input.objectivesDone,
        input.objectivesTotal,
        input.threatsNeutralized,
        input.startedAt ?? null,
      ],
    );

    const progress = await applyProgress(client, profileId, adjudicated.xpEarned);
    await applyStats(client, profileId, input, input.rating);

    // Server-decided achievement unlocks (unique constraint prevents dupes).
    const unlocked: string[] = [];
    for (const ach of adjudicated.achievements) {
      await grantTx(client, profileId, ach, unlocked);
    }
    // First-response: first-ever contained threat recorded server-side.
    if (input.threatsNeutralized > 0) {
      const prior = await client.query(
        "SELECT COUNT(*)::int AS n FROM mission_attempts WHERE player_id=$1 AND id<>$2",
        [profileId, attemptId],
      );
      if ((prior.rows[0]?.n ?? 1) === 0) {
        await grantTx(client, profileId, "first-response", unlocked);
      }
    }

    const attempt = await client.query("SELECT * FROM mission_attempts WHERE id=$1", [attemptId]);
    return { deduped: false, attempt: attempt.rows[0], xpEarned: adjudicated.xpEarned, achievements: unlocked, ...progress };
  });
}

export async function listAttempts(userId: string, limit = 20) {
  const database = await db();
  const profileId = await profileIdForUser(userId);
  const capped = Math.min(100, Math.max(1, limit));
  const rows = await database.query(
    `SELECT mission_id, score, rating, network_health, response_time, xp_earned, completed,
            objectives_done, objectives_total, started_at, completed_at, created_at
     FROM mission_attempts WHERE player_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [profileId, capped],
  );
  return rows.rows;
}
