import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerAgent, resetDb } from "./helpers.js";

describe("player", () => {
  it("profile read/update, cross-user isolation", async () => {
    await resetDb();
    const a = await registerAgent("pa@example.com", "Password123", "ALPHA");
    const b = await registerAgent("pb@example.com", "Password123", "BRAVO");

    const prof = await a.json<{ success: boolean; data: { codename: string; level: number } }>("/api/player/profile");
    assert.equal(prof.status, 200);
    assert.equal(prof.body.data.codename, "ALPHA");

    const upd = await a.json<{ success: boolean; data: { codename: string } }>("/api/player/profile", {
      method: "PATCH",
      body: JSON.stringify({ codename: "ALPHA-2" }),
    });
    assert.equal(upd.status, 200);
    assert.equal(upd.body.data.codename, "ALPHA-2");

    // B still sees only their own profile
    const bprof = await b.json<{ success: boolean; data: { codename: string } }>("/api/player/profile");
    assert.equal(bprof.body.data.codename, "BRAVO");

    const bad = await a.json("/api/player/profile", { method: "PATCH", body: JSON.stringify({ codename: "x" }) });
    assert.equal(bad.status, 422);

    // no level/xp smuggling via profile endpoint
    const sneak = await a.json("/api/player/profile", {
      method: "PATCH",
      body: JSON.stringify({ codename: "OK123", level: 99, xp: 999 }),
    });
    assert.equal(sneak.status, 200);
    const prog = await a.json<{ success: boolean; data: { level: number } }>("/api/player/progression");
    assert.equal(prog.body.data.level, 1);

    const skills = await a.json<{ success: boolean; data: { threat_detection: number } }>("/api/player/skills");
    assert.equal(skills.status, 200);
    assert.equal(skills.body.data.threat_detection, 10);

    const stats = await a.json("/api/player/statistics");
    assert.equal(stats.status, 200);

    const hist = await a.json<{ success: boolean; data: { attempts: unknown[] } }>("/api/player/history?limit=5");
    assert.equal(hist.status, 200);
  });
});
