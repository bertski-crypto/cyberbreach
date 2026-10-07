import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Pause, Play, RotateCcw, ShieldCheck, Swords, Trophy } from "lucide-react";
import { ratingLabel } from "../types/game";
import { useGameStore } from "../store/gameStore";
import { findMission } from "../store/gameStore";
import { levelTitle, networkHealth } from "../game/systems/xp";
import { isOpenIncident } from "../game/systems/threatEngine";
import { THREAT_META } from "../game/data/threats";
import { useMissionTimer } from "../hooks/useMissionTimer";
import { formatClock } from "../components/game/MissionTimer";
import NetworkMap from "../components/network/NetworkMap";
import IncidentCard from "../components/incidents/IncidentCard";
import MissionTimer from "../components/game/MissionTimer";
import NetworkHealth from "../components/game/NetworkHealth";
import MissionProgress from "../components/game/MissionProgress";
import CareerSnapshot from "../components/game/CareerSnapshot";
import HintCard from "../components/game/HintCard";
import AiDebriefPanel from "../components/game/AiDebriefPanel";
import DailyChallengeCard from "../components/game/DailyChallengeCard";
import MissionRanking from "../components/game/MissionRanking";
import CriticalBanner from "../components/game/CriticalBanner";
import GameLog from "../components/game/GameLog";
import DeviceDetails from "../components/game/DeviceDetails";
import PauseOverlay from "../components/game/PauseOverlay";
import Panel from "../components/ui/Panel";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import StatCard from "../components/ui/StatCard";
import { priorityOf } from "../game/systems/threatEngine";

export default function OverviewPage() {
  const s = useGameStore();
  const navigate = useNavigate();
  useMissionTimer(true);

  const mission = findMission(s, s.activeMissionId) ?? null;
  const active = s.incidents
    .filter(isOpenIncident)
    .sort((a, b) => priorityOf(a) - priorityOf(b) || a.createdAt - b.createdAt);
  const attackTargetIds = active
    .filter((i) => i.severity === "HIGH" || i.severity === "CRITICAL")
    .map((i) => i.targetDeviceId);
  const avg = s.responsesCount === 0 ? 0 : s.totalResponseTimeSec / s.responsesCount;
  const accuracy =
    s.threatsNeutralized + s.incorrectDecisions === 0
      ? 100
      : Math.round((s.threatsNeutralized / (s.threatsNeutralized + s.incorrectDecisions)) * 100);
  const health = networkHealth(s.devices.map((d) => d.health));

  // ---- BRIEFING ----
  if (s.gameStatus === "BRIEFING" && mission) {
    const topSeverity = mission.incidentIds.length > 1 ? "HIGH" : "ELEVATED";
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl">
        <Panel title={`${mission.code} — mission briefing`} subtitle={`${mission.mode} · Difficulty ${mission.difficulty}/5 · +${mission.xpReward} XP`}>
          <h1 className="text-2xl font-bold text-white">{mission.title}</h1>
          {mission.aiBriefing && (
            <div className="mt-3 rounded-md border border-violet-400/30 bg-violet-400/5 p-3" aria-label="AI Director briefing">
              <p className="mono text-[11px] font-bold tracking-widest text-violet-300">◈ AI GAME DIRECTOR — ADAPTIVE SCENARIO READY ({mission.aiBriefing.provider})</p>
              <p className="mt-1 text-sm text-slate-200">
                Difficulty {mission.difficulty}/5 ({mission.aiBriefing.difficultyName}) · Training focus: {mission.aiBriefing.focus}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{mission.aiBriefing.why}</p>
            </div>
          )}
          <p className="mt-2 leading-relaxed text-slate-300">{mission.briefing}</p>
          <div className="mt-3 rounded-md border border-cyan-400/30 bg-cyan-400/5 p-3 text-sm text-cyan-100">
            <p className="font-semibold">Your objective:</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              {mission.objectives.slice(0, 4).map((o) => (
                <li key={o.id}>{o.label}</li>
              ))}
            </ol>
          </div>
          <dl className="mono mt-3 grid grid-cols-1 gap-1 text-xs text-slate-400 sm:grid-cols-3">
            <div><dt className="inline text-slate-500">THREAT LEVEL: </dt><dd className="inline text-slate-200">{topSeverity}</dd></div>
            <div><dt className="inline text-slate-500">DURATION: </dt><dd className="inline text-slate-200">{formatClock(mission.timeLimitSec)}</dd></div>
            <div><dt className="inline text-slate-500">THREATS: </dt><dd className="inline text-slate-200">{mission.threats.map((t) => THREAT_META[t].label).join(", ")}</dd></div>
          </dl>
          <div className="mt-2 space-y-2">
            {s.incidents.map((i) => (
              <div key={i.id} className="flex items-center gap-2 text-sm text-slate-300">
                <Badge value={i.severity} /> {i.title} → {i.targetHostname}
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <p className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-emerald-100">
              WIN: {mission.successCondition}
            </p>
            <p className="rounded border border-red-500/30 bg-red-500/5 p-2 text-red-100">
              FAIL: {mission.failureCondition}
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => s.resumeMission()} className="flex-1">
              <Play className="h-4 w-4" aria-hidden="true" /> Start mission
            </Button>
            <Button variant="ghost" onClick={() => { s.resetWorld(); navigate("/soc/missions"); }}>
              Back to missions
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">The timer starts when you press Start mission.</p>
        </Panel>
      </motion.div>
    );
  }

  // ---- RESULT ----
  if ((s.gameStatus === "MISSION_COMPLETE" || s.gameStatus === "MISSION_FAILED") && s.lastResult) {
    const r = s.lastResult;
    const best = s.bests[r.missionId];
    const order = ["m1", "m2", "m3", "m4", "m5"];
    const nextId = order[order.indexOf(r.missionId) + 1];
    const next = s.missions.find((m) => m.id === nextId);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-3xl space-y-4">
        <Panel
          title={r.success ? "Mission complete — threat contained" : "Mission failed — network breached"}
          subtitle={`Security rating ${ratingLabel(r.securityRating)} · ${new Date(r.completedAt).toLocaleTimeString()}`}
        >
          <p className="text-center font-mono text-sm tracking-widest text-slate-400 uppercase">
            Rating: <span className="text-2xl font-black text-cyan-300">{ratingLabel(r.securityRating)}</span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Final score", r.score.toLocaleString()],
              ["Network health", `${r.networkHealthPct}%`],
              ["Network damage", `${r.networkDamagePct}%`],
              ["Threats stopped", String(r.threatsNeutralized)],
              ["Incorrect actions", String(r.incorrectDecisions)],
              ["Avg response", `${r.avgResponseTimeSec}s (${r.responseTier})`],
              ["Objectives", `${r.objectivesDone}/${r.objectivesTotal}`],
              ["Escalations", String(r.escalations)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-slate-800 bg-slate-900/50 p-3 text-center">
                <p className="text-[11px] tracking-widest text-slate-500 uppercase">{k}</p>
                <p className="mono mt-1 text-lg font-bold text-slate-100">{v}</p>
              </div>
            ))}
          </div>
          {best && (
            <p className="mono mt-3 rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-center text-xs text-slate-300" aria-label="Personal best for this mission">
              PERSONAL BEST ▸ {best.score.toLocaleString()} pts · {ratingLabel(best.rating)} · {best.responseSec}s response · {best.health}% health
            </p>
          )}
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4" aria-label="XP breakdown">
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">XP earned · +{r.xpEarned}</p>
              <ul className="mono mt-2 space-y-1 text-xs text-slate-300">
                {r.xpBreakdown.length === 0 && <li className="text-slate-500">No XP earned.</li>}
                {r.xpBreakdown.map((x) => (
                  <li key={x.label} className="flex justify-between gap-2">
                    <span>{x.label}</span>
                    <span className="text-emerald-300">+{x.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4" aria-label="Skill progress">
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Skill progress</p>
              <ul className="mono mt-2 space-y-1 text-xs text-slate-300">
                {Object.keys(r.skillGains).length === 0 && <li className="text-slate-500">No skill gains.</li>}
                {Object.entries(r.skillGains).map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-2">
                    <span>{k}</span>
                    <span className="text-cyan-300">+{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4" aria-label="Achievements earned">
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Achievements</p>
              {r.achievementsEarned.length === 0 ? (
                <p className="mono mt-2 text-xs text-slate-500">None this operation.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-xs text-amber-200">
                  {r.achievementsEarned.map((id) => (
                    <li key={id}>◈ {id}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {!r.success && (
            <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200" role="alert">
              The incident was not contained. Network health: {r.networkHealthPct}% · Threat level: {s.threatLevel}.
              Only mission state resets — campaigns progress and bests are kept.
            </p>
          )}
          <div className="mt-4 rounded-md border border-slate-800 bg-slate-900/50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> AI security debrief (offline analysis)
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{r.debrief}</p>
          </div>
          <AiDebriefPanel />
          <MissionRanking missionId={r.missionId} yourScore={r.score} />
          <div className="mt-4 flex flex-wrap gap-2">
            {r.success && next && !next.locked && (
              <Button
                onClick={() => {
                  s.resetWorld();
                  s.startMission(next.id);
                  navigate("/soc");
                }}
                className="flex-1"
              >
                <Trophy className="h-4 w-4" aria-hidden="true" /> Next mission
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                if (mission) s.restartMission();
                else {
                  s.resetWorld();
                  navigate("/soc/missions");
                }
              }}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Replay
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                s.resetWorld();
                navigate("/soc/missions");
              }}
              className="flex-1"
            >
              Mission select
            </Button>
          </div>
        </Panel>
        <Panel title="Mission event log" subtitle="Full audit trail of this attempt">
          <GameLog />
        </Panel>
      </motion.div>
    );
  }

  // ---- LIVE / IDLE ----
  return (
    <div className="space-y-4">
      {s.gameStatus === "PAUSED" && <PauseOverlay />}
      <CriticalBanner />
      {!s.activeMissionId && s.gameStatus === "MENU" && <CareerSnapshot />}
      {!s.activeMissionId && s.gameStatus === "MENU" && <DailyChallengeCard />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Analyst" value={`Lv.${s.level}`} sub={levelTitle(s.level)} icon={<ShieldCheck className="h-4 w-4 text-cyan-400" />} />
        <StatCard label="Score" value={s.score.toLocaleString()} sub={`${s.threatsNeutralized} threats neutralized`} icon={<Swords className="h-4 w-4 text-cyan-400" />} />
        <StatCard label="Accuracy" value={`${accuracy}%`} sub={`avg response ${avg.toFixed(1)}s`} icon={<Activity className="h-4 w-4 text-cyan-400" />} />
        <StatCard label="Reputation" value={`${s.reputation}`} sub={`${s.completedMissionIds.length}/5 missions complete`} icon={<Trophy className="h-4 w-4 text-cyan-400" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          title="Network visualization"
          subtitle={mission ? `${mission.code} · ${mission.title}` : "No active operation — start a mission to go live"}
          action={
            s.gameStatus === "PLAYING" ? (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => s.pauseMission()} aria-label="Pause mission">
                  <Pause className="h-4 w-4" aria-hidden="true" /> Pause
                </Button>
                <Button variant="danger" onClick={() => s.failMission("Operation aborted by analyst.")}>
                  Abort
                </Button>
              </div>
            ) : s.gameStatus === "MENU" ? (
              <Link to="/soc/missions" className="inline-flex min-h-[44px] items-center rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
                <Play className="h-4 w-4" aria-hidden="true" /> Start mission
              </Link>
            ) : undefined
          }
        >
          {s.activeMissionId && (
            <div className="mb-3 flex flex-wrap gap-x-8 gap-y-3 rounded-md border border-slate-800 bg-slate-900/50 p-3">
              <MissionTimer />
              <NetworkHealth />
              <div className="min-w-40 flex-1">
                <p className="mb-1 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">Mission objectives</p>
                <MissionProgress />
              </div>
            </div>
          )}
          <NetworkMap
            devices={s.devices}
            selectedId={s.selectedDeviceId}
            onSelect={(id) => s.selectDevice(id)}
            animated={s.gameStatus === "PLAYING"}
            attackTargetIds={attackTargetIds}
          />
          <div className="mt-3">
            <DeviceDetails />
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel
            title={`Active incidents (${active.length})`}
            subtitle="Sorted by priority — critical and escalating threats first"
            action={<Link to="/soc/incidents" className="text-xs text-cyan-300 hover:underline">Open console →</Link>}
          >
            {active.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
                <p className="font-semibold text-slate-300">Network quiet</p>
                <p className="mt-1">No active threats. Start a mission to begin defending.</p>
                <Link to="/soc/missions" className="mt-3 inline-flex min-h-[44px] items-center rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
                  Browse missions
                </Link>
              </div>
            ) : (
              <div className="soc-scroll max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {active.map((i) => (
                  <IncidentCard key={i.id} incident={i} />
                ))}
              </div>
            )}
          </Panel>
          {s.activeMissionId && (
            <Panel title="Event log" subtitle="Live audit trail">
              <GameLog />
            </Panel>
          )}
          {s.activeMissionId && <HintCard />}
        </div>
      </div>

      {s.activeMissionId && (
        <p className="mono text-center text-[11px] text-slate-500" aria-label={`Network health ${health} percent`}>
          NET HEALTH {health}% · THREAT {s.threatLevel} · DEMO MODE — all traffic simulated
        </p>
      )}
    </div>
  );
}
