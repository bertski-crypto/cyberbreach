import { useNavigate } from "react-router-dom";
import { Home, Play, RotateCcw } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import Button from "../ui/Button";

/** Pause overlay — timer and simulation halt while PLAYING is suspended. */
export default function PauseOverlay() {
  const resumeMission = useGameStore((s) => s.resumeMission);
  const restartMission = useGameStore((s) => s.restartMission);
  const resetWorld = useGameStore((s) => s.resetWorld);
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Mission paused"
    >
      <div className="glass-panel w-full max-w-sm rounded-lg p-6 text-center">
        <p className="mono text-[11px] tracking-widest text-slate-400">SIMULATION HELD</p>
        <h2 className="mt-1 text-2xl font-bold text-white">Paused</h2>
        <p className="mt-1 text-sm text-slate-400">Timer and attack simulation are stopped.</p>
        <div className="mt-5 space-y-2">
          <Button onClick={() => resumeMission()} className="w-full">
            <Play className="h-4 w-4" aria-hidden="true" /> Resume
          </Button>
          <Button variant="outline" onClick={() => restartMission()} className="w-full">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restart mission
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              resetWorld();
              navigate("/soc/missions");
            }}
            className="w-full"
          >
            <Home className="h-4 w-4" aria-hidden="true" /> Exit to SOC
          </Button>
        </div>
      </div>
    </div>
  );
}
