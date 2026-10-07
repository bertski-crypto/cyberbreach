import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerAgent, resetDb } from "./helpers.js";
import { db } from "../src/db/client.js";

const PROFILE = {
  codename: "SYNCER",
  xp: 1200,
  level: 3,
  score: 5000,
  reputation: 70,
  completedMissionIds: ["m1", "m2"],
  achievements: ["first-response"],
  skills: { threatDetection: 40, incidentResponse: 35, networkDefense: 30, firewallManagement: 45, decisionMaking: 38 },
  bests: {},
  totalDetected: 12,
  successfulBlocks: 4,
  stats: {
    completedMissions: 2,
    failedMissions: 0,
    threatsNeutralized: 3,
    incorrectDecisions: 1,
    totalResponseTimeSec: 20,
    responsesCount: 4,
    firewallRulesCreated: 2,
  },
  records: {
    bestScoreOverall: 3200,
    bestRating: "A",
    fastestCriticalSec: null,
    bestHealthPct: 96,
    mostContainedSingle: 2,
    currentStreak: 2,
    longestStreak: 2,
    missionsPlayed: 2,
  },
};

describe("sync", () => {
  it("push merges then pull returns cloud state", async () => {
    await resetDb();
    const database = await db();
    await database.query(
      `INSERT INTO achievements(id, name, description, category, rarity, xp_reward)
       VALUES ('first-response','First Response','x','CAMPAIGN','COMMON',100)
       ON CONFLICT (id) DO NOTHING`,
    );
    const agent = await registerAgent("sync@example.com", "Password123", "LOCAL");

    const push = await agent.json<{ success: boolean; data: { profile: { total_xp: number; level: number } } }>(
      "/api/sync/push",
      { method: "POST", body: JSON.stringify({ profile: PROFILE }) },
    );
    assert.equal(push.status, 200);
    assert.equal(push.body.data.profile.total_xp, 1200);
    assert.ok(push.body.data.profile.level >= 2);

    const pull = await agent.json<{
      success: boolean;
      data: { achievements: Array<{ achievement_id: string }>; profile: { codename: string } };
    }>("/api/sync/pull");
    assert.equal(pull.status, 200);
    assert.ok(pull.body.data.achievements.some((a) => a.achievement_id === "first-response"));

    // second push is idempotent (completions/achievements union, no dupes)
    const push2 = await agent.json("/api/sync/push", { method: "POST", body: JSON.stringify({ profile: PROFILE }) });
    assert.equal(push2.status, 200);
    const count = await database.query<{ n: string }>(
      "SELECT COUNT(*) AS n FROM player_achievements pa JOIN player_profiles p ON p.id=pa.player_id JOIN users u ON u.id=p.user_id WHERE u.email=$1",
      ["sync@example.com"],
    );
    assert.equal(Number(count.rows[0].n), 1);

    // lower XP never downgrades cloud
    const low = await agent.json<{ success: boolean; data: { profile: { total_xp: number } } }>("/api/sync/push", {
      method: "POST",
      body: JSON.stringify({ profile: { ...PROFILE, xp: 10 } }),
    });
    assert.equal(low.body.data.profile.total_xp, 1200);
  });
});
