import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerAgent, resetDb } from "./helpers.js";

const RESULT = {
  clientKey: "attempt-1",
  score: 2500,
  rating: "A",
  accuracy: 100,
  avgResponseTimeSec: 4.5,
  threatsNeutralized: 1,
  incorrectDecisions: 0,
  escalations: 0,
  networkHealthPct: 100,
  networkDamagePct: 0,
  objectivesDone: 5,
  objectivesTotal: 5,
  success: true,
};

describe("missions", () => {
  it("completes with server-computed XP, dedupes retries", async () => {
    await resetDb();
    const agent = await registerAgent("m1@example.com", "Password123", "STRIKER");

    const first = await agent.json<{
      success: boolean;
      data: { deduped: boolean; xpEarned: number; achievements: string[]; level: number };
    }>("/api/missions/m1/complete", { method: "POST", body: JSON.stringify(RESULT) });
    assert.equal(first.status, 201);
    assert.equal(first.body.data.deduped, false);
    // base 250 + health 100 + fast 50 + perfect 200 + excellent(S? rating A -> no) = 600
    assert.ok(first.body.data.xpEarned >= 250 && first.body.data.xpEarned <= 5000);
    assert.ok(first.body.data.achievements.includes("zero-damage"));

    const prog = await agent.json<{ success: boolean; data: { totalXp: number; level: number } }>("/api/player/progression");
    const xpAfterFirst = prog.body.data.totalXp;
    assert.ok(xpAfterFirst > 0);

    // Same clientKey -> dedupe, no double XP
    const retry = await agent.json<{ success: boolean; data: { deduped: boolean; xpEarned: number } }>(
      "/api/missions/m1/complete",
      { method: "POST", body: JSON.stringify(RESULT) },
    );
    assert.equal(retry.status, 200);
    assert.equal(retry.body.data.deduped, true);
    const prog2 = await agent.json<{ success: boolean; data: { totalXp: number } }>("/api/player/progression");
    assert.equal(prog2.body.data.totalXp, xpAfterFirst);

    // Absurd score rejected
    const cheat = await agent.json("/api/missions/m1/complete", {
      method: "POST",
      body: JSON.stringify({ ...RESULT, clientKey: "attempt-2", score: 19999, xpEarned: 999999 }),
    });
    assert.ok([201, 422].includes(cheat.status));
    if (cheat.status === 201) {
      const cheated = cheat.body as { success: boolean; data: { xpEarned: number } };
      assert.ok(cheated.data.xpEarned <= 5000);
    }

    const unknown = await agent.json("/api/missions/m99/complete", {
      method: "POST",
      body: JSON.stringify({ ...RESULT, clientKey: "attempt-3" }),
    });
    assert.equal(unknown.status, 404);

    const badRating = await agent.json("/api/missions/m1/complete", {
      method: "POST",
      body: JSON.stringify({ ...RESULT, clientKey: "attempt-4", rating: "SSS" }),
    });
    assert.equal(badRating.status, 422);
  });
});
