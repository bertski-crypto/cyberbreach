import { Award, Crown, Flame, Heart, Lock, Radar, Shield, Star, Zap } from "lucide-react";
import { ACHIEVEMENT_DEFS } from "../game/data/achievements";
import { useGameStore } from "../store/gameStore";
import type { AchievementCategory, AchievementRarity } from "../types/game";
import Panel from "../components/ui/Panel";

const ICONS: Record<string, typeof Award> = {
  shield: Shield,
  radar: Radar,
  flame: Flame,
  heart: Heart,
  zap: Zap,
  network: Radar,
  crown: Crown,
  star: Star,
};

const RARITY_STYLE: Record<AchievementRarity, string> = {
  COMMON: "border-slate-600/60",
  RARE: "border-cyan-400/40",
  EPIC: "border-violet-400/40",
  LEGENDARY: "border-amber-300/50",
};

const CATEGORIES: AchievementCategory[] = ["COMBAT", "DEFENSE", "SPEED", "ACCURACY", "CAMPAIGN", "MASTERY"];

export default function AchievementsPage() {
  const achievements = useGameStore((s) => s.achievements);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-4">
      <Panel title="Achievements" subtitle={`${unlocked} / ${ACHIEVEMENT_DEFS.length} unlocked — decorations for career-defining operations`}>
        {CATEGORIES.map((cat) => {
          const defs = ACHIEVEMENT_DEFS.filter((d) => d.category === cat);
          if (defs.length === 0) return null;
          return (
            <section key={cat} aria-label={`${cat} achievements`} className="mt-4 first:mt-0">
              <h3 className="mono text-[11px] font-bold tracking-widest text-slate-500">{cat}</h3>
              <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                {defs.map((d) => {
                  const state = achievements.find((a) => a.id === d.id);
                  const open = !!state?.unlocked;
                  const Icon = ICONS[d.icon] ?? Award;
                  return (
                    <li
                      key={d.id}
                      className={`flex items-start gap-3 rounded-lg border p-4 ${open ? `${RARITY_STYLE[d.rarity]} bg-slate-900/40` : "border-slate-800 opacity-60"}`}
                      aria-label={`${d.name}, ${open ? `unlocked, ${d.rarity}` : "locked"}`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${open ? RARITY_STYLE[d.rarity] : "border-slate-700"}`} aria-hidden="true">
                        {open ? <Icon className="h-5 w-5 text-amber-300" /> : <Lock className="h-5 w-5 text-slate-600" />}
                      </span>
                      <span>
                        <span className={`block text-sm font-bold ${open ? "text-slate-100" : "text-slate-400"}`}>
                          {d.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {open ? d.description : "Classified — complete operations to reveal."}
                        </span>
                        <span className="mono mt-1 block text-[11px] text-slate-500">
                          {d.rarity} · +{d.xpReward} XP
                          {open && state?.unlockedAt ? ` · ${new Date(state.unlockedAt).toLocaleDateString()}` : ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </Panel>
    </div>
  );
}
