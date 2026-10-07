export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string };
}

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
}

export function ok<T>(data: T): ApiSuccessBody<T> {
  return { success: true, data };
}

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const Errors = {
  badRequest: (msg = "Invalid request.") => new HttpError(400, "BAD_REQUEST", msg),
  unauthorized: (msg = "Authentication required.") => new HttpError(401, "UNAUTHORIZED", msg),
  forbidden: (msg = "Access denied.") => new HttpError(403, "FORBIDDEN", msg),
  notFound: (msg = "Not found.") => new HttpError(404, "NOT_FOUND", msg),
  conflict: (msg = "Conflict.") => new HttpError(409, "CONFLICT", msg),
  unprocessable: (msg = "Invalid data.") => new HttpError(422, "UNPROCESSABLE", msg),
  rateLimited: (msg = "Too many requests. Slow down.") => new HttpError(429, "RATE_LIMITED", msg),
  internal: (msg = "Something went wrong.") => new HttpError(500, "INTERNAL", msg),
};
