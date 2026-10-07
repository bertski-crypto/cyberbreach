import { db } from "../db/client.js";
import { Errors } from "../utils/respond.js";

export type LeaderboardCategory =
  | "overall"
  | "career"
  | "network_defender"
  | "rapid_response"
  | "threat_hunter";

const CATEGORIES: LeaderboardCategory[] = ["overall", "career", "network_defender", "rapid_response", "threat_hunter"];

export function isCategory(v: string): v is LeaderboardCategory {
  return (CATEGORIES as string[]).includes(v);
}

interface BoardQuery {
  orderBy: string;
  extraWhere: string;
}

/** All rankings derive from validated server-side statistics — never client claims. */
function queryFor(category: LeaderboardCategory): BoardQuery {
  switch (category) {
    case "career":
      return { orderBy: "p.total_xp DESC", extraWhere: "" };
    case "network_defender":
      return { orderBy: "s.best_network_health DESC, s.total_score DESC", extraWhere: "" };
    case "rapid_response":
      return { orderBy: "s.fastest_response_time ASC", extraWhere: "AND s.fastest_response_time IS NOT NULL" };
    case "threat_hunter":
      return { orderBy: "s.threats_contained DESC, s.total_score DESC", extraWhere: "" };
    case "overall":
    default:
      return { orderBy: "s.total_score DESC", extraWhere: "" };
  }
}

export interface BoardRow {
  rank: number;
  codename: string;
  level: number;
  totalScore: number;
  totalXp: number;
  missionsCompleted: number;
  bestScore: number;
  bestRating: string;
  bestHealth: number;
  fastestResponse: number | null;
  threatsContained: number;
}

export async function leaderboard(category: LeaderboardCategory, page: number, limit: number): Promise<{ rows: BoardRow[]; total: number; page: number; limit: number }> {
  const database = await db();
  const { orderBy, extraWhere } = queryFor(category);
  const cappedLimit = Math.min(50, Math.max(1, limit));
  const cappedPage = Math.max(1, page);
  const totalRes = await database.query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM player_profiles p
     JOIN player_statistics s ON s.player_id = p.id
     WHERE s.missions_completed > 0 ${extraWhere}`,
  );
  const total = Number(totalRes.rows[0]?.n ?? 0);
  const rows = await database.query(
    `SELECT p.codename, p.level, p.total_xp,
            s.total_score, s.missions_completed, s.best_score, s.best_rating,
            s.best_network_health, s.fastest_response_time, s.threats_contained
     FROM player_profiles p
     JOIN player_statistics s ON s.player_id = p.id
     WHERE s.missions_completed > 0 ${extraWhere}
     ORDER BY ${orderBy} LIMIT $1 OFFSET $2`,
    [cappedLimit, (cappedPage - 1) * cappedLimit],
  );
  const out: BoardRow[] = rows.rows.map((r, i) => ({
    rank: (cappedPage - 1) * cappedLimit + i + 1,
    codename: String(r.codename),
    level: Number(r.level),
    totalScore: Number(r.total_score),
    totalXp: Number(r.total_xp),
    missionsCompleted: Number(r.missions_completed),
    bestScore: Number(r.best_score),
    bestRating: String(r.best_rating),
    bestHealth: Number(r.best_network_health),
    fastestResponse: r.fastest_response_time === null ? null : Number(r.fastest_response_time),
    threatsContained: Number(r.threats_contained),
  }));
  return { rows: out, total, page: cappedPage, limit: cappedLimit };
}

export async function missionBoard(missionId: string, page: number, limit: number) {
  const database = await db();
  const cappedLimit = Math.min(50, Math.max(1, limit));
  const cappedPage = Math.max(1, page);
  const totalRes = await database.query<{ n: string }>(
    "SELECT COUNT(DISTINCT player_id) AS n FROM mission_attempts WHERE mission_id=$1 AND completed=true",
    [missionId],
  );
  const total = Number(totalRes.rows[0]?.n ?? 0);
  const rows = await database.query(
    `SELECT p.codename, p.level, MAX(a.score) AS score,
            MAX(a.network_health) AS health, MIN(a.response_time) AS response
     FROM mission_attempts a JOIN player_profiles p ON p.id = a.player_id
     WHERE a.mission_id=$1 AND a.completed=true
     GROUP BY p.id, p.codename, p.level
     ORDER BY score DESC LIMIT $2 OFFSET $3`,
    [missionId, cappedLimit, (cappedPage - 1) * cappedLimit],
  );
  return {
    rows: rows.rows.map((r, i) => ({
      rank: (cappedPage - 1) * cappedLimit + i + 1,
      codename: String(r.codename),
      level: Number(r.level),
      score: Number(r.score),
      health: Number(r.health),
      response: Number(r.response),
    })),
    total,
    page: cappedPage,
    limit: cappedLimit,
  };
}

/** The caller's own position on every board (rank = 1 + players ahead). */
export async function myPositions(userId: string): Promise<Record<string, { rank: number; total: number } | null>> {
  const database = await db();
  const prof = await database.query<{ id: string }>("SELECT id FROM player_profiles WHERE user_id=$1", [userId]);
  if (!prof.rows[0]) throw Errors.notFound("Player profile not found.");
  const pid = prof.rows[0].id;
  const me = await database.query(
    `SELECT p.total_xp, s.total_score, s.best_network_health, s.fastest_response_time, s.threats_contained, s.missions_completed
     FROM player_profiles p LEFT JOIN player_statistics s ON s.player_id = p.id WHERE p.id=$1`,
    [pid],
  );
  const m = me.rows[0];
  if (!m || Number(m.missions_completed ?? 0) === 0) {
    return { overall: null, career: null, network_defender: null, rapid_response: null, threat_hunter: null };
  }
  const rankQuery = async (sql: string, ...params: unknown[]): Promise<{ rank: number; total: number }> => {
    const r = await database.query<{ rank: string; total: string }>(sql, params);
    return { rank: Number(r.rows[0]?.rank ?? 0), total: Number(r.rows[0]?.total ?? 0) };
  };
  const [overall, career, defender, rapid, hunter] = await Promise.all([
    rankQuery(
      `SELECT (SELECT COUNT(*) FROM player_statistics WHERE total_score > $1 AND missions_completed > 0) + 1 AS rank,
              (SELECT COUNT(*) FROM player_statistics WHERE missions_completed > 0) AS total`,
      m.total_score,
    ),
    rankQuery(
      `SELECT (SELECT COUNT(*) FROM player_profiles p2 JOIN player_statistics s2 ON s2.player_id=p2.id
               WHERE s2.missions_completed > 0 AND p2.total_xp > $1) + 1 AS rank,
              (SELECT COUNT(*) FROM player_statistics WHERE missions_completed > 0) AS total`,
      m.total_xp,
    ),
    rankQuery(
      `SELECT (SELECT COUNT(*) FROM player_statistics
               WHERE missions_completed > 0 AND (best_network_health > $1 OR (best_network_health = $1 AND total_score > $2))) + 1 AS rank,
              (SELECT COUNT(*) FROM player_statistics WHERE missions_completed > 0) AS total`,
      m.best_network_health,
      m.total_score,
    ),
    m.fastest_response_time === null
      ? Promise.resolve(null)
      : rankQuery(
          `SELECT (SELECT COUNT(*) FROM player_statistics
                   WHERE missions_completed > 0 AND fastest_response_time IS NOT NULL AND fastest_response_time < $1) + 1 AS rank,
                  (SELECT COUNT(*) FROM player_statistics WHERE missions_completed > 0 AND fastest_response_time IS NOT NULL) AS total`,
          m.fastest_response_time,
        ),
    rankQuery(
      `SELECT (SELECT COUNT(*) FROM player_statistics
               WHERE missions_completed > 0 AND (threats_contained > $1 OR (threats_contained = $1 AND total_score > $2))) + 1 AS rank,
              (SELECT COUNT(*) FROM player_statistics WHERE missions_completed > 0) AS total`,
      m.threats_contained,
      m.total_score,
    ),
  ]);
  return { overall, career, network_defender: defender, rapid_response: rapid, threat_hunter: hunter };
}
