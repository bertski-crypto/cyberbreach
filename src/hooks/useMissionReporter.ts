import { useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";
import { useAuthStore } from "../store/authStore";
import { reportMissionResult } from "../services/sync/syncService";

/**
 * Event-based cloud reporting: completed missions are pushed once each
 * (server idempotency via clientKey covers retries/restarts).
 */
export function useMissionReporter(): void {
  const completedAt = useGameStore((s) => s.lastResult?.completedAt ?? null);
  const status = useAuthStore((s) => s.status);
  const seen = useRef<number | null>(null);

  useEffect(() => {
    if (!completedAt || status !== "auth" || seen.current === completedAt) return;
    seen.current = completedAt;
    const result = useGameStore.getState().lastResult;
    if (!result) return;
    const started = useGameStore.getState().missionStartedAt;
    void reportMissionResult(result.missionId, result.completedAt, {
      clientKey: `local-${result.missionId}-${result.completedAt}`,
      score: result.score,
      rating: result.securityRating,
      accuracy: result.accuracy,
      avgResponseTimeSec: result.avgResponseTimeSec,
      threatsNeutralized: result.threatsNeutralized,
      incorrectDecisions: result.incorrectDecisions,
      escalations: result.escalations,
      networkHealthPct: result.networkHealthPct,
      networkDamagePct: result.networkDamagePct,
      objectivesDone: result.objectivesDone,
      objectivesTotal: result.objectivesTotal,
      success: result.success,
      startedAt: started ? new Date(started).toISOString() : undefined,
    });
  }, [completedAt, status]);
}
