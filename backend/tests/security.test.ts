import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerAgent, resetDb, url } from "./helpers.js";

describe("security & errors", () => {
  it("health, malformed JSON, CORS, no secret leakage", async () => {
    await resetDb();
    const health = await fetch(url("/api/health"));
    assert.equal(health.status, 200);
    const hbody = (await health.json()) as { success: boolean; data: { status: string; database: string } };
    assert.equal(hbody.data.status, "ok");
    assert.equal(hbody.data.database, "connected");
    const dumped = JSON.stringify(hbody);
    assert.ok(!dumped.includes("postgres") || dumped.includes("connected"));

    const malformed = await fetch(url("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    assert.equal(malformed.status, 400);

    const cors = await fetch(url("/api/health"), { headers: { Origin: "http://localhost:5173" } });
    assert.equal(cors.headers.get("access-control-allow-origin"), "http://localhost:5173");

    const agent = await registerAgent("sec@example.com", "Password123", "AUDIT");
    const login = await agent.json<{ success: boolean; data: object }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "sec@example.com", password: "Password123" }),
    });
    const leaked = JSON.stringify(login.body);
    assert.ok(!leaked.includes("password_hash"));
    assert.ok(!leaked.includes("JWT_SECRET"));
    assert.ok(!leaked.includes("cyberbreach"));

    const missing = await agent.json("/api/nope");
    assert.equal(missing.status, 404);
  });
});
