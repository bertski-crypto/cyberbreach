import { apiFetch } from "./client";

export interface AuthUser {
  id: string;
  email: string;
  codename: string;
}

export interface AuthSession {
  user: AuthUser;
  profileId: string;
  accessToken: string;
  accessExpiresInSec: number;
}

export const authApi = {
  register(input: { email: string; password: string; codename: string }): Promise<AuthSession> {
    return apiFetch<AuthSession>("/auth/register", { method: "POST", body: JSON.stringify(input) });
  },
  login(input: { email: string; password: string }): Promise<AuthSession> {
    return apiFetch<AuthSession>("/auth/login", { method: "POST", body: JSON.stringify(input) });
  },
  logout(): Promise<{ loggedOut: boolean }> {
    return apiFetch<{ loggedOut: boolean }>("/auth/logout", { method: "POST", body: JSON.stringify({}) });
  },
  me(): Promise<AuthUser & { level: number; createdAt: string }> {
    return apiFetch("/auth/me");
  },
};
