import { after, before } from "node:test";
import { createApp } from "../src/app.js";
import { migrate } from "../src/db/migrate.js";

// Test suites always run against the in-memory Postgres emulator,
// regardless of shell env syntax (Windows-safe).
process.env.TEST_DB_MEM ??= "1";
import { closeDb, db } from "../src/db/client.js";
import type { AddressInfo } from "node:net";

export interface TestCtx {
  baseUrl: string;
  close: () => Promise<void>;
}

let server: ReturnType<ReturnType<typeof createApp>["listen"]> | null = null;
let baseUrl = "";

before(async () => {
  await migrate();
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server!.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server!.close(() => resolve()));
  await closeDb();
});

export function url(path: string): string {
  return `${baseUrl}${path}`;
}

/** Wipe all rows (FK order) between suites. */
export async function resetDb(): Promise<void> {
  const database = await db();
  await database.query("DELETE FROM ai_analysis");
  await database.query("DELETE FROM ai_sessions");
  await database.query("DELETE FROM player_achievements");
  await database.query("DELETE FROM mission_attempts");
  await database.query("DELETE FROM player_statistics");
  await database.query("DELETE FROM player_skills");
  await database.query("DELETE FROM player_profiles");
  await database.query("DELETE FROM refresh_tokens");
  await database.query("DELETE FROM users");
}

export interface Agent {
  fetch: (path: string, init?: RequestInit) => Promise<Response>;
  json: <T>(path: string, init?: RequestInit) => Promise<{ status: number; body: T; cookies: string[] }>;
  accessToken: string;
  userId: string;
  email: string;
}

export async function registerAgent(email: string, password: string, codename: string): Promise<Agent> {
  let cookies: string[] = [];
  let accessToken = "";
  const doFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    if (cookies.length) headers.set("Cookie", cookies.map((c) => c.split(";")[0]).join("; "));
    const res = await fetch(url(path), { ...init, headers, redirect: "manual" });
    const setCookies = res.headers.getSetCookie?.() ?? [];
    if (setCookies.length) cookies = setCookies;
    return res;
  };
  const json = async <T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T; cookies: string[] }> => {
    const res = await doFetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers as Record<string, string>) },
    });
    const body = (await res.json()) as T;
    return { status: res.status, body, cookies };
  };

  const reg = await json<{ success: boolean; data: { user: { id: string }; accessToken: string } }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, codename }),
  });
  if (reg.status !== 201) throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.body)}`);
  accessToken = reg.body.data.accessToken;
  return { fetch: doFetch, json, accessToken, userId: reg.body.data.user.id, email };
}
