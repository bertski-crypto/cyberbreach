import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { isOpenIncident } from "../../game/systems/threatEngine";

/**
 * Prominent, dismissible banner for live CRITICAL incidents.
 * Dismissal is keyed to the incident set — new criticals re-alert.
 */
export default function CriticalBanner() {
  const incidents = useGameStore((s) => s.incidents);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const [dismissedKey, setDismissedKey] = useState("");

  if (gameStatus !== "PLAYING") return null;
  const crits = incidents.filter((i) => isOpenIncident(i) && i.severity === "CRITICAL");
  if (crits.length === 0) return null;
  const key = crits.map((i) => i.id).join(",");
  if (dismissedKey === key) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      aria-label={`Critical incident: ${crits.map((c) => c.title).join("; ")}`}
      className="flex items-start justify-between gap-3 rounded-md border border-red-500/50 bg-red-500/10 px-4 py-3"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-red-300" aria-hidden="true" />
        <div>
          <p className="font-mono text-xs font-bold tracking-widest text-red-200">
            ⚠ CRITICAL INCIDENT{crits.length > 1 ? `S (${crits.length})` : ""}
          </p>
          {crits.map((c) => (
            <p key={c.id} className="mt-0.5 text-sm text-red-100">
              {c.title} on {c.targetHostname} — immediate triage required.
            </p>
          ))}
        </div>
      </div>
      <button
        onClick={() => setDismissedKey(key)}
        className="min-h-[44px] shrink-0 rounded px-3 py-1 text-sm text-red-200 hover:bg-red-500/20"
        aria-label="Dismiss critical alert banner"
      >
        Dismiss
      </button>
    </motion.div>
  );
}
