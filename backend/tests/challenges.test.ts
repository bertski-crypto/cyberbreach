import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerAgent, resetDb } from "./helpers.js";
import { db } from "../src/db/client.js";

describe("challenges + operators + admin", () => {
  it("daily challenge verifies, pays once, operator profile is public-safe, admin gated", async () => {
    await resetDb();
    const agent = await registerAgent("dc@example.com", "Password123", "DAILYOP");

    const daily = await agent.json<{ success: boolean; data: { date: string; missionId: string; requiredThreats: number; minHealth: number; rewardXp: number; completed: boolean } }>("/api/challenges/daily");
    assert.equal(daily.status, 200);
    assert.ok(["m1", "m2", "m3", "m4", "m5"].includes(daily.body.data.missionId));
    assert.equal(daily.body.data.completed, false);

    // premature claim rejected
    const early = await agent.json("/api/challenges/daily/complete", { method: "POST", body: JSON.stringify({}) });
    assert.equal(early.status, 422);

    // play today's mission successfully via validated endpoint (repeat to
    // cover the 2-4 threat quota regardless of the date seed)
    const mid = daily.body.data.missionId;
    for (let i = 0; i < 4; i++) {
      const done = await agent.json("/api/missions/" + mid + "/complete", {
        method: "POST",
        body: JSON.stringify({
          clientKey: `daily-run-${i}`,
          score: 3000,
          rating: "A",
          accuracy: 100,
          avgResponseTimeSec: 4,
          threatsNeutralized: mid === "m1" ? 1 : 2,
          incorrectDecisions: 0,
          escalations: 0,
          networkHealthPct: 100,
          networkDamagePct: 0,
          objectivesDone: 5,
          objectivesTotal: 5,
          success: true,
        }),
      });
      assert.equal(done.status, 201);
    }

    const claim = await agent.json<{ success: boolean; data: { xpAwarded: number } }>("/api/challenges/daily/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(claim.status, 200);
    assert.equal(claim.body.data.xpAwarded, 250);
    const again = await agent.json<{ success: boolean; data: { xpAwarded: number } }>("/api/challenges/daily/complete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(again.status, 200);
    assert.equal(again.body.data.xpAwarded, 0);

    // public operator profile exposes no secrets
    const { url } = await import("./helpers.js");
    const pub = await fetch(url("/api/operators/DAILYOP"));
    assert.equal(pub.status, 200);
    const pubBody = JSON.stringify(await pub.json());
    assert.ok(!pubBody.includes("email") && !pubBody.includes("password") && !pubBody.includes("ai_session"));
    assert.ok(pubBody.includes("DAILYOP"));

    const missing = await fetch(url("/api/operators/NOBODYHERE"));
    assert.equal(missing.status, 404);

    // admin gated by DB role
    const sys = await agent.json("/api/admin/system");
    assert.equal(sys.status, 403);
    const database = await db();
    await database.query("UPDATE users SET role='ADMIN' WHERE email=$1", ["dc@example.com"]);
    const sysOk = await agent.json<{ success: boolean; data: { users: number; database: string; uptimeSec: number } }>("/api/admin/system");
    assert.equal(sysOk.status, 200);
    assert.equal(sysOk.body.data.database, "connected");
    assert.ok(sysOk.body.data.users >= 1);
    assert.ok(typeof sysOk.body.data.uptimeSec === "number");
    const sysDump = JSON.stringify(sysOk.body);
    assert.ok(!sysDump.includes("DATABASE_URL") && !sysDump.includes("JWT"));
  });
});
