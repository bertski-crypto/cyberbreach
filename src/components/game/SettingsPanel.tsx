import { useState } from "react";
import { Monitor, Volume2, VolumeX } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import Panel from "../ui/Panel";

/** Settings — sound, reduced motion, notifications. Persisted locally. */
export default function SettingsPanel() {
  const soundOn = useGameStore((s) => s.soundOn);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const [reducedMotion, setReducedMotion] = useState(() => {
    try {
      return localStorage.getItem("cb-reduced-motion") === "1";
    } catch {
      return false;
    }
  });
  const [notifications, setNotifications] = useState(() => {
    try {
      return localStorage.getItem("cb-notifications") !== "0";
    } catch {
      return true;
    }
  });

  const toggleMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    try {
      localStorage.setItem("cb-reduced-motion", next ? "1" : "0");
    } catch {
      /* private mode */
    }
  };

  const toggleNotifications = () => {
    const next = !notifications;
    setNotifications(next);
    try {
      localStorage.setItem("cb-notifications", next ? "1" : "0");
    } catch {
      /* private mode */
    }
  };

  return (
    <Panel title="Settings" subtitle="Local preferences — persisted on this device">
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/50 p-3">
          <div className="flex items-center gap-2">
            {soundOn ? <Volume2 className="h-4 w-4 text-cyan-300" aria-hidden="true" /> : <VolumeX className="h-4 w-4 text-slate-500" aria-hidden="true" />}
            <span className="text-sm text-slate-200">Sound effects</span>
          </div>
          <button
            onClick={toggleSound}
            role="switch"
            aria-checked={soundOn}
            aria-label="Toggle sound effects"
            className={`relative h-6 w-11 rounded-full transition-colors ${soundOn ? "bg-cyan-400" : "bg-slate-700"}`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${soundOn ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/50 p-3">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <span className="text-sm text-slate-200">Reduced motion</span>
          </div>
          <button
            onClick={toggleMotion}
            role="switch"
            aria-checked={reducedMotion}
            aria-label="Toggle reduced motion"
            className={`relative h-6 w-11 rounded-full transition-colors ${reducedMotion ? "bg-cyan-400" : "bg-slate-700"}`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${reducedMotion ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/50 p-3">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <span className="text-sm text-slate-200">Notifications</span>
          </div>
          <button
            onClick={toggleNotifications}
            role="switch"
            aria-checked={notifications}
            aria-label="Toggle notifications"
            className={`relative h-6 w-11 rounded-full transition-colors ${notifications ? "bg-cyan-400" : "bg-slate-700"}`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${notifications ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </div>
      </div>
    </Panel>
  );
}
