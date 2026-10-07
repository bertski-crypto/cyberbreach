import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Lock, Play, Star } from "lucide-react";
import type { Mission, PersonalBest } from "../../types/game";
import { ratingLabel } from "../../types/game";
import { THREAT_META } from "../../game/data/threats";
import Button from "../ui/Button";

function duration(sec: number): string {
  return `~${Math.round(sec / 60)} min`;
}

export default function MissionCard({
  mission,
  completed,
  best,
  lockReasons,
  onStart,
}: {
  mission: Mission;
  completed: boolean;
  best?: PersonalBest;
  lockReasons: string[];
  onStart: (id: string) => void;
}) {
  const status = mission.locked ? "LOCKED" : completed ? "COMPLETED" : "AVAILABLE";
  return (
    <article
      aria-label={`${mission.code}: ${mission.title}, status ${status}`}
      className={`glass-panel flex flex-col rounded-lg p-5 ${mission.locked ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="mono text-[11px] tracking-widest text-cyan-300">{mission.code}</p>
        {completed ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> COMPLETED
          </span>
        ) : mission.locked ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Lock className="h-4 w-4" aria-hidden="true" /> LOCKED
          </span>
        ) : (
          <span className="rounded bg-cyan-400/10 px-1.5 py-0.5 text-[11px] font-bold text-cyan-300">AVAILABLE</span>
        )}
      </div>
      <h3 className="mt-1 text-lg font-bold text-slate-100">{mission.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-400">{mission.description}</p>
      <dl className="mt-3 space-y-1 text-xs text-slate-400">
        <div className="flex items-center gap-2" aria-label={`Difficulty ${mission.difficulty} of 5`}>
          <dt className="w-16 shrink-0 text-slate-500">DIFFICULTY</dt>
          <dd className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${i < mission.difficulty ? "fill-amber-300 text-amber-300" : "text-slate-600"}`}
                aria-hidden="true"
              />
            ))}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-slate-500">THREAT</dt>
          <dd className="text-slate-300">{mission.threats.map((t) => THREAT_META[t].label).join(" · ")}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-slate-500">DURATION</dt>
          <dd className="inline-flex items-center gap-1 text-slate-300">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {duration(mission.timeLimitSec)}
          </dd>
        </div>
      </dl>
      <p className="mono mt-2 text-xs text-slate-300">+{mission.xpReward} XP</p>
      {best && (
        <p className="mono mt-1 rounded border border-slate-800 bg-slate-900/50 px-2 py-1 text-[11px] text-slate-400" aria-label={`Personal best, score ${best.score}, rating ${ratingLabel(best.rating)}`}>
          PERSONAL BEST ▸ {best.score.toLocaleString()} pts · {ratingLabel(best.rating)} · {best.responseSec}s
        </p>
      )}
      <div className="mt-4 flex gap-2">
        {mission.locked ? (
          <div>
            <Button variant="ghost" disabled className="w-full" title={lockReasons.join("; ") || "Locked"}>
              <Lock className="h-4 w-4" aria-hidden="true" /> Mission locked
            </Button>
            {lockReasons.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-slate-400" aria-label="Unlock requirements">
                {lockReasons.map((req) => (
                  <li key={req}>• Requires: {req}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <Button variant="primary" className="flex-1" onClick={() => onStart(mission.id)}>
            <Play className="h-4 w-4" aria-hidden="true" /> {completed ? "Replay mission" : "Start mission"}
          </Button>
        )}
      </div>
      {!mission.locked && (
        <Link to="/soc" className="mt-2 text-center text-xs text-slate-500 hover:text-cyan-300">
          Objective: {mission.objective}
        </Link>
      )}
    </article>
  );
}
