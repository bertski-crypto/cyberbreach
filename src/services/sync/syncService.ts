/**
 * Cloud sync orchestrator — event-based, never per-tick.
 * Sync points: login, registration, mission completion, manual sync.
 * Local save is backed up before every merge and never deleted first.
 */
import { apiFetch } from "../api/client";
import { missionApi, type MissionResultPayload } from "../api/playerApi";
import { useAuthStore } from "../../store/authStore";
import { useGameStore } from "../../store/gameStore";
import { loadSave, type SaveData } from "../storage/saveService";
import { mergeCloudIntoLocal, type CloudSnapshot } from "./merge";

const LOCAL_KEY = "cyberbreach.save.v1";
const BACKUP_KEY = "cyberbreach.save.v1.backup";

export function backupLocal(): void {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    /* best-effort */
  }
}

function applySaveToStore(save: SaveData): void {
  // Rehydrate career state from merged data without touching live mission state.
  const game = useGameStore.getState();
  useGameStore.setState({
    username: save.username,
    xp: save.xp,
    level: save.level,
    score: save.score,
    reputation: save.reputation,
    completedMissionIds: save.completedMissionIds,
    achievements: game.achievements.map((a) => ({
      ...a,
      unlocked: save.achievements.includes(a.id),
      unlockedAt: a.unlocked ? a.unlockedAt : null,
    })),
    bests: save.bests,
    skills: save.skills,
    records: { ...game.records, ...save.records },
    totalDetected: save.totalDetected,
    successfulBlocks: save.successfulBlocks,
  });
  game.refreshMissionLocks();
}

/** Pull cloud → merge locally (backup first). Returns true when merged. */
export async function pullAndMerge(): Promise<boolean> {
  const auth = useAuthStore.getState();
  if (auth.status !== "auth") return false;
  auth.setSyncState("syncing", "Syncing cloud profile…");
  try {
    const cloud = await apiFetch<CloudSnapshot>("/sync/pull");
    const local = loadSave();
    if (!local) {
      auth.markSynced();
      return true;
    }
    backupLocal();
    applySaveToStore(mergeCloudIntoLocal(local, cloud));
    auth.markSynced();
    return true;
  } catch {
    auth.setSyncState("error", "Cloud synchronization failed. Your local progress is safe. We'll retry when the server is available.");
    return false;
  }
}

/** Push local → cloud (server unions), then adopt the merged result. */
export async function pushLocalProgress(): Promise<boolean> {
  const auth = useAuthStore.getState();
  if (auth.status !== "auth") return false;
  const local = loadSave();
  if (!local) return false;
  auth.setSyncState("syncing", "Uploading progress…");
  try {
    backupLocal();
    const merged = await apiFetch<CloudSnapshot>("/sync/push", {
      method: "POST",
      body: JSON.stringify({
        profile: {
          codename: local.username,
          xp: local.xp,
          level: local.level,
          score: local.score,
          reputation: local.reputation,
          completedMissionIds: local.completedMissionIds,
          achievements: local.achievements,
          skills: local.skills,
          bests: local.bests,
          totalDetected: local.totalDetected,
          successfulBlocks: local.successfulBlocks,
          stats: local.stats,
          records: local.records,
        },
      }),
    });
    applySaveToStore(mergeCloudIntoLocal(local, merged));
    auth.markSynced();
    return true;
  } catch {
    auth.setSyncState("error", "Cloud synchronization failed. Your local progress is safe. We'll retry when the server is available.");
    return false;
  }
}

/**
 * START FRESH: discard local career progress and adopt the cloud snapshot.
 * Only ever called from an explicit player confirmation.
 */
export async function adoptCloudFresh(): Promise<boolean> {
  const auth = useAuthStore.getState();
  if (auth.status !== "auth") return false;
  auth.setSyncState("syncing", "Loading cloud profile…");
  try {
    backupLocal();
    const cloud = await apiFetch<CloudSnapshot>("/sync/pull");
    const local = loadSave();
    const fresh: SaveData = {
      username: typeof cloud.profile?.codename === "string" && cloud.profile.codename ? cloud.profile.codename : (local?.username ?? "NEXUS"),
      xp: 0,
      level: 1,
      score: 0,
      reputation: 50,
      completedMissionIds: [],
      achievements: [],
      bests: {},
      skills: { threatDetection: 10, incidentResponse: 10, networkDefense: 10, firewallManagement: 10, decisionMaking: 10 },
      records: {
        bestScoreOverall: 0, bestRating: null, fastestCriticalSec: null, bestHealthPct: 0,
        mostContainedSingle: 0, currentStreak: 0, longestStreak: 0, missionsPlayed: 0,
      },
      totalDetected: 0,
      successfulBlocks: 0,
      aiDifficulty: local?.aiDifficulty ?? "NORMAL",
      trainingRuns: [],
      stats: {
        completedMissions: 0, failedMissions: 0, threatsNeutralized: 0, incorrectDecisions: 0,
        totalResponseTimeSec: 0, responsesCount: 0, firewallRulesCreated: 0,
      },
      soundOn: local?.soundOn ?? true,
    };
    const adopted = (cloud.attempts?.length ?? 0) > 0 || (cloud.profile?.total_xp ?? 0) > 0
      ? mergeCloudIntoLocal(fresh, cloud)
      : fresh;
    applySaveToStore(adopted);
    auth.markSynced();
    return true;
  } catch {
    auth.setSyncState("error", "Cloud synchronization failed. Your local progress is safe. We'll retry when the server is available.");
    return false;
  }
}

const reportedKeys = new Set<string>();

/** Report a finished mission (idempotent via clientKey). Fire-and-forget safe. */
export async function reportMissionResult(
  missionId: string,
  completedAt: number,
  payload: MissionResultPayload,
): Promise<void> {
  const auth = useAuthStore.getState();
  if (auth.status !== "auth") return;
  const key = `${missionId}:${completedAt}`;
  if (reportedKeys.has(key)) return;
  reportedKeys.add(key);
  auth.setSyncState("syncing", "Syncing mission result…");
  try {
    await missionApi.complete(missionId, payload);
    auth.markSynced();
  } catch {
    // Server dedupes by clientKey — safe to retry on next sync.
    reportedKeys.delete(key);
    auth.setSyncState("error", "Cloud synchronization failed. Your local progress is safe. We'll retry when the server is available.");
  }
}
