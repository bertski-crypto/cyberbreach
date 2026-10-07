import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerAgent, resetDb, url } from "./helpers.js";
import { db } from "../src/db/client.js";

const RESULT = (key: string, score: number, health = 95, threats = 2) => ({
  clientKey: key,
  score,
  rating: "A",
  accuracy: 100,
  avgResponseTimeSec: 4,
  threatsNeutralized: threats,
  incorrectDecisions: 0,
  escalations: 0,
  networkHealthPct: health,
  networkDamagePct: 100 - health,
  objectivesDone: 5,
  objectivesTotal: 5,
  success: true,
});

describe("leaderboard", () => {
  it("ranks validated results, paginates, scopes mission boards, exposes /me", async () => {
    await resetDb();
    const a = await registerAgent("lb1@example.com", "Password123", "LBONE");
    const b = await registerAgent("lb2@example.com", "Password123", "LBTWO");

    const c1 = await a.json("/api/missions/m1/complete", { method: "POST", body: JSON.stringify(RESULT("lb-a1-key", 3000, 100, 1)) });
    assert.equal(c1.status, 201);
    const c2 = await a.json("/api/missions/m2/complete", { method: "POST", body: JSON.stringify({ ...RESULT("lb-a2-key", 2000), threatsNeutralized: 1, objectivesDone: 4, objectivesTotal: 6 }) });
    assert.equal(c2.status, 201);
    const c3 = await b.json("/api/missions/m1/complete", { method: "POST", body: JSON.stringify(RESULT("lb-b1-key", 4000, 90, 1)) });
    assert.equal(c3.status, 201);

    // public board, no auth
    const board = await fetch(url("/api/leaderboard?limit=1"));
    assert.equal(board.status, 200);
    const boardBody = (await board.json()) as { success: boolean; data: { rows: Array<{ codename: string }>; total: number; page: number; limit: number } };
    assert.equal(boardBody.data.total, 2);
    assert.equal(boardBody.data.rows.length, 1);
    assert.equal(boardBody.data.rows[0].codename, "LBONE");
    const leaked = JSON.stringify(boardBody);
    assert.ok(!leaked.includes("email") && !leaked.includes("password"));

    const page2 = await fetch(url("/api/leaderboard?page=2&limit=1"));
    const p2 = (await page2.json()) as { data: { rows: Array<{ codename: string }> } };
    assert.equal(p2.data.rows[0].codename, "LBTWO");

    for (const cat of ["career", "network_defender", "rapid_response", "threat_hunter"]) {
      const r = await fetch(url(`/api/leaderboard/category/${cat}`));
      assert.equal(r.status, 200);
    }
    const badCat = await fetch(url("/api/leaderboard/category/nope"));
    assert.equal(badCat.status, 400);

    const mission = await fetch(url("/api/leaderboard/mission/m1"));
    assert.equal(mission.status, 200);
    const mb = (await mission.json()) as { data: { rows: Array<{ codename: string; score: number }> } };
    assert.equal(mb.data.rows[0].codename, "LBTWO");
    assert.equal(mb.data.rows[0].score, 4000);

    const me = await b.json<{ success: boolean; data: Record<string, { rank: number } | null> }>("/api/leaderboard/me");
    assert.equal(me.status, 200);
    assert.equal(me.body.data.overall?.rank, 2);

    const meA = await a.json<{ success: boolean; data: Record<string, { rank: number } | null> }>("/api/leaderboard/me");
    assert.equal(meA.body.data.overall?.rank, 1);

    // streaks persisted server-side
    const database = await db();
    const streak = await database.query<{ current_streak: number; longest_streak: number }>(
      "SELECT current_streak, longest_streak FROM player_statistics s JOIN player_profiles p ON p.id=s.player_id JOIN users u ON u.id=p.user_id WHERE u.email=$1",
      ["lb2@example.com"],
    );
    assert.equal(streak.rows[0].current_streak, 1);
    assert.equal(streak.rows[0].longest_streak, 1);
  });
});
