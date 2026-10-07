import type { PoolClient } from "pg";
import { db, withTx } from "../db/client.js";
import { env } from "../config/env.js";
import { hashPassword, hashToken, newId, signAccess, signRefresh, verifyPassword, verifyRefresh } from "../utils/security.js";
import { Errors, HttpError } from "../utils/respond.js";

export interface SessionTokens {
  accessToken: string;
  accessExpiresInSec: number;
}

async function ensureProfile(client: PoolClient, userId: string, codename: string): Promise<string> {
  const existing = await client.query<{ id: string }>("SELECT id FROM player_profiles WHERE user_id=$1", [userId]);
  if (existing.rowCount && existing.rows[0]) return existing.rows[0].id;
  const profileId = newId();
  await client.query(
    `INSERT INTO player_profiles(id, user_id, codename, level, current_xp, total_xp, rank)
     VALUES ($1,$2,$3,1,0,0,'Junior Analyst')`,
    [profileId, userId, codename],
  );
  await client.query("INSERT INTO player_skills(player_id) VALUES ($1) ON CONFLICT DO NOTHING", [profileId]);
  await client.query("INSERT INTO player_statistics(player_id) VALUES ($1) ON CONFLICT DO NOTHING", [profileId]);
  return profileId;
}

export async function register(email: string, password: string, codename: string) {
  const cleanEmail = email.trim().toLowerCase();
  return withTx(async (client) => {
    const dup = await client.query("SELECT id FROM users WHERE email=$1", [cleanEmail]);
    if (dup.rowCount) throw Errors.conflict("An account with that email already exists.");
    const userId = newId();
    await client.query("INSERT INTO users(id, email, password_hash) VALUES ($1,$2,$3)", [
      userId,
      cleanEmail,
      await hashPassword(password),
    ]);
    const profileId = await ensureProfile(client, userId, codename.trim());
    return { userId, profileId };
  });
}

export async function login(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  const database = await db();
  const found = await database.query<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email=$1",
    [cleanEmail],
  );
  const row = found.rows[0];
  const ok = row ? await verifyPassword(password, row.password_hash) : false;
  if (!row || !ok) throw Errors.unauthorized("Invalid email or password.");
  const profile = await database.query<{ id: string; codename: string }>(
    "SELECT id, codename FROM player_profiles WHERE user_id=$1",
    [row.id],
  );
  const profileId = profile.rows[0]?.id ?? (await withTx((c) => ensureProfile(c, row.id, "NEXUS")));
  const codename = profile.rows[0]?.codename ?? "NEXUS";
  await database.query("UPDATE users SET last_login_at=NOW() WHERE id=$1", [row.id]);
  const { refreshToken, expiresAt } = await issueRefresh(row.id);
  return {
    user: { id: row.id, email: cleanEmail, codename },
    profileId,
    accessToken: signAccess(row.id, cleanEmail, profileId),
    accessExpiresInSec: env.jwtAccessTtlMin * 60,
    refreshToken,
    refreshExpiresAt: expiresAt,
  };
}

export async function issueRefresh(userId: string): Promise<{ refreshToken: string; expiresAt: Date }> {
  const token = signRefresh(userId);
  const expiresAt = new Date(Date.now() + env.jwtRefreshTtlDays * 24 * 3600 * 1000);
  const database = await db();
  await database.query("INSERT INTO refresh_tokens(id, user_id, token_hash, expires_at) VALUES ($1,$2,$3,$4)", [
    newId(),
    userId,
    hashToken(token),
    expiresAt.toISOString(),
  ]);
  return { refreshToken: token, expiresAt };
}

export async function rotateRefresh(rawToken: string) {
  let claims: { sub: string };
  try {
    claims = verifyRefresh(rawToken);
  } catch {
    throw Errors.unauthorized("Session expired. Sign in again.");
  }
  return withTx(async (client) => {
    const found = await client.query<{ id: string; user_id: string; revoked_at: string | null; expires_at: string }>(
      "SELECT id, user_id, revoked_at, expires_at FROM refresh_tokens WHERE token_hash=$1",
      [hashToken(rawToken)],
    );
    const row = found.rows[0];
    if (!row || row.revoked_at || new Date(row.expires_at).getTime() < Date.now() || row.user_id !== claims.sub) {
      throw Errors.unauthorized("Session expired. Sign in again.");
    }
    await client.query("UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=$1", [row.id]);
    const token = signRefresh(row.user_id);
    const expiresAt = new Date(Date.now() + env.jwtRefreshTtlDays * 24 * 3600 * 1000);
    await client.query(
      "INSERT INTO refresh_tokens(id, user_id, token_hash, expires_at, replaced_by) VALUES ($1,$2,$3,$4,$5)",
      [newId(), row.user_id, hashToken(token), expiresAt.toISOString(), row.id],
    );
    const user = await client.query<{ email: string }>("SELECT email FROM users WHERE id=$1", [row.user_id]);
    const profile = await client.query<{ id: string; codename: string }>(
      "SELECT id, codename FROM player_profiles WHERE user_id=$1",
      [row.user_id],
    );
    const profileId = profile.rows[0]?.id ?? (await ensureProfile(client, row.user_id, "NEXUS"));
    return {
      accessToken: signAccess(row.user_id, user.rows[0]?.email ?? "", profileId),
      accessExpiresInSec: env.jwtAccessTtlMin * 60,
      refreshToken: token,
      refreshExpiresAt: expiresAt,
    };
  });
}

export async function revokeRefresh(rawToken: string): Promise<void> {
  try {
    const database = await db();
    await database.query("UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=$1", [hashToken(rawToken)]);
  } catch {
    /* logout is best-effort */
  }
}

export async function revokeAllForUser(userId: string): Promise<void> {
  const database = await db();
  await database.query("UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL", [userId]);
}

export async function getMe(userId: string) {
  const database = await db();
  const user = await database.query<{ id: string; email: string; created_at: string }>(
    "SELECT id, email, created_at FROM users WHERE id=$1",
    [userId],
  );
  if (!user.rows[0]) throw Errors.unauthorized();
  const profile = await database.query<{ id: string; codename: string; level: number }>(
    "SELECT id, codename, level FROM player_profiles WHERE user_id=$1",
    [userId],
  );
  return {
    id: user.rows[0].id,
    email: user.rows[0].email,
    codename: profile.rows[0]?.codename ?? "NEXUS",
    level: profile.rows[0]?.level ?? 1,
    createdAt: user.rows[0].created_at,
  };
}

export function assertHttpError(e: unknown): HttpError {
  if (e instanceof HttpError) return e;
  throw e;
}
