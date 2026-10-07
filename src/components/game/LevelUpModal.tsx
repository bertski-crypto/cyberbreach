import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { rankForLevel } from "../../game/systems/progression";
import { useGameStore } from "../../store/gameStore";
import Button from "../ui/Button";

/** SOC-style promotion sequence — dimmed HUD reveal, reduced-motion safe. */
export default function LevelUpModal() {
  const pending = useGameStore((s) => s.pendingLevelUp);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const dismissLevelUp = useGameStore((s) => s.dismissLevelUp);
  const missions = useGameStore((s) => s.missions);
  const [visible, setVisible] = useState(false);

  const reducible =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Never interrupt live play — reveal once the mission resolves.
  useEffect(() => {
    if (pending && gameStatus !== "PLAYING" && gameStatus !== "BRIEFING" && gameStatus !== "PAUSED") {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [pending, gameStatus]);

  const show = visible && pending;
  const rank = pending ? rankForLevel(pending.to) : null;
  const newlyUnlocked = missions.filter((m) => !m.locked).length;

  return (
    <AnimatePresence>
      {show && rank && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Promotion to level ${pending.to}, ${rank.name}`}
          initial={reducible ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass-panel w-full max-w-md rounded-lg border-cyan-400/30 p-6 text-center"
            initial={reducible ? {} : { scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
          >
            <p className="mono text-[11px] tracking-[0.3em] text-slate-400">SYSTEM STATUS</p>
            <p className="mono mt-1 text-xs font-bold tracking-widest text-cyan-300">
              OPERATOR PROMOTION DETECTED
            </p>
            <div className="my-4 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" aria-hidden="true" />
            <p className="mono text-sm text-slate-400">
              LEVEL {String(pending.from).padStart(2, "0")} →{" "}
              <span className="text-2xl font-black text-white">{String(pending.to).padStart(2, "0")}</span>
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-wide text-cyan-300 uppercase">{rank.name}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
              “{rank.description}”
            </p>
            <dl className="mono mt-4 space-y-1 text-xs text-slate-300">
              <div><dt className="inline text-slate-500">ACCESS LEVEL </dt><dd className="inline text-emerald-300">INCREASED</dd></div>
              <div><dt className="inline text-slate-500">CAMPAIGN ACCESS </dt><dd className="inline">{newlyUnlocked}/5 missions</dd></div>
            </dl>
            <Button onClick={dismissLevelUp} className="mt-5 w-full" aria-label="Acknowledge promotion and continue">
              Continue duty
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
