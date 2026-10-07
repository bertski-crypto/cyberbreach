import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  Award,
  BrainCircuit,
  Flame,
  LayoutDashboard,
  ListOrdered,
  Network,
  Radar,
  ScrollText,
  Shield,
  Trophy,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { isOpenIncident } from "../../game/systems/threatEngine";
import { directorStatus } from "../../game/ai/gameDirector";
import { levelProgress, levelTitle, xpForLevel } from "../../game/systems/xp";
import Badge from "../ui/Badge";
import SyncStatus from "../game/SyncStatus";

const NAV = [
  { to: "/soc", label: "Overview", icon: LayoutDashboard },
  { to: "/soc/network", label: "Network", icon: Network },
  { to: "/soc/incidents", label: "Incidents", icon: Flame },
  { to: "/soc/firewall", label: "Firewall", icon: Shield },
  { to: "/soc/missions", label: "Missions", icon: ScrollText },
  { to: "/soc/ai", label: "AI Director", icon: BrainCircuit },
  { to: "/soc/leaderboard", label: "Rankings", icon: Trophy },
  { to: "/soc/achievements", label: "Medals", icon: Award },
  { to: "/soc/analytics", label: "Analytics", icon: Activity },
  { to: "/soc/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/soc/profile", label: "Profile", icon: User },
];

export function TopBar() {
  const { threatLevel, level, xp, username, score, soundOn, toggleSound, activeMissionId, gameStatus } =
    useGameStore();
  const progress = levelProgress(xp);
  const intoLevel = xp - Math.floor(progress * 0); // total xp shown; bar shows intra-level
  void intoLevel;
  const span = xpForLevel(level);
  const pct = Math.round(progress * 100);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Link to="/" className="flex items-center gap-2" aria-label="CYBER BREACH home">
          <Radar className="h-5 w-5 text-cyan-400" aria-hidden="true" />
          <span className="font-mono text-sm font-bold tracking-widest text-slate-100">
            CYBER<span className="text-cyan-400">//</span>BREACH
          </span>
        </Link>
        <span className="hidden items-center gap-2 sm:inline-flex">
          <span className="text-[11px] tracking-widest text-slate-400 uppercase">Threat</span>
          <Badge value={threatLevel} />
        </span>
        <SyncStatus />
        <AiStatusDot />
        <div className="ml-auto flex items-center gap-3">
          {activeMissionId && (
            <span className="mono hidden text-[11px] text-slate-400 md:inline">
              {gameStatus === "PLAYING" ? "● LIVE" : gameStatus}
            </span>
          )}
          <div className="hidden text-right sm:block" title={`${username} — ${levelTitle(level)}`}>
            <p className="font-mono text-xs font-bold text-slate-100">
              Lv.{level} {username}
            </p>
            <div
              className="mt-1 h-1.5 w-36 overflow-hidden rounded bg-slate-800"
              role="progressbar"
              aria-label={`Level progress ${pct} percent, ${span} XP per level`}
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full bg-cyan-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="mono hidden text-xs text-slate-300 lg:inline">{score.toLocaleString()} pts</span>
          <button
            onClick={toggleSound}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-300 hover:bg-slate-800"
            aria-label={soundOn ? "Mute sounds" : "Unmute sounds"}
            title={soundOn ? "Mute sounds" : "Unmute sounds"}
          >
            {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}

export function Sidebar() {
  const incidents = useGameStore((s) => s.incidents);
  const open = incidents.filter(isOpenIncident).length;
  const navigate = useNavigate();
  void navigate;

  return (
    <>
      {/* Desktop sidebar */}
      <nav aria-label="SOC sections" className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-slate-800 p-3 lg:flex">
        <p className="px-2 pt-1 pb-2 font-mono text-[11px] tracking-widest text-slate-500">
          SOC CONSOLE <span className="text-cyan-400">· DEMO</span>
        </p>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                isActive ? "bg-cyan-400/10 text-cyan-300" : "text-slate-300 hover:bg-slate-800/70"
              }`
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
            {label === "Incidents" && open > 0 && (
              <span className="mono ml-auto rounded bg-red-500/20 px-1.5 py-0.5 text-[11px] font-bold text-red-300" aria-label={`${open} active incidents`}>
                {open}
              </span>
            )}
          </NavLink>
        ))}
        <div className="mt-auto rounded-md border border-slate-800 p-3 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Analyst tip</p>
          <p className="mt-1 leading-relaxed">
            Isolate endpoints. Block floods at the firewall. Investigate recon.
          </p>
          <NavLink to="/soc/missions" className="mt-2 inline-block text-cyan-300 hover:underline">
            Open missions →
          </NavLink>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav aria-label="SOC sections mobile" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 gap-1 border-t border-slate-800 bg-slate-950/95 p-2 backdrop-blur lg:hidden">
        {[
          { to: "/soc", label: "Home", icon: LayoutDashboard },
          { to: "/soc/network", label: "Net", icon: Network },
          { to: "/soc/incidents", label: "Alerts", icon: Flame },
          { to: "/soc/missions", label: "Ops", icon: ScrollText },
          { to: "/soc/achievements", label: "Medals", icon: Award },
          { to: "/soc/profile", label: "Me", icon: User },
        ].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-md text-[11px] ${
                isActive ? "text-cyan-300" : "text-slate-400"
              }`
            }
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
            {label === "Alerts" && open > 0 && (
              <span className="mono rounded bg-red-500/20 px-1 text-[10px] font-bold text-red-300">{open} active</span>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export function ListOrderedIcon() {
  return <ListOrdered className="h-4 w-4" aria-hidden="true" />;
}

export function AiStatusDot() {
  const status = directorStatus();
  const online = status === "ONLINE";
  return (
    <Link
      to="/soc/ai"
      className="mono hidden items-center gap-1.5 rounded border border-slate-800 px-2 py-1 text-[11px] tracking-widest md:inline-flex"
      title={online ? "AI Director online (external) — open the AI panel" : "AI Director offline mode (deterministic) — open the AI panel"}
      aria-label={online ? "AI Director online" : "AI Director offline mode"}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-1.5 w-1.5 rounded-full ${online ? "animate-pulse bg-cyan-300" : "bg-amber-300"}`}
      />
      <span className={online ? "text-cyan-300" : "text-amber-300"}>
        {online ? "AI ONLINE" : "AI OFFLINE"}
      </span>
    </Link>
  );
}
