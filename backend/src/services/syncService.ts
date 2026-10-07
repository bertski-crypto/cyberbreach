import { db, withTx } from "../db/client.js";
import { Errors } from "../utils/respond.js";
import { newId } from "../utils/security.js";
import { levelFromXp, rankForLevel } from "./missionRules.js";
import { profileIdForUser } from "./playerService.js";

export interface SyncPushProfile {
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
  attempts: Array<{
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
    startedAt?: string;
    completedAt?: string;
  }>;
}

const SKILL_COLS = ["threat_detection", "incident_response", "network_defense", "firewall_management", "decision_making"] as const;
const SKILL_KEYS = ["threatDetection", "incidentResponse", "networkDefense", "firewallManagement", "decisionMaking"] as const;

function clampSkill(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : 10;
  return Math.min(100, Math.max(0, n));
}

export async function pullSnapshot(userId: string) {
  const database = await db();
  const profileId = await profileIdForUser(userId);
  const profile = await database.query("SELECT * FROM player_profiles WHERE id=$1", [profileId]);
  const skills = await database.query("SELECT * FROM player_skills WHERE player_id=$1", [profileId]);
  const stats = await database.query("SELECT * FROM player_statistics WHERE player_id=$1", [profileId]);
  const achievements = await database.query("SELECT achievement_id, unlocked_at FROM player_achievements WHERE player_id=$1", [profileId]);
  const attempts = await database.query(
    `SELECT mission_id, client_key, score, rating, network_health, response_time, xp_earned,
            completed, objectives_done, objectives_total, started_at, completed_at, created_at
     FROM mission_attempts WHERE player_id=$1 ORDER BY created_at DESC LIMIT 50`,
    [profileId],
  );
  const aiSessions = await database.query(
    "SELECT id, session_type, difficulty, training_focus, created_at, completed_at FROM ai_sessions WHERE player_id=$1 ORDER BY created_at DESC LIMIT 20",
    [profileId],
  );
  return {
    profile: profile.rows[0] ?? null,
    skills: skills.rows[0] ?? null,
    stats: stats.rows[0] ?? null,
    achievements: achievements.rows,
    attempts: attempts.rows,
    aiSessions: aiSessions.rows,
    serverTime: new Date().toISOString(),
  };
}

export async function pushSnapshot(userId: string, input: SyncPushProfile) {
  await withTx(async (client) => {
    const found = await client.query<{ id: string }>("SELECT id FROM player_profiles WHERE user_id=$1", [userId]);
    if (!found.rows[0]) throw Errors.notFound("Player profile not found.");
    const profileId = found.rows[0].id;

    // Completed missions: union (never un-complete).
    if (input.completedMissionIds.length > 0) {
      for (const mid of new Set(input.completedMissionIds.slice(0, 64))) {
        await client.query(
          `INSERT INTO mission_attempts(
             id, player_id, mission_id, client_key, score, rating, completed, created_at
           ) VALUES ($1,$2,$3,$4,0,'F',true,NOW())
           ON CONFLICT DO NOTHING`,
          [newId(), profileId, String(mid).slice(0, 64), `sync-complete-${String(mid).slice(0, 48)}`],
        );
      }
    }
    // Achievements: union via unique constraint.
    for (const aid of new Set(input.achievements.slice(0, 64))) {
      const def = await client.query("SELECT id FROM achievements WHERE id=$1", [String(aid).slice(0, 64)]);
      if (!def.rows[0]) continue;
      await client.query(
        `INSERT INTO player_achievements(id, player_id, achievement_id)
         VALUES ($1,$2,$3) ON CONFLICT (player_id, achievement_id) DO NOTHING`,
        [newId(), profileId, String(aid).slice(0, 64)],
      );
    }
    // Attempts: idempotent insert by client_key.
    for (const a of input.attempts.slice(0, 50)) {
      await client.query(
        `INSERT INTO mission_attempts(
           id, player_id, mission_id, client_key, score, rating, network_health, response_time,
           xp_earned, completed, objectives_done, objectives_total, started_at, completed_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (player_id, client_key) DO NOTHING`,
        [
          newId(), profileId, String(a.missionId).slice(0, 64), String(a.clientKey).slice(0, 128),
          Math.max(0, Math.min(20000, Math.floor(a.score ?? 0))), String(a.rating ?? "F"),
          Math.max(0, Math.min(100, Math.round(a.networkHealth ?? 100))), Math.max(0, Math.min(3600, a.responseTime ?? 0)),
          Math.max(0, Math.min(20000, Math.floor(a.xpEarned ?? 0))), !!a.completed,
          Math.max(0, Math.floor(a.objectivesDone ?? 0)), Math.max(0, Math.floor(a.objectivesTotal ?? 0)),
          a.startedAt ?? null, a.completedAt ?? null,
        ],
      );
    }
    // XP: keep the higher legitimate total, recompute level/rank server-side.
    const cur = await client.query<{ total_xp: number }>("SELECT total_xp FROM player_profiles WHERE id=$1", [profileId]);
    const totalXp = Math.max(cur.rows[0]?.total_xp ?? 0, Math.max(0, Math.min(1000000, Math.floor(input.xp ?? 0))));
    const level = levelFromXp(totalXp);
    await client.query(
      "UPDATE player_profiles SET total_xp=$2, current_xp=$2, level=$3, rank=$4, updated_at=NOW() WHERE id=$1",
      [profileId, totalXp, level, rankForLevel(level)],
    );
    if (input.codename && typeof input.codename === "string" && input.codename.trim().length >= 3) {
      await client.query("UPDATE player_profiles SET codename=$2, updated_at=NOW() WHERE id=$1", [
        profileId,
        input.codename.trim().slice(0, 24),
      ]);
    }
    // Skills: per-skill max.
    const sets = SKILL_KEYS.map((k, i) => `${SKILL_COLS[i]} = GREATEST(${SKILL_COLS[i]}, $${i + 2})`).join(", ");
    const vals = SKILL_KEYS.map((k) => clampSkill((input.skills as Record<string, unknown>)[k]));
    await client.query(`UPDATE player_skills SET ${sets}, updated_at=NOW() WHERE player_id=$1`, [profileId, ...vals]);
    // Stats counters: monotonic max merge.
    const st = input.stats as Record<string, number>;
    const counter = (k: string) => Math.max(0, Math.floor(Number(st[k]) || 0));
    await client.query(
      `UPDATE player_statistics SET
         missions_played = GREATEST(missions_played, $2),
         missions_completed = GREATEST(missions_completed, $3),
         threats_detected = GREATEST(threats_detected, $4),
         threats_contained = GREATEST(threats_contained, $5),
         threats_failed = GREATEST(threats_failed, $6),
         total_score = GREATEST(total_score, $7),
         best_score = GREATEST(best_score, $8),
         best_network_health = GREATEST(best_network_health, $9),
         updated_at = NOW()
       WHERE player_id=$1`,
      [
        profileId,
        counter("missionsPlayed"),
        counter("completedMissions"),
        counter("threatsDetected"),
        counter("threatsContained"),
        counter("threatsFailed"),
        counter("totalScore"),
        counter("bestScore"),
        Math.min(100, counter("bestHealth")),
      ],
    );
  });
  return pullSnapshot(userId);
}
