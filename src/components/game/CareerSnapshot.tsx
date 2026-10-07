import { Link } from "react-router-dom";
import { Award } from "lucide-react";
import { ACHIEVEMENT_DEFS } from "../../game/data/achievements";
import { rankForLevel } from "../../game/systems/progression";
import { SKILL_DEFS } from "../../game/systems/progression";
import { levelProgress } from "../../game/systems/xp";
import { useGameStore } from "../../store/gameStore";
import Panel from "../ui/Panel";

/** Career at a glance on the idle SOC overview — rank, XP, campaign, skills. */
export default function CareerSnapshot() {
  const level = useGameStore((s) => s.level);
  const xp = useGameStore((s) => s.xp);
  const completed = useGameStore((s) => s.completedMissionIds);
  const achievements = useGameStore((s) => s.achievements);
  const skills = useGameStore((s) => s.skills);

  const rank = rankForLevel(level);
  const pct = Math.round(levelProgress(xp) * 100);
  const recent = [...achievements].reverse().find((a) => a.unlocked);
  const recentDef = ACHIEVEMENT_DEFS.find((d) => d.id === recent?.id);
  const topSkills = [...SKILL_DEFS].sort((a, b) => skills[b.key] - skills[a.key]).slice(0, 2);

  return (
    <Panel
      title="Operator career"
      subtitle="Training record — Junior Analyst to Cyber Defense Commander"
      action={<Link to="/soc/profile" className="text-xs text-cyan-300 hover:underline">Full profile →</Link>}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <p className="mono text-[11px] tracking-widest text-slate-500">RANK</p>
          <p className="mono mt-1 text-lg font-black text-white">LV.{level}</p>
          <p className="text-sm font-semibold text-cyan-300">{rank.name}</p>
        </div>
        <div>
          <p className="mono text-[11px] tracking-widest text-slate-500">XP PROGRESS</p>
          <p className="mono mt-1 text-sm text-slate-200">{xp.toLocaleString()} XP</p>
          <div className="mt-1 h-2 overflow-hidden rounded bg-slate-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="XP progress">
            <div className="h-full bg-cyan-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div>
          <p className="mono text-[11px] tracking-widest text-slate-500">CAMPAIGN</p>
          <p className="mono mt-1 text-lg font-black text-white">{completed.length} / 5</p>
          <p className="text-xs text-slate-400">missions complete</p>
        </div>
        <div>
          <p className="mono text-[11px] tracking-widest text-slate-500">RECENT DECORATION</p>
          {recentDef ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-200">
              <Award className="h-4 w-4 text-amber-300" aria-hidden="true" /> ◈ {recentDef.name}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No decorations yet — complete a mission.</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Top skills: {topSkills.map((t) => `${t.label} ${skills[t.key]}`).join(" · ")}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <Link to="/soc/ai" className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-violet-400/40 px-4 py-2 text-sm text-violet-200 hover:bg-violet-400/10">
          ◈ Open AI Game Director
        </Link>
      </div>
    </Panel>
  );
}
