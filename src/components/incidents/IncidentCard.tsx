import { useEffect, useState } from "react";
import { Clock, Search, Ban, ShieldX, Zap, ShieldPlus, Power, EyeOff, FileSearch } from "lucide-react";
import type { Incident, IncidentActionKind } from "../../types/game";
import { THREAT_META } from "../../game/data/threats";
import { isOpenIncident, priorityLabel, priorityOf } from "../../game/systems/threatEngine";
import { actionLabel, useGameStore } from "../../store/gameStore";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

const ACTION_ICON: Record<IncidentActionKind, typeof Ban> = {
  ISOLATE_DEVICE: Power,
  BLOCK_TRAFFIC: Ban,
  BLOCK_SOURCE: ShieldX,
  INVESTIGATE: Search,
  IGNORE: EyeOff,
  RESTART_DEVICE: Zap,
  ADD_FIREWALL_RULE: ShieldPlus,
};

function useCountdown(incident: Incident): number | null {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!incident.expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [incident.expiresAt]);
  if (!incident.expiresAt) return null;
  return Math.max(0, Math.round((incident.expiresAt - now) / 1000));
}

function InvestigationResult({ incident }: { incident: Incident }) {
  const meta = THREAT_META[incident.threatType];
  return (
    <div
      className="mt-3 rounded-md border border-cyan-400/30 bg-cyan-400/5 p-3"
      role="status"
      aria-label={`Investigation result for ${incident.title}`}
    >
      <p className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-cyan-300 uppercase">
        <FileSearch className="h-4 w-4" aria-hidden="true" /> Investigation result
      </p>
      <dl className="mono mt-2 grid grid-cols-1 gap-1 text-xs text-slate-300 sm:grid-cols-2">
        <div><dt className="inline text-slate-500">SOURCE IP: </dt><dd className="inline">{incident.sourceIp}</dd></div>
        <div><dt className="inline text-slate-500">GEOLOCATION: </dt><dd className="inline">Unknown / simulated</dd></div>
        {incident.attempts !== undefined && (
          <div><dt className="inline text-slate-500">ATTEMPTS: </dt><dd className="inline">{incident.attempts}</dd></div>
        )}
        <div><dt className="inline text-slate-500">TARGET: </dt><dd className="inline">{incident.targetHostname}</dd></div>
        <div className="sm:col-span-2"><dt className="inline text-slate-500">PATTERN: </dt><dd className="inline">{meta.pattern}</dd></div>
        <div><dt className="inline text-slate-500">THREAT ASSESSMENT: </dt><dd className="inline font-bold">{incident.severity}</dd></div>
      </dl>
      <p className="mt-2 text-xs leading-relaxed text-cyan-100">
        Recommendation: {incident.hint}
      </p>
    </div>
  );
}

export default function IncidentCard({ incident }: { incident: Incident }) {
  const respondToIncident = useGameStore((s) => s.respondToIncident);
  const investigatedIds = useGameStore((s) => s.investigatedIds);
  const [busy, setBusy] = useState(false);
  const left = useCountdown(incident);
  const investigated = investigatedIds.includes(incident.id);

  if (!isOpenIncident(incident)) {
    return (
      <article className="glass-panel rounded-lg border-l-4 border-slate-600 p-4 opacity-80" aria-label={`${incident.title} — ${incident.status}`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-200">{incident.title}</h3>
          <Badge value={incident.status} />
        </div>
        <p className="mt-1 text-xs text-slate-400">{incident.targetHostname} · handled</p>
      </article>
    );
  }

  const urgent = left !== null && left <= 15;

  return (
    <article
      aria-label={`Active incident: ${incident.title}, severity ${incident.severity}`}
      className={`glass-panel rounded-lg border-l-4 p-4 ${
        incident.severity === "CRITICAL" ? "border-red-500" : incident.severity === "HIGH" ? "border-orange-400" : "border-amber-300"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge value={incident.severity} />
        <span
          className="rounded bg-slate-700/60 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-200"
          title={`Priority ${priorityOf(incident)} of 4 — critical and escalating threats first`}
          aria-label={`Priority ${priorityOf(incident)} of 4`}
        >
          {priorityLabel(priorityOf(incident))}
        </span>
        {(incident.escalationLevel ?? 0) > 0 && (
          <span className="rounded bg-orange-500/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-orange-300" title="Escalation stage — rises while unresolved" aria-label={`Escalation level ${incident.escalationLevel}`}>
            ESC L{incident.escalationLevel}
          </span>
        )}
        <h3 className="text-sm font-bold tracking-wide text-slate-100 uppercase">{incident.title}</h3>
        {investigated && (
          <span className="rounded bg-cyan-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-cyan-300">
            ✓ Investigated
          </span>
        )}
        {left !== null && (
          <span
            className={`mono ml-auto inline-flex items-center gap-1 text-sm font-bold ${urgent ? "text-red-300" : "text-slate-300"}`}
            role="timer"
            aria-label={`${left} seconds remaining`}
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            00:{String(left).padStart(2, "0")}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm leading-relaxed text-slate-300">{incident.description}</p>

      <dl className="mono mt-3 grid grid-cols-1 gap-1 text-xs text-slate-400 sm:grid-cols-3">
        <div><dt className="inline text-slate-500">SOURCE: </dt><dd className="inline text-slate-300">{incident.source}</dd></div>
        <div><dt className="inline text-slate-500">TARGET: </dt><dd className="inline text-slate-300">{incident.targetHostname}</dd></div>
        {incident.attempts !== undefined && (
          <div><dt className="inline text-slate-500">ATTEMPTS: </dt><dd className="inline text-slate-300">{incident.attempts}</dd></div>
        )}
      </dl>

      {investigated && <InvestigationResult incident={incident} />}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {incident.recommendedActions.map((a) => {
          const Icon = ACTION_ICON[a] ?? Search;
          return (
            <Button
              key={a}
              variant={a === "IGNORE" ? "ghost" : a === "INVESTIGATE" ? "outline" : "primary"}
              disabled={busy}
              onClick={() => {
                setBusy(true);
                respondToIncident(incident.id, a);
                setTimeout(() => setBusy(false), 400);
              }}
              aria-label={`${actionLabel(a)} for ${incident.title}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {actionLabel(a)}
            </Button>
          );
        })}
      </div>
    </article>
  );
}
