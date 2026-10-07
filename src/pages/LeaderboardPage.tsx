import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { leaderboardApi, type BoardCategory, type BoardRow } from "../services/api/onlineApi";
import { useAuthStore } from "../store/authStore";
import Panel from "../components/ui/Panel";

const CATEGORIES: Array<{ id: BoardCategory; label: string }> = [
  { id: "overall", label: "Overall" },
  { id: "career", label: "Career" },
  { id: "network_defender", label: "Network Defender" },
  { id: "rapid_response", label: "Rapid Response" },
  { id: "threat_hunter", label: "Threat Hunter" },
];

function Row({ row, highlight }: { row: BoardRow; highlight?: boolean }) {
  return (
    <tr className={`border-b border-slate-800/60 last:border-0 ${highlight ? "bg-cyan-400/5" : ""}`}>
      <td className="mono py-2.5 pr-3 font-bold text-slate-200">#{String(row.rank).padStart(2, "0")}</td>
      <td className="py-2.5 pr-3 font-semibold text-slate-100">
        {row.codename} {highlight && <span className="ml-1 rounded bg-cyan-400/15 px-1.5 py-0.5 text-[11px] text-cyan-300">YOU</span>}
      </td>
      <td className="mono py-2.5 pr-3 text-slate-300">LVL {row.level}</td>
      <td className="py-2.5 pr-3 text-slate-300">{row.bestRating}</td>
      <td className="mono py-2.5 pr-3 text-slate-100">{row.totalScore.toLocaleString()}</td>
      <td className="mono py-2.5 pr-3 text-slate-300">{row.missionsCompleted}</td>
      <td className="mono py-2.5 text-slate-300">{row.bestHealth}%</td>
    </tr>
  );
}

export default function LeaderboardPage() {
  const [category, setCategory] = useState<BoardCategory>("overall");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myRanks, setMyRanks] = useState<Record<string, { rank: number; total: number } | null> | null>(null);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    leaderboardApi
      .board(category, page, 20)
      .then((res) => {
        if (!live) return;
        setRows(res.rows);
        setTotal(res.total);
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : "Leaderboard unavailable.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [category, page]);

  useEffect(() => {
    if (status !== "auth") return;
    let live = true;
    leaderboardApi
      .me()
      .then((r) => {
        if (live) setMyRanks(r);
      })
      .catch(() => {
        /* ranks are best-effort */
      });
    return () => {
      live = false;
    };
  }, [status]);

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const myRank = myRanks?.[category];

  return (
    <div className="space-y-4">
      <Panel
        title="Global cyber defense rankings"
        subtitle="Derived from validated server-side mission results — never client claims"
        action={
          myRank ? (
            <span className="mono text-xs text-cyan-300" aria-label={`Your rank ${myRank.rank} of ${myRank.total}`}>
              YOUR GLOBAL POSITION #{myRank.rank} / {myRank.total.toLocaleString()}
            </span>
          ) : (
            <Link to="/login" className="text-xs text-cyan-300 hover:underline">Sign in for your rank →</Link>
          )
        }
      >
        <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Leaderboard categories">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={category === c.id}
              onClick={() => {
                setCategory(c.id);
                setPage(1);
              }}
              className={`min-h-[44px] rounded-md px-3 py-2 text-xs font-semibold tracking-wide transition-colors ${
                category === c.id ? "bg-cyan-400/15 text-cyan-300" : "text-slate-400 hover:bg-slate-800"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mono animate-pulse py-6 text-center text-xs tracking-widest text-slate-400" role="status">
            LOADING GLOBAL RANKING…
          </p>
        ) : error ? (
          <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100" role="alert">
            <p className="font-semibold">ONLINE FEATURES UNAVAILABLE</p>
            <p className="mt-1">Local gameplay remains available. Your progress is being saved locally.</p>
            <p className="mt-1 text-xs text-amber-200/80">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
            <Trophy className="mx-auto h-6 w-6 text-slate-600" aria-hidden="true" />
            <p className="mt-2 font-semibold text-slate-300">No ranked operators yet</p>
            <p className="mt-1">Complete a mission to claim the first spot on the board.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] tracking-widest text-slate-500 uppercase">
                    <th className="py-2 pr-3">Rank</th>
                    <th className="py-2 pr-3">Operator</th>
                    <th className="py-2 pr-3">Level</th>
                    <th className="py-2 pr-3">Rating</th>
                    <th className="py-2 pr-3">Score</th>
                    <th className="py-2 pr-3">Missions</th>
                    <th className="py-2">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <Row key={r.codename} row={r} highlight={status === "auth" && myRank?.rank === r.rank} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="mono text-xs text-slate-500">
                {total.toLocaleString()} operators · page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="min-h-[44px] rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="min-h-[44px] rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                  aria-label="Next page"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>

      {status !== "auth" && (
        <p className="text-center text-xs text-slate-500">
          <Link to="/login" className="text-cyan-300 hover:underline">Sign in</Link> to see your global position and compete on the board.
        </p>
      )}
    </div>
  );
}
