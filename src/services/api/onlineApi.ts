import { apiFetch } from "./client";

export type BoardCategory = "overall" | "career" | "network_defender" | "rapid_response" | "threat_hunter";

export interface BoardRow {
  rank: number;
  codename: string;
  level: number;
  totalScore: number;
  totalXp: number;
  missionsCompleted: number;
  bestScore: number;
  bestRating: string;
  bestHealth: number;
  fastestResponse: number | null;
  threatsContained: number;
}

export interface BoardResponse {
  category: string;
  rows: BoardRow[];
  total: number;
  page: number;
  limit: number;
}

export interface MissionBoardRow {
  rank: number;
  codename: string;
  level: number;
  score: number;
  health: number;
  response: number;
}

export const leaderboardApi = {
  board(category: BoardCategory = "overall", page = 1, limit = 20): Promise<BoardResponse> {
    return apiFetch(`/leaderboard?category=${category}&page=${page}&limit=${limit}`);
  },
  mission(missionId: string, page = 1, limit = 20): Promise<{ missionId: string; rows: MissionBoardRow[]; total: number; page: number; limit: number }> {
    return apiFetch(`/leaderboard/mission/${missionId}?page=${page}&limit=${limit}`);
  },
  me(): Promise<Record<string, { rank: number; total: number } | null>> {
    return apiFetch("/leaderboard/me");
  },
};

export interface PublicOperator {
  codename: string;
  level: number;
  rank: string;
  totalXp: number;
  memberSince: string;
  skills: Record<string, number> | null;
  statistics: Record<string, number | string | null> | null;
  achievements: Array<{ id: string; name: string; description: string; category: string; rarity: string; unlocked_at: string }>;
  missionRecords: Array<{ mission_id: string; score: number; health: number; response: number }>;
}

export const operatorsApi = {
  byCodename(codename: string): Promise<PublicOperator> {
    return apiFetch(`/operators/${encodeURIComponent(codename)}`);
  },
};

export interface DailyChallenge {
  date: string;
  missionId: string;
  missionTitle: string;
  requiredThreats: number;
  minHealth: number;
  rewardXp: number;
  completed: boolean;
}

export const challengesApi = {
  daily(): Promise<DailyChallenge> {
    return apiFetch("/challenges/daily");
  },
  completeDaily(): Promise<{ completed: boolean; xpAwarded: number; challenge: DailyChallenge }> {
    return apiFetch("/challenges/daily/complete", { method: "POST", body: JSON.stringify({}) });
  },
};

export interface SystemStatus {
  status: string;
  database: string;
  uptimeSec: number;
  users: number;
  operators: number;
  missionAttempts: number;
  missionsCompleted: number;
  completedToday: number;
  achievementsUnlocked: number;
}

export const adminApi = {
  system(): Promise<SystemStatus> {
    return apiFetch("/admin/system");
  },
};
