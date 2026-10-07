import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerAgent, resetDb, url } from "./helpers.js";
import { db } from "../src/db/client.js";

describe("auth", () => {
  it("registers, rejects duplicates, validates input", async () => {
    await resetDb();
    const agent = await registerAgent("op1@example.com", "Password123", "NEXUS");
    assert.ok(agent.userId);

    const dup = await agent.json("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "op1@example.com", password: "Password123", codename: "OTHER" }),
    });
    assert.equal(dup.status, 409);

    const weak = await agent.json("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "op2@example.com", password: "short", codename: "X" }),
    });
    assert.equal(weak.status, 422);

    const badEmail = await agent.json("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", password: "Password123", codename: "ABC" }),
    });
    assert.equal(badEmail.status, 422);
  });

  it("stores only password hashes", async () => {
    const database = await db();
    const row = await database.query<{ password_hash: string; email: string }>(
      "SELECT password_hash, email FROM users WHERE email=$1",
      ["op1@example.com"],
    );
    assert.ok(row.rows[0]);
    assert.ok(!row.rows[0].password_hash.includes("Password123"));
    assert.ok(row.rows[0].password_hash.length > 30);
  });

  it("login rejects bad password, accepts good one, me works", async () => {
    const bad = await fetch(url("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "op1@example.com", password: "Wrong1234" }),
    });
    assert.equal(bad.status, 401);

    const good = await fetch(url("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "op1@example.com", password: "Password123" }),
    });
    assert.equal(good.status, 200);
    const body = (await good.json()) as { success: boolean; data: { user: { email: string }; accessToken: string } };
    assert.equal(body.data.user.email, "op1@example.com");
    assert.ok(!JSON.stringify(body).includes("password_hash"));
    assert.ok(typeof body.data.accessToken === "string");

    const anon = await fetch(url("/api/auth/me"));
    assert.equal(anon.status, 401);

    const me = await fetch(url("/api/auth/me"), {
      headers: { Authorization: `Bearer ${body.data.accessToken}` },
    });
    assert.equal(me.status, 200);
    const meBody = (await me.json()) as { data: { codename: string } };
    assert.equal(meBody.data.codename, "NEXUS");
  });

  it("refresh rotates and logout revokes", async () => {
    const agent = await registerAgent("op9@example.com", "Password123", "GHOST");
    // login to obtain refresh cookie
    const login = await agent.json<{ success: boolean; data: { accessToken: string } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "op9@example.com", password: "Password123" }),
    });
    assert.equal(login.status, 200);
    const firstCookies = login.cookies.join(";");
    assert.ok(firstCookies.includes("cb_refresh"));

    const refreshed = await agent.json<{ success: boolean; data: { accessToken: string } }>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(refreshed.status, 200);
    assert.ok(refreshed.body.data.accessToken);

    const out = await agent.json("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
    assert.equal(out.status, 200);

    const stale = await agent.json("/api/auth/refresh", { method: "POST", body: JSON.stringify({}) });
    // cookie cleared on logout -> refresh without cookie fails
    assert.equal(stale.status, 401);
  });
});
