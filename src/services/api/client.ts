/**
 * Centralized backend API client. Single place for base URL, auth headers,
 * access-token refresh, envelope parsing, and friendly offline errors.
 * The game never depends on this client — every call site degrades to local.
 */

export class ApiOfflineError extends Error {
  constructor() {
    super("Backend unavailable. Progress is saved locally.");
    this.name = "ApiOfflineError";
  }
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function apiBaseUrl(): string {
  let raw: string | undefined;
  try {
    const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
    raw = meta.env?.VITE_API_BASE_URL?.trim();
  } catch {
    raw = undefined;
  }
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:4000/api";
}

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${apiBaseUrl()}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) return false;
      const body = (await res.json()) as Envelope<{ accessToken: string }>;
      if (!body.success || !body.data?.accessToken) return false;
      accessToken = body.data.accessToken;
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function friendly(status: number, code: string, fallback: string): string {
  if (status === 0) return "Cloud synchronization failed. Your local progress is safe. We'll retry when the server is available.";
  if (status === 401) return "Session expired. Sign in again to sync.";
  if (status === 409) return fallback;
  if (status === 422) return fallback;
  if (status === 429) return "Too many requests. Slow down and retry shortly.";
  if (status >= 500) return "Cloud sync hit a server hiccup. Local progress is safe — retry shortly.";
  return `${fallback} (code ${code})`;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  let res: Response;
  try {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    res = await fetch(`${apiBaseUrl()}${path}`, { ...init, headers, credentials: "include" });
  } catch {
    throw new ApiOfflineError();
  }
  if (res.status === 401 && accessToken && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetch<T>(path, init, false);
    throw new ApiError(401, "UNAUTHORIZED", friendly(401, "UNAUTHORIZED", "Authentication required."));
  }
  let body: Envelope<T>;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(res.status, "BAD_RESPONSE", friendly(res.status, "BAD_RESPONSE", "Unexpected server response."));
  }
  if (!res.ok || !body.success) {
    const code = body.error?.code ?? "REQUEST_FAILED";
    throw new ApiError(res.status, code, friendly(res.status, code, body.error?.message ?? "Request failed."));
  }
  return body.data as T;
}

export async function checkBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${apiBaseUrl()}/health`, { credentials: "omit" });
    if (!res.ok) return false;
    const body = (await res.json()) as { success?: boolean };
    return body.success === true;
  } catch {
    return false;
  }
}
