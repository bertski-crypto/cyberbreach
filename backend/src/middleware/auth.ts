import type { NextFunction, Request, Response } from "express";
import { verifyAccess, type AccessClaims } from "../utils/security.js";
import { Errors } from "../utils/respond.js";

export interface AuthedRequest extends Request {
  auth?: AccessClaims;
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    next(Errors.unauthorized());
    return;
  }
  try {
    req.auth = verifyAccess(header.slice(7));
    next();
  } catch {
    next(Errors.unauthorized("Session expired. Sign in again."));
  }
}
