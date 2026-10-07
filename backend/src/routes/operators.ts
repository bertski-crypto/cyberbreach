import { Router, type Response } from "express";
import { db } from "../db/client.js";
import { ok, Errors } from "../utils/respond.js";

export const operatorsRouter = Router();

// Public operator dossier — codename lookup, non-sensitive fields only.
operatorsRouter.get("/:codename", async (req, res: Response, next) => {
  try {
    const codename = String(req.params.codename).slice(0, 24);
    const database = await db();
    const profile = await database.query(
      `SELECT p.id, p.codename, p.level, p.rank, p.total_xp, p.created_at
       FROM player_profiles p WHERE p.codename=$1`,
      [codename],
    );
    const row = profile.rows[0];
    if (!row) throw Errors.notFound("Operator not found.");
    const [skills, stats, achievements, bests] = await Promise.all([
      database.query(
        `SELECT threat_detection, incident_response, network_defense, firewall_management, decision_making
         FROM player_skills WHERE player_id=$1`,
        [row.id],
      ),
      database.query(
        `SELECT missions_played, missions_completed, threats_detected, threats_contained,
                total_score, best_score, best_rating, fastest_response_time, best_network_health,
                current_streak, longest_streak
         FROM player_statistics WHERE player_id=$1`,
        [row.id],
      ),
      database.query(
        `SELECT a.id, a.name, a.description, a.category, a.rarity, pa.unlocked_at
         FROM player_achievements pa JOIN achievements a ON a.id=pa.achievement_id
         WHERE pa.player_id=$1 ORDER BY pa.unlocked_at`,
        [row.id],
      ),
      database.query(
        `SELECT mission_id, MAX(score) AS score, MAX(network_health) AS health, MIN(response_time) AS response
         FROM mission_attempts WHERE player_id=$1 AND completed=true GROUP BY mission_id`,
        [row.id],
      ),
    ]);
    res.json(
      ok({
        codename: row.codename,
        level: row.level,
        rank: row.rank,
        totalXp: row.total_xp,
        memberSince: row.created_at,
        skills: skills.rows[0] ?? null,
        statistics: stats.rows[0] ?? null,
        achievements: achievements.rows,
        missionRecords: bests.rows,
      }),
    );
  } catch (e) {
    next(e);
  }
});
