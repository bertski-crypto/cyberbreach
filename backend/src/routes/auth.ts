import { Router, type Request, type Response } from "express";
import { env } from "../config/env.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/errorHandler.js";
import { loginSchema, registerSchema } from "../validation/schemas.js";
import { ok, Errors } from "../utils/respond.js";
import { getMe, login, register, revokeRefresh, rotateRefresh } from "../services/authService.js";

export const authRouter = Router();

const REFRESH_COOKIE = "cb_refresh";

function refreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.cookieSecure,
    expires: expiresAt,
    path: "/api/auth",
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
}

authRouter.post("/register", authLimiter, validateBody(registerSchema), async (req: Request, res: Response, next) => {
  try {
    const { email, password, codename } = req.body as { email: string; password: string; codename: string };
    const { userId, profileId } = await register(email, password, codename);
    const { signAccess } = await import("../utils/security.js");
    res.status(201).json(
      ok({
        user: { id: userId, email: email.trim().toLowerCase(), codename: codename.trim() },
        profileId,
        accessToken: signAccess(userId, email.trim().toLowerCase(), profileId),
        accessExpiresInSec: env.jwtAccessTtlMin * 60,
      }),
    );
  } catch (e) {
    next(e);
  }
});

authRouter.post("/login", authLimiter, validateBody(loginSchema), async (req: Request, res: Response, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const session = await login(email, password);
    refreshCookie(res, session.refreshToken, session.refreshExpiresAt);
    res.json(
      ok({
        user: session.user,
        profileId: session.profileId,
        accessToken: session.accessToken,
        accessExpiresInSec: session.accessExpiresInSec,
      }),
    );
  } catch (e) {
    next(e);
  }
});

authRouter.post("/refresh", authLimiter, async (req: Request, res: Response, next) => {
  try {
    const raw = (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? (req.body as { refreshToken?: string })?.refreshToken;
    if (!raw) throw Errors.unauthorized("Session expired. Sign in again.");
    const session = await rotateRefresh(raw);
    refreshCookie(res, session.refreshToken, session.refreshExpiresAt);
    res.json(ok({ accessToken: session.accessToken, accessExpiresInSec: session.accessExpiresInSec }));
  } catch (e) {
    next(e);
  }
});

authRouter.post("/logout", async (req: Request, res: Response, next) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (raw) await revokeRefresh(raw);
    clearRefreshCookie(res);
    res.json(ok({ loggedOut: true }));
  } catch (e) {
    next(e);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res: Response, next) => {
  try {
    res.json(ok(await getMe(req.auth!.sub)));
  } catch (e) {
    next(e);
  }
});
