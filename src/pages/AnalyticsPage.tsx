import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, BrainCircuit, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { playerApi } from "../services/api/playerApi";
import { useGameStore } from "../store/gameStore";
import { rankForLevel } from "../game/systems/progression";
import Panel from "../components/ui/Panel";

interface HistoryItem {
  mission_id: string;
  score: number;
  rating: string;
  network_health: number;
  response_time: number;
  xp_earned: number;
  completed: boolean;
  created_at: string;
}

const RANKS = ["Junior Analyst", "Security Analyst", "Network Defender", "Incident Responder", "Security Specialist", "SOC Specialist", "Cyber Defense Expert", "Senior Security Analyst", "Threat Intelligence Specialist", "Cyber Defense Commander"];

function CareerTimeline({ level }: { level: number }) {
  const current = Math.min(RANKS.length, Math.max(1, level)) - 1;
  return (
    <ol className="space-y-0" aria-label="Career progression timeline">
      {RANKS.map((r, i) => {
        const reached = i <= current;
        const isCurrent = i === current;
        return (
          <li key={r} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                isCurrent ? "border-cyan-400 bg-cyan-400/20 text-cyan-300" : reached ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-slate-700 text-slate-600"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-sm ${isCurrent ? "font-bold text-cyan-300" : reached ? "text-slate-200" : "text-slate-600"}`}>{r}</span>
            {isCurrent && <span className="rounded bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">CURRENT</span>}
            {i < RANKS.length - 1 && <span aria-hidden="true" className="ml-3 h-4 w-px bg-slate-700" />}
          </li>
        );
      })}
    </ol>
  );
}

export default function AnalyticsPage() {
  const s = useGameStore();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    playerApi
      .history(30)
      .then((h) => {
        if (live) setHistory(h.attempts as HistoryItem[]);
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : "Analytics unavailable.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const completed = history.filter((h) => h.completed);
  const avg = (nums: number[]) => (nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length);
  const trendData = [...history].reverse().map((h, i) => ({
    name: `#${i + 1}`,
    score: h.score,
    health: h.network_health,
    response: h.response_time,
  }));
  const radarData = (Object.entries(s.skills) as Array<[string, number]>).map(([k, v]) => ({
    skill: k.replace(/([A-Z])/g, " $1"),
    value: v,
  }));
  const rank = rankForLevel(s.level);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100" role="alert">
          <p className="font-semibold">ONLINE FEATURES UNAVAILABLE</p>
          <p className="mt-1">Local gameplay remains available. Your progress is being saved locally.</p>
          <p className="mt-1 text-xs text-amber-200/80">{error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Missions completed", `${completed.length}`, `${history.length} played`],
          ["Avg network health", `${Math.round(avg(completed.map((h) => h.network_health)))}%`, "across completed missions"],
          ["Avg response", `${avg(completed.map((h) => h.response_time)).toFixed(1)}s`, "completed missions"],
          ["Success rate", history.length ? `${Math.round((completed.length / history.length) * 100)}%` : "—", "completed vs failed"],
        ].map(([k, v, sub]) => (
          <div key={k} className="glass-panel rounded-lg p-4">
            <p className="text-[11px] tracking-widest text-slate-500 uppercase">{k}</p>
            <p className="mono mt-1 text-2xl font-bold text-slate-100">{v}</p>
            <p className="mt-1 text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Performance trend" subtitle="Score, health, and response over recent missions">
          {loading ? (
            <p className="mono animate-pulse py-10 text-center text-xs tracking-widest text-slate-400" role="status">ANALYZING PERFORMANCE…</p>
          ) : trendData.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No mission data yet — complete a mission to begin your career profile.</p>
          ) : (
            <div className="h-56" role="img" aria-label="Area chart of mission performance over time">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #1e293b", color: "#e2e8f0", fontSize: 12 }} />
                  <Area type="monotone" dataKey="score" stroke="#22d3ee" fill="url(#gScore)" />
                  <Area type="monotone" dataKey="health" stroke="#34d399" fill="transparent" strokeDasharray="4 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Skill radar" subtitle="Five career capabilities">
          <div className="h-56" role="img" aria-label="Radar chart of the five cybersecurity skills">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.25} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #1e293b", color: "#e2e8f0", fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Career timeline" subtitle={`Current rank: ${rank} (Level ${s.level})`}>
          <CareerTimeline level={s.level} />
        </Panel>

        <Panel title="Personal records" subtitle="Tracked career bests">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Highest score", s.records.bestScoreOverall > 0 ? s.records.bestScoreOverall.toLocaleString() : "—"],
              ["Best rating", s.records.bestRating ?? "—"],
              ["Fastest response", s.records.fastestCriticalSec !== null ? `${s.records.fastestCriticalSec}s` : "—"],
              ["Best network health", s.records.bestHealthPct > 0 ? `${s.records.bestHealthPct}%` : "—"],
              ["Most threats (mission)", s.records.mostContainedSingle > 0 ? String(s.records.mostContainedSingle) : "—"],
              ["Longest streak", s.records.longestStreak > 0 ? `${s.records.longestStreak} wins` : "—"],
              ["Perfect missions", String(s.missionHistory.filter((m) => m.success && m.incorrectDecisions === 0).length)],
              ["Total XP earned", s.xp.toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className="rounded border border-slate-800 bg-slate-900/50 p-2.5">
                <dt className="text-[11px] text-slate-500">{k}</dt>
                <dd className="mono mt-0.5 font-bold text-slate-100">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Panel title="AI career advisor" subtitle="Based on your actual performance data">
        <div className="flex items-start gap-3">
          <BrainCircuit className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" aria-hidden="true" />
          <div className="space-y-1 text-sm text-slate-300">
            <p>
              <span className="font-semibold text-slate-100">Current strength:</span>{" "}
              {(() => {
                const entries = Object.entries(s.skills) as Array<[string, number]>;
                const top = entries.sort((a, b) => b[1] - a[1])[0];
                return top ? `${top[0].replace(/([A-Z])/g, " $1")} (${top[1]}/100)` : "—";
              })()}
            </p>
            <p>
              <span className="font-semibold text-slate-100">Development area:</span>{" "}
              {(() => {
                const entries = Object.entries(s.skills) as Array<[string, number]>;
                const low = entries.sort((a, b) => a[1] - b[1])[0];
                return low ? `${low[0].replace(/([A-Z])/g, " $1")} (${low[1]}/100)` : "—";
              })()}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              {s.records.longestStreak > 0 ? `Current streak: ${s.records.currentStreak} · longest ${s.records.longestStreak}` : "Complete missions to build a streak."}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              {s.missionHistory.length > 0 ? `${s.missionHistory.length} missions on record` : "No missions on record yet."}
            </p>
          </div>
        </div>
        <Link to="/soc/ai" className="mt-3 inline-flex min-h-[44px] items-center rounded-md border border-violet-400/40 px-4 py-2 text-sm text-violet-200 hover:bg-violet-400/10">
          Open AI Game Director
        </Link>
      </Panel>
    </div>
  );
}
