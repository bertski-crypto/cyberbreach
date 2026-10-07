import { useState } from "react";
import { Award, Pencil, RotateCcw } from "lucide-react";
import { ratingLabel } from "../types/game";
import { ACHIEVEMENT_DEFS } from "../game/data/achievements";
import { rankForLevel, SKILL_DEFS } from "../game/systems/progression";
import { levelProgress, xpToNext } from "../game/systems/xp";
import { useGameStore } from "../store/gameStore";
import Panel from "../components/ui/Panel";
import Button from "../components/ui/Button";
import AccountPanel from "../components/game/AccountPanel";
import SettingsPanel from "../components/game/SettingsPanel";

export default function ProfilePage() {
  const s = useGameStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(s.username);
  const [confirmReset, setConfirmReset] = useState(false);

  const rank = rankForLevel(s.level);
  const pct = Math.round(levelProgress(s.xp) * 100);
  const toNext = xpToNext(s.xp);
  const avg = s.responsesCount === 0 ? 0 : s.totalResponseTimeSec / s.responsesCount;
  const r = s.records;
  const unlockedCount = s.achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Identity + rank */}
        <Panel title="Operator file" subtitle="Codename is editable — career data is not">
          <div className="flex items-center gap-4">
            <div className="mono flex h-16 w-16 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-400/10 text-2xl font-black text-cyan-300" aria-hidden="true">
              {s.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    s.setUsername(name);
                    setEditing(false);
                  }}
                  className="flex gap-2"
                >
                  <label htmlFor="username" className="sr-only">Codename</label>
                  <input
                    id="username"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={24}
                    className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                  />
                  <Button type="submit">Save</Button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-xl font-bold text-white">{s.username}</h1>
                  <button onClick={() => { setName(s.username); setEditing(true); }} className="rounded p-2 text-slate-400 hover:bg-slate-800 hover:text-cyan-300" aria-label="Edit codename">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
              <p className="mt-1 text-sm text-cyan-300">{rank.name}</p>
              <p className="text-xs text-slate-500">“{rank.description}”</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400">
              <span>LEVEL {s.level}</span>
              <span>{toNext > 0 ? `${toNext.toLocaleString()} XP to Level ${s.level + 1}` : "MAX RANK"}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded bg-slate-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="XP progress to next level">
              <div className="h-full bg-cyan-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mono mt-1 text-right text-xs text-slate-400">{s.xp.toLocaleString()} XP lifetime</p>
          </div>
          <dl className="mono mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            {[
              ["SCORE", s.score.toLocaleString()],
              ["REP", `${s.reputation}`],
              ["THREATS", String(s.threatsNeutralized)],
            ].map(([k, v]) => (
              <div key={k} className="rounded border border-slate-800 bg-slate-900/50 p-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="mt-0.5 font-bold text-slate-100">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        {/* Personal records */}
        <Panel title="Personal records" subtitle="Career bests — never reset by replays">
          <dl className="space-y-2 text-sm">
            {[
              ["Best score", r.bestScoreOverall > 0 ? r.bestScoreOverall.toLocaleString() : "—"],
              ["Best mission rating", r.bestRating ? ratingLabel(r.bestRating) : "—"],
              ["Fastest critical response", r.fastestCriticalSec !== null ? `${r.fastestCriticalSec}s` : "—"],
              ["Highest network health", r.bestHealthPct > 0 ? `${r.bestHealthPct}%` : "—"],
              ["Most threats contained (mission)", r.mostContainedSingle > 0 ? String(r.mostContainedSingle) : "—"],
              ["Longest mission streak", r.longestStreak > 0 ? `${r.longestStreak} wins` : "—"],
              ["Missions completed", `${s.completedMissionIds.length} / 5`],
              ["Missions played", String(r.missionsPlayed)],
              ["Avg response (career)", `${avg.toFixed(1)}s`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-1.5 last:border-0">
                <dt className="text-slate-400">{k}</dt>
                <dd className="mono font-bold text-slate-100">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        {/* Achievements snapshot */}
        <Panel
          title="Decorations"
          subtitle={`${unlockedCount} / ${ACHIEVEMENT_DEFS.length} unlocked`}
          action={<a href="/soc/achievements" className="text-xs text-cyan-300 hover:underline">All →</a>}
        >
          <ul className="space-y-2">
            {ACHIEVEMENT_DEFS.map((d) => {
              const open = s.achievements.some((a) => a.id === d.id && a.unlocked);
              return (
                <li key={d.id} className="flex items-center gap-2 text-sm">
                  <Award className={`h-4 w-4 ${open ? "text-amber-300" : "text-slate-600"}`} aria-hidden="true" />
                  <span className={open ? "text-slate-100" : "text-slate-500"}>{d.name}</span>
                  <span className="mono ml-auto text-[11px] text-slate-500">{d.rarity} · +{d.xpReward}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      {/* Skills */}
      <Panel title="Cybersecurity skills" subtitle="Earned through live operations — investigation, containment, blocks, defense">
        <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          {SKILL_DEFS.map(({ key, label, description }) => {
            const v = s.skills[key];
            return (
              <li key={key} title={description}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-200">{label}</span>
                  <span className="mono text-slate-400">{v} / 100</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded bg-slate-800" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} ${v} of 100`}>
                  <div className="h-full bg-cyan-400/80 transition-all" style={{ width: `${v}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* Mission history */}
      <Panel title="Mission history" subtitle="Review previous performance — most recent first">
        {s.missionHistory.length === 0 ? (
          <p className="text-sm text-slate-500">No operations on record yet.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {s.missionHistory.map((m) => (
              <li key={m.completedAt} className="rounded-md border border-slate-800 bg-slate-900/50 p-3 text-sm">
                <p className="flex items-center justify-between">
                  <span className="mono font-bold text-slate-100">{m.missionId.toUpperCase()}</span>
                  <span className={`font-bold ${m.success ? "text-emerald-300" : "text-red-300"}`}>
                    {m.success ? "SUCCESS" : "FAILED"} · {ratingLabel(m.securityRating)}
                  </span>
                </p>
                <p className="mono mt-1 text-xs text-slate-400">
                  Score {m.score.toLocaleString()} · Health {m.networkHealthPct}% · {m.avgResponseTimeSec}s ({m.responseTier}) · Objectives {m.objectivesDone}/{m.objectivesTotal} · +{m.xpEarned} XP
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Cloud account */}
      <Panel title="Cloud account" subtitle="Guest by default — sign in to sync across devices">
        <AccountPanel />
      </Panel>

      {/* Settings */}
      <SettingsPanel />

      {/* Danger zone */}
      <Panel title="Settings" subtitle="Demo operations">
        {!confirmReset ? (
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset career progress
          </Button>
        ) : (
          <div role="alertdialog" aria-label="Confirm career reset" className="rounded-md border border-red-500/40 bg-red-500/5 p-4">
            <p className="font-bold text-red-200">RESET CAREER?</p>
            <p className="mt-1 text-sm text-slate-300">
              This will permanently reset: XP, level, skills, achievements, mission history, personal records, and campaign unlocks.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
              <Button
                variant="danger"
                onClick={() => {
                  s.resetCareer();
                  setConfirmReset(false);
                }}
              >
                Reset everything
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
