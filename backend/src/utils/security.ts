import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { env } from "../config/env.js";

export function newId(): string {
  return randomUUID();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** SHA-256 of refresh tokens for storage (raw token only ever in cookie). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface AccessClaims {
  sub: string;
  email: string;
  profileId: string;
}

export function signAccess(userId: string, email: string, profileId: string): string {
  const payload: AccessClaims = { sub: userId, email, profileId };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: `${env.jwtAccessTtlMin}m` });
}

export function signRefresh(userId: string): string {
  return jwt.sign({ sub: userId, typ: "refresh" }, env.jwtRefreshSecret, {
    expiresIn: `${env.jwtRefreshTtlDays}d`,
    jwtid: newId(),
  });
}

export function verifyAccess(token: string): AccessClaims {
  return jwt.verify(token, env.jwtSecret) as AccessClaims;
}

export function verifyRefresh(token: string): { sub: string; jti?: string } {
  return jwt.verify(token, env.jwtRefreshSecret) as { sub: string; jti?: string };
}
