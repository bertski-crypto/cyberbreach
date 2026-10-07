import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerAgent, resetDb } from "./helpers.js";
import { db } from "../src/db/client.js";

describe("achievements", () => {
  it("unlock prevents duplicates, catalogue seeded", async () => {
    await resetDb();
    const agent = await registerAgent("ach@example.com", "Password123", "MEDAL");
    // seed catalogue (normally via seed script)
    const database = await db();
    await database.query(
      `INSERT INTO achievements(id, name, description, category, rarity, xp_reward)
       VALUES ('first-response','First Response','x','CAMPAIGN','COMMON',100)
       ON CONFLICT (id) DO NOTHING`,
    );

    const list = await agent.json<{ success: boolean; data: Array<{ id: string; unlocked: boolean }> }>("/api/achievements");
    assert.equal(list.status, 200);
    assert.ok(list.body.data.some((a) => a.id === "first-response" && a.unlocked === false));

    const u1 = await agent.json<{ success: boolean; data: { unlocked: boolean } }>("/api/achievements/unlock", {
      method: "POST",
      body: JSON.stringify({ achievementId: "first-response" }),
    });
    assert.equal(u1.body.data.unlocked, true);

    const u2 = await agent.json<{ success: boolean; data: { unlocked: boolean } }>("/api/achievements/unlock", {
      method: "POST",
      body: JSON.stringify({ achievementId: "first-response" }),
    });
    assert.equal(u2.body.data.unlocked, false);

    const bad = await agent.json("/api/achievements/unlock", {
      method: "POST",
      body: JSON.stringify({ achievementId: "nope-not-real" }),
    });
    assert.equal(bad.status, 200);
    assert.equal((bad.body as { success: boolean; data: { unlocked: boolean } }).data.unlocked, false);
  });
});
