import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerAgent, resetDb, url } from "./helpers.js";

describe("ai endpoints", () => {
  it("analyze/scenario/hint/debrief/history + validation", async () => {
    await resetDb();
    const agent = await registerAgent("ai@example.com", "Password123", "ORACLE");

    const skills = { threatDetection: 80, incidentResponse: 70, networkDefense: 60, firewallManagement: 50, decisionMaking: 40 };
    const analyze = await agent.json<{ success: boolean; data: { overallSkill: number; weakestSkill: string; sessionId: string } }>(
      "/api/ai/analyze",
      {
        method: "POST",
        body: JSON.stringify({
          skills,
          averageResponseTimeSec: 6,
          averageNetworkHealth: 90,
          missionSuccessRate: 0.8,
          threatContainmentRate: 0.85,
          missionsSampled: 5,
        }),
      },
    );
    assert.equal(analyze.status, 200);
    assert.equal(analyze.body.data.overallSkill, 60);
    assert.equal(analyze.body.data.weakestSkill, "decisionMaking");
    assert.ok(analyze.body.data.sessionId);

    const scenario = await agent.json<{ success: boolean; data: { threats: unknown[]; provider: string } }>(
      "/api/ai/scenario",
      { method: "POST", body: JSON.stringify({ focus: "firewallManagement", difficulty: "HARD", incidentCount: 2 }) },
    );
    assert.equal(scenario.status, 200);
    assert.equal((scenario.body.data.threats as unknown[]).length, 2);

    const hint = await agent.json<{ success: boolean; data: { level: number; text: string } }>("/api/ai/hint", {
      method: "POST",
      body: JSON.stringify({ incidentTitle: "X", threatType: "MALWARE", severity: "HIGH", targetHostname: "PC-07", investigated: false, escalationLevel: 0, hintsUsed: 0 }),
    });
    assert.equal(hint.status, 200);
    assert.equal(hint.body.data.level, 1);
    assert.ok(hint.body.data.text.length > 0);

    const debrief = await agent.json<{ success: boolean; data: { classification: string } }>("/api/ai/debrief", {
      method: "POST",
      body: JSON.stringify({ missionTitle: "M1", success: true, accuracy: 100, avgResponseTimeSec: 3, networkHealthPct: 100, threatsNeutralized: 1, incorrectDecisions: 0 }),
    });
    assert.equal(debrief.status, 200);
    assert.equal(debrief.body.data.classification, "EXCEPTIONAL");

    const bad = await agent.json("/api/ai/analyze", {
      method: "POST",
      body: JSON.stringify({ skills: { threatDetection: 999 }, averageResponseTimeSec: -1, averageNetworkHealth: 0, missionSuccessRate: 0, threatContainmentRate: 0, missionsSampled: 0 }),
    });
    assert.equal(bad.status, 422);

    const hist = await agent.json<{ success: boolean; data: { sessions: unknown[]; analyses: unknown[] } }>("/api/ai/history");
    assert.equal(hist.status, 200);
    assert.ok((hist.body.data.sessions as unknown[]).length >= 2);

    // unauthenticated AI access rejected
    const anon = await fetch(url("/api/ai/analyze"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skills, averageResponseTimeSec: 1, averageNetworkHealth: 100, missionSuccessRate: 1, threatContainmentRate: 1, missionsSampled: 1 }),
    });
    assert.equal(anon.status, 401);
  });
});
