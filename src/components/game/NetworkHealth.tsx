import { HeartPulse } from "lucide-react";
import { networkHealth } from "../../game/systems/xp";
import { useGameStore } from "../../store/gameStore";

export default function NetworkHealth() {
  const devices = useGameStore((s) => s.devices);
  const health = networkHealth(devices.map((d) => d.health));
  const tone = health >= 80 ? "text-emerald-300" : health >= 50 ? "text-amber-300" : "text-red-300";
  const bar = health >= 80 ? "bg-emerald-400" : health >= 50 ? "bg-amber-300" : "bg-red-400";

  return (
    <div aria-label="Network health">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
        <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" /> Network health
      </p>
      <p className={`mono mt-0.5 text-xl font-bold ${tone}`}>{health}%</p>
      <div
        className="mt-1 h-1.5 w-32 overflow-hidden rounded bg-slate-800"
        role="progressbar"
        aria-valuenow={health}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Network health ${health} percent`}
      >
        <div className={`h-full transition-all ${bar}`} style={{ width: `${health}%` }} />
      </div>
    </div>
  );
}
