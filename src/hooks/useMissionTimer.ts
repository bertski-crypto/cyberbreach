import { useEffect } from "react";
import { useGameStore } from "../store/gameStore";

/**
 * Drives the mission countdown. Ticks only while PLAYING; the interval is
 * created and destroyed with the component lifecycle — no leaks on
 * pause, restart, mission end, or unmount.
 */
export function useMissionTimer(active: boolean): void {
  const tick = useGameStore((s) => s.tick);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const activeMissionId = useGameStore((s) => s.activeMissionId);

  useEffect(() => {
    if (!active || gameStatus !== "PLAYING" || !activeMissionId) return;
    const id = window.setInterval(() => {
      useGameStore.getState().tick();
    }, 1000);
    return () => window.clearInterval(id);
  }, [active, gameStatus, activeMissionId, tick]);
}
