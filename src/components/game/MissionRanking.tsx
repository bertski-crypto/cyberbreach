import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { leaderboardApi, type MissionBoardRow } from "../../services/api/onlineApi";
import { useAuthStore } from "../../store/authStore";

/** Mission ranking block for the result screen — server-derived, paginated. */
export default function MissionRanking({ missionId, yourScore }: { missionId: string; yourScore: number }) {
  const status = useAuthStore((s) => s.status);
  const [rows, setRows] = useState<MissionBoardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    leaderboardApi
      .mission(missionId, 1, 5)
      .then((r) => {
        if (!live) return;
        setRows(r.rows);
        setTotal(r.total);
      })
      .catch(() => {
        if (live) setError(true);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [missionId]);

  if (loading) {
    return (
      <p className="mono animate-pulse text-xs tracking-widest text-slate-400" role="status">
        LOADING MISSION RANKING…
      </p>
    );
  }
  if (error || rows.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        {error ? "Ranking unavailable — local progress is safe." : "No ranked attempts yet — be the first."}
      </p>
    );
  }

  const top = rows[0];
  const yourRank = rows.findIndex((r) => r.score <= yourScore) + 1 || rows.length + 1;
  const percentile = total > 10 ? Math.max(1, Math.round((yourRank / total) * 100)) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-md border border-slate-800 bg-slate-900/50 p-4"
      aria-label="Mission ranking"
    >
      <p className="mono flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-cyan-300">
        <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> MISSION RANKING
      </p>
      <dl className="mono mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300">
        <div><dt className="text-slate-500">YOUR SCORE</dt><dd className="text-sm font-bold text-slate-100">{yourScore.toLocaleString()}</dd></div>
        <div><dt className="text-slate-500">GLOBAL RANK</dt><dd className="text-sm font-bold text-cyan-300">#{yourRank}</dd></div>
        <div><dt className="text-slate-500">TOP SCORE</dt><dd className="text-slate-100">{top.score.toLocaleString()}</dd></div>
        <div>
          <dt className="text-slate-500">PERCENTILE</dt>
          <dd className="text-slate-100">{percentile ? `TOP ${percentile}%` : "—"}</dd>
        </div>
      </dl>
      <ol className="mt-2 space-y-1">
        {rows.slice(0, 3).map((r) => (
          <li key={r.codename} className="mono flex items-center justify-between text-xs text-slate-400">
            <span>#{r.rank} {r.codename}</span>
            <span>{r.score.toLocaleString()}</span>
          </li>
        ))}
      </ol>
      {status !== "auth" && <p className="mt-2 text-[11px] text-slate-500">Sign in to be ranked.</p>}
    </motion.div>
  );
}
