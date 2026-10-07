import { Timer } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function MissionTimer() {
  const timeLeft = useGameStore((s) => s.missionTimeLeft);
  const total = useGameStore((s) => s.missionTimeTotal);
  const urgent = timeLeft <= 15;
  const pct = total > 0 ? Math.max(0, Math.min(100, (timeLeft / total) * 100)) : 0;

  return (
    <div aria-label="Mission timer">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
        <Timer className="h-3.5 w-3.5" aria-hidden="true" /> Time remaining
      </p>
      <p
        role="timer"
        aria-label={`${formatClock(timeLeft)} remaining`}
        className={`mono mt-0.5 text-xl font-bold ${urgent ? "text-red-300" : "text-slate-100"}`}
      >
        {formatClock(timeLeft)}
      </p>
      <div
        className="mt-1 h-1.5 w-32 overflow-hidden rounded bg-slate-800"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Mission time remaining"
      >
        <div
          className={`h-full transition-all ${urgent ? "bg-red-400" : "bg-cyan-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
