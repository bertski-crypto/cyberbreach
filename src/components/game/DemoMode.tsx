import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

/**
 * Demo mode — instant employer experience.
 * Starts a curated mission without registration. Clearly labeled DEMO MODE.
 * Never touches the global leaderboard or real account data.
 */
export default function DemoMode() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const startMission = useGameStore((s) => s.startMission);
  const [launched, setLaunched] = useState(false);

  useEffect(() => {
    if (params.get("demo") === "1" && !launched) {
      setLaunched(true);
      // Small delay so the landing page registers the intent
      const t = window.setTimeout(() => {
        startMission("m1");
        navigate("/soc", { replace: true });
      }, 100);
      return () => window.clearTimeout(t);
    }
  }, [params, launched, startMission, navigate]);

  if (!params.get("demo")) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label="Starting demo"
    >
      <div className="glass-panel w-full max-w-sm rounded-lg p-6 text-center">
        <p className="mono text-[11px] font-bold tracking-widest text-cyan-300">DEMO MODE</p>
        <h2 className="mt-2 text-xl font-bold text-white">Loading simulation…</h2>
        <p className="mt-1 text-sm text-slate-400">No registration required. Progress stays local.</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-slate-300">
          <Play className="h-4 w-4 animate-pulse text-cyan-400" aria-hidden="true" />
          <span className="mono text-xs">INITIALIZING MISSION 01</span>
        </div>
      </div>
    </motion.div>
  );
}
