import { apiFetch } from "./client";

export const playerApi = {
  profile(): Promise<Record<string, unknown>> {
    return apiFetch("/player/profile");
  },
  updateCodename(codename: string): Promise<Record<string, unknown>> {
    return apiFetch("/player/profile", { method: "PATCH", body: JSON.stringify({ codename }) });
  },
  progression(): Promise<Record<string, unknown>> {
    return apiFetch("/player/progression");
  },
  skills(): Promise<Record<string, unknown>> {
    return apiFetch("/player/skills");
  },
  statistics(): Promise<Record<string, unknown>> {
    return apiFetch("/player/statistics");
  },
  history(limit = 20): Promise<{ attempts: unknown[]; bests: unknown[] }> {
    return apiFetch(`/player/history?limit=${limit}`);
  },
};

export interface MissionResultPayload {
  clientKey: string;
  score: number;
  rating: string;
  accuracy: number;
  avgResponseTimeSec: number;
  threatsNeutralized: number;
  incorrectDecisions: number;
  escalations: number;
  networkHealthPct: number;
  networkDamagePct: number;
  objectivesDone: number;
  objectivesTotal: number;
  success: boolean;
  startedAt?: string;
}

export const missionApi = {
  complete(missionId: string, payload: MissionResultPayload): Promise<Record<string, unknown>> {
    return apiFetch(`/missions/${missionId}/complete`, { method: "POST", body: JSON.stringify(payload) });
  },
  attempts(limit = 20): Promise<unknown[]> {
    return apiFetch(`/missions/attempts?limit=${limit}`);
  },
};

export const achievementApi = {
  list(): Promise<Array<Record<string, unknown>>> {
    return apiFetch("/achievements");
  },
};

export const aiApi = {
  history(limit = 20): Promise<{ sessions: unknown[]; analyses: unknown[] }> {
    return apiFetch(`/ai/history?limit=${limit}`);
  },
};
