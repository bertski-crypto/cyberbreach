import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award } from "lucide-react";
import { ACHIEVEMENT_DEFS } from "../../game/data/achievements";
import { useGameStore } from "../../store/gameStore";

const RARITY_STYLE: Record<string, string> = {
  COMMON: "border-slate-500/40",
  RARE: "border-cyan-400/50",
  EPIC: "border-violet-400/50",
  LEGENDARY: "border-amber-300/60",
};

/** Slide-in unlock notification — complements the notice bar, never blocks play. */
export default function AchievementToast() {
  const last = useGameStore((s) => s.lastAchievement);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!last) {
      setShown(false);
      return;
    }
    setShown(true);
    const id = window.setTimeout(() => setShown(false), 7000);
    return () => window.clearTimeout(id);
  }, [last]);

  const def = ACHIEVEMENT_DEFS.find((d) => d.id === last?.id);
  if (!def) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-20 z-40 lg:bottom-6" aria-live="polite">
      <AnimatePresence>
        {shown && (
          <motion.div
            role="status"
            aria-label={`Achievement unlocked: ${def.name}, plus ${def.xpReward} XP`}
            className={`glass-panel pointer-events-auto w-72 rounded-lg border p-4 ${RARITY_STYLE[def.rarity]}`}
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          >
            <p className="mono flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-amber-300">
              <Award className="h-4 w-4" aria-hidden="true" /> ◈ ACHIEVEMENT UNLOCKED
            </p>
            <p className="mt-1 font-bold text-slate-100">{def.name}</p>
            <p className="mt-0.5 text-xs text-slate-400">{def.description}</p>
            <p className="mono mt-1 text-xs font-bold text-emerald-300">+{def.xpReward} XP · {def.rarity}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
