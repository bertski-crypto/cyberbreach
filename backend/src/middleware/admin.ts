import type { NextFunction, Response } from "express";
import { db } from "../db/client.js";
import { Errors } from "../utils/respond.js";
import { requireAuth, type AuthedRequest } from "./auth.js";

/** Server-side role check — the browser is never trusted for privileges. */
export async function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) {
      next(Errors.unauthorized());
      return;
    }
    const database = await db();
    const row = await database.query<{ role: string }>("SELECT role FROM users WHERE id=$1", [req.auth.sub]);
    if (row.rows[0]?.role !== "ADMIN") {
      next(Errors.forbidden("Admin access required."));
      return;
    }
    next();
  } catch (e) {
    next(e);
  }
}

export { requireAuth };
