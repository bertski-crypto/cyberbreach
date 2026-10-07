import { db, withTx } from "../db/client.js";
import { Errors } from "../utils/respond.js";
import { newId } from "../utils/security.js";
import { levelFromXp, rankForLevel } from "./missionRules.js";
import { profileIdForUser } from "./playerService.js";

const MISSIONS = ["m1", "m2", "m3", "m4", "m5"];

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export interface DailyChallenge {
  date: string;
  missionId: string;
  missionTitle: string;
  requiredThreats: number;
  minHealth: number;
  rewardXp: number;
  completed: boolean;
}

const TITLES: Record<string, string> = {
  m1: "First Response",
  m2: "Brute Force",
  m3: "Compromised Workstation",
  m4: "Network Intrusion",
  m5: "Multi-Stage Attack",
};

export function challengeForDate(date: string): Omit<DailyChallenge, "completed"> {
  const seed = hashSeed(`daily-${date}`);
  const missionId = MISSIONS[seed % MISSIONS.length];
  return {
    date,
    missionId,
    missionTitle: TITLES[missionId],
    requiredThreats: 2 + (seed % 3),
    minHealth: 80 + (seed % 3) * 5,
    rewardXp: 250,
  };
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getDaily(userId: string): Promise<DailyChallenge> {
  const database = await db();
  const profileId = await profileIdForUser(userId);
  const date = todayStr();
  const challenge = challengeForDate(date);
  await database.query(
    `INSERT INTO daily_challenges(challenge_date, mission_id, required_threats, min_health, reward_xp)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT (challenge_date) DO NOTHING`,
    [date, challenge.missionId, challenge.requiredThreats, challenge.minHealth, challenge.rewardXp],
  );
  const done = await database.query(
    "SELECT id FROM daily_completions WHERE player_id=$1 AND challenge_date=$2",
    [profileId, date],
  );
  return { ...challenge, completed: !!done.rows[0] };
}

export async function completeDaily(userId: string): Promise<{ completed: boolean; xpAwarded: number; challenge: DailyChallenge }> {
  return withTx(async (client) => {
    const found = await client.query<{ id: string }>("SELECT id FROM player_profiles WHERE user_id=$1", [userId]);
    if (!found.rows[0]) throw Errors.notFound("Player profile not found.");
    const profileId = found.rows[0].id;
    const date = todayStr();
    const challenge = challengeForDate(date);
    await client.query(
      `INSERT INTO daily_challenges(challenge_date, mission_id, required_threats, min_health, reward_xp)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (challenge_date) DO NOTHING`,
      [date, challenge.missionId, challenge.requiredThreats, challenge.minHealth, challenge.rewardXp],
    );
    const already = await client.query("SELECT id FROM daily_completions WHERE player_id=$1 AND challenge_date=$2", [profileId, date]);
    if (already.rows[0]) {
      return { completed: true, xpAwarded: 0, challenge: { ...challenge, completed: true } };
    }
    // Authoritative check: today's completed attempts for the challenge mission
    // meeting the health bar must contain enough threats in total.
    const progress = await client.query<{ threats: string }>(
      `SELECT COALESCE(SUM(threats_contained),0) AS threats
       FROM mission_attempts
       WHERE player_id=$1 AND mission_id=$2 AND completed=true
         AND network_health >= $3 AND completed_at::date = $4::date`,
      [profileId, challenge.missionId, challenge.minHealth, date],
    );
    if (Number(progress.rows[0]?.threats ?? 0) < challenge.requiredThreats) {
      throw Errors.unprocessable("Daily challenge requirements not met yet.");
    }
    const best = await client.query<{ id: string }>(
      `SELECT id FROM mission_attempts
       WHERE player_id=$1 AND mission_id=$2 AND completed=true
         AND network_health >= $3 AND completed_at::date = $4::date
       ORDER BY score DESC LIMIT 1`,
      [profileId, challenge.missionId, challenge.minHealth, date],
    );
    if (!best.rows[0]) throw Errors.unprocessable("Daily challenge requirements not met yet.");
    await client.query(
      "INSERT INTO daily_completions(id, player_id, challenge_date, attempt_id, xp_awarded) VALUES ($1,$2,$3,$4,$5)",
      [newId(), profileId, date, best.rows[0].id, challenge.rewardXp],
    );
    const cur = await client.query<{ total_xp: number }>("SELECT total_xp FROM player_profiles WHERE id=$1", [profileId]);
    const totalXp = (cur.rows[0]?.total_xp ?? 0) + challenge.rewardXp;
    const level = levelFromXp(totalXp);
    await client.query("UPDATE player_profiles SET total_xp=$2, current_xp=$2, level=$3, rank=$4, updated_at=NOW() WHERE id=$1", [
      profileId,
      totalXp,
      level,
      rankForLevel(level),
    ]);
    return { completed: true, xpAwarded: challenge.rewardXp, challenge: { ...challenge, completed: true } };
  });
}

