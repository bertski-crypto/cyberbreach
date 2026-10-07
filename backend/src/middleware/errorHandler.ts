import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodSchema } from "zod";
import { Errors, HttpError } from "../utils/respond.js";
import { logger } from "../utils/logger.js";
import { isProd } from "../config/env.js";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(Errors.unprocessable(`Invalid request body: ${parsed.error.issues.map((i) => i.message).join("; ")}`));
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(Errors.unprocessable("Invalid query parameters."));
      return;
    }
    req.query = parsed.data as unknown as Request["query"];
    next();
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(422).json({ success: false, error: { code: "UNPROCESSABLE", message: "Invalid data." } });
    return;
  }
  if (err instanceof SyntaxError && "body" in (err as unknown as Record<string, unknown>)) {
    res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Malformed JSON." } });
    return;
  }
  logger.error("unhandled error", { message: String(err) });
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL",
      message: isProd ? "Something went wrong." : String(err).slice(0, 300),
    },
  });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Endpoint not found." } });
}
