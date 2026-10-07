import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, Shield } from "lucide-react";
import { operatorsApi, type PublicOperator } from "../services/api/onlineApi";
import { rankForLevel } from "../game/systems/progression";
import Panel from "../components/ui/Panel";

/** Public operator dossier — non-sensitive fields only. */
export default function OperatorPage() {
  const { codename = "" } = useParams();
  const [op, setOp] = useState<PublicOperator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    operatorsApi
      .byCodename(codename)
      .then((o) => {
        if (live) setOp(o);
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : "Operator not found.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [codename]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <Panel title="Loading operator profile…" subtitle="Fetching public dossier">
          <div className="h-40 animate-pulse rounded-md bg-slate-800/60" role="status" aria-label="Loading operator profile" />
        </Panel>
      </div>
    );
  }

  if (error || !op) {
    return (
      <div className="mx-auto max-w-2xl">
        <Panel title="Operator not found" subtitle="This codename has no public profile.">
          <p className="text-sm text-slate-400">{error ?? "Unknown operator."}</p>
        </Panel>
      </div>
    );
  }

  const stats = op.statistics ?? {};
  const num = (k: string) => Number(stats[k] ?? 0);

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Panel title="Public operator profile" subtitle="Career dossier — non-sensitive data only">
          <div className="flex items-center gap-4">
            <div className="mono flex h-16 w-16 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-400/10 text-2xl font-black text-cyan-300" aria-hidden="true">
              {op.codename.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{op.codename}</h1>
              <p className="text-sm text-cyan-300">{rankForLevel(op.level).name}</p>
              <p className="mono text-xs text-slate-400">LEVEL {op.level} · {op.totalXp.toLocaleString()} XP · since {new Date(op.memberSince).toLocaleDateString()}</p>
            </div>
          </div>
        </Panel>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Career statistics" subtitle="Validated mission performance">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Missions played", num("missions_played")],
              ["Missions completed", num("missions_completed")],
              ["Threats detected", num("threats_detected")],
              ["Threats contained", num("threats_contained")],
              ["Total score", num("total_score").toLocaleString()],
              ["Best score", num("best_score").toLocaleString()],
              ["Best rating", String(stats.best_rating ?? "—")],
              ["Best health", `${num("best_network_health")}%`],
              ["Fastest response", stats.fastest_response_time ? `${Number(stats.fastest_response_time)}s` : "—"],
              ["Longest streak", num("longest_streak")],
            ].map(([k, v]) => (
              <div key={k} className="rounded border border-slate-800 bg-slate-900/50 p-2.5">
                <dt className="text-[11px] text-slate-500">{k}</dt>
                <dd className="mono mt-0.5 font-bold text-slate-100">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Skill profile" subtitle="Career-developed capabilities">
          <ul className="space-y-2.5">
            {op.skills
              ? (Object.entries(op.skills) as Array<[string, number]>).map(([k, v]) => (
                  <li key={k}>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{k.replace(/([A-Z])/g, " $1")}</span>
                      <span className="mono text-slate-400">{v}/100</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-800" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={`${k} ${v} of 100`}>
                      <div className="h-full bg-cyan-400/80" style={{ width: `${v}%` }} />
                    </div>
                  </li>
                ))
              : <p className="text-sm text-slate-500">No skill data yet.</p>}
          </ul>
        </Panel>
      </div>

      <Panel title={`Decorations (${op.achievements.length})`} subtitle="Unlocked achievements">
        {op.achievements.length === 0 ? (
          <p className="text-sm text-slate-500">No decorations unlocked yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {op.achievements.map((a) => (
              <li key={a.id} className="flex items-start gap-2 rounded-md border border-slate-800 bg-slate-900/50 p-3 text-sm">
                <Award className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-slate-100">{a.name}</p>
                  <p className="text-xs text-slate-400">{a.description}</p>
                  <p className="mono mt-1 text-[11px] text-slate-500">{a.rarity} · {new Date(a.unlocked_at).toLocaleDateString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Mission records" subtitle="Best validated results per mission">
        {op.missionRecords.length === 0 ? (
          <p className="text-sm text-slate-500">No mission records yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {op.missionRecords.map((r) => (
              <li key={r.mission_id} className="mono flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
                <span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />{r.mission_id.toUpperCase()}</span>
                <span>{r.score.toLocaleString()} pts · {r.health}% health · {r.response}s</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
