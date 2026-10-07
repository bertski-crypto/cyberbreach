import { create } from "zustand";
import { ApiError, ApiOfflineError, checkBackend, getAccessToken, setAccessToken } from "../services/api/client";
import { authApi, type AuthUser } from "../services/api/authApi";

export type AuthStatus = "guest" | "checking" | "auth";
export type SyncState = "offline" | "syncing" | "synced" | "error";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  backendUp: boolean;
  syncState: SyncState;
  syncMessage: string | null;
  lastSyncedAt: number | null;

  checkHealth: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, codename: string) => Promise<void>;
  logout: (keepLocal: boolean) => Promise<void>;
  refreshMe: () => Promise<void>;
  setSyncState: (s: SyncState, message?: string | null) => void;
  markSynced: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: "guest",
  user: null,
  backendUp: false,
  syncState: "offline",
  syncMessage: "Offline mode — progress saved locally.",
  lastSyncedAt: null,

  checkHealth: async () => {
    const up = await checkBackend();
    set((s) => ({
      backendUp: up,
      syncState: !up ? "offline" : s.status === "auth" ? s.syncState : "offline",
      syncMessage: !up ? "Offline mode — progress saved locally." : s.syncMessage,
    }));
    return up;
  },

  login: async (email, password) => {
    set({ status: "checking" });
    try {
      const session = await authApi.login({ email, password });
      setAccessToken(session.accessToken);
      set({
        status: "auth",
        user: session.user,
        backendUp: true,
        syncState: "syncing",
        syncMessage: "Syncing cloud profile…",
      });
    } catch (e) {
      set({ status: "guest" });
      if (e instanceof ApiOfflineError) throw e;
      throw e instanceof ApiError ? e : new Error("Sign in failed.");
    }
  },

  register: async (email, password, codename) => {
    set({ status: "checking" });
    try {
      const session = await authApi.register({ email, password, codename });
      setAccessToken(session.accessToken);
      set({
        status: "auth",
        user: session.user,
        backendUp: true,
        syncState: "syncing",
        syncMessage: "Creating cloud profile…",
      });
    } catch (e) {
      set({ status: "guest" });
      throw e instanceof ApiError ? e : new Error("Registration failed.");
    }
  },

  logout: async (keepLocal: boolean) => {
    try {
      if (getAccessToken()) await authApi.logout();
    } catch {
      /* logout is best-effort; session Kill-switch is server-side expiry */
    }
    setAccessToken(null);
    set({
      status: "guest",
      user: null,
      syncState: "offline",
      syncMessage: keepLocal
        ? "Signed out. Local progress preserved."
        : "Signed out.",
    });
  },

  refreshMe: async () => {
    try {
      const me = await authApi.me();
      set({ status: "auth", user: { id: me.id, email: me.email, codename: me.codename }, backendUp: true });
    } catch {
      setAccessToken(null);
      set({ status: "guest", user: null });
    }
  },

  setSyncState: (syncState, message = null) => set({ syncState, syncMessage: message }),

  markSynced: () => set({ syncState: "synced", syncMessage: "Cloud synced.", lastSyncedAt: Date.now() }),
}));
