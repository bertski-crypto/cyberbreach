import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrainCircuit, Dumbbell, FlaskConical, TrendingDown, TrendingUp } from "lucide-react";
import type { DifficultyName, PlayerAnalysis, TrainingRecommendation } from "../game/ai/aiTypes";
import { analyzePerformance, directorRecommendation, directorStatus, directorWhy, planAdaptiveScenario } from "../game/ai/gameDirector";
import { FOCUS_LABELS } from "../game/data/scenarios";
import { SKILL_DEFS } from "../game/systems/progression";
import { useGameStore } from "../store/gameStore";
import type { SkillKey, ThreatType } from "../types/game";
import Panel from "../components/ui/Panel";
import Button from "../components/ui/Button";

const THREAT_OPTIONS: ThreatType[] = [
  "SUSPICIOUS_LOGIN",
  "BRUTE_FORCE",
  "PORT_SCAN",
  "MALWARE",
  "PHISHING",
  "UNAUTHORIZED_ACCESS",
  "DDOS",
  "DATA_EXFILTRATION",
  "RANSOMWARE",
  "INSIDER_THREAT",
];

const DIFFS: DifficultyName[] = ["EASY", "NORMAL", "HARD", "EXPERT", "ELITE"];

function SkillBar({ label, value, dim }: { label: string; value: number; dim?: boolean }) {
  return (
    <div className={dim ? "opacity-70" : ""}>
      <div className="flex justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="mono text-slate-400">{value}/100</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-800" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} ${value}`}>
        <div className="h-full bg-violet-400/80" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function AiDirectorPage() {
  const s = useGameStore();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<PlayerAnalysis | null>(null);
  const [provider, setProvider] = useState<"DETERMINISTIC" | "EXTERNAL">("DETERMINISTIC");
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState<TrainingRecommendation | null>(null);

  // Free-simulation config
  const [fsDiff, setFsDiff] = useState<DifficultyName>("NORMAL");
  const [fsThreats, setFsThreats] = useState<ThreatType[]>(["SUSPICIOUS_LOGIN"]);
  const [fsCount, setFsCount] = useState(2);

  useEffect(() => {
    let live = true;
    analyzePerformance(s.playerSnapshot(), (msg) => s.logDirector(msg)).then(({ analysis: a, provider: p }) => {
      if (!live) return;
      setAnalysis(a);
      setProvider(p);
      setRec(directorRecommendation(a));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = directorStatus();

  const launch = async (req: { focus: SkillKey | "AUTO"; difficulty?: DifficultyName; incidentCount?: number; threatTypes?: ThreatType[] }) => {
    setBusy(true);
    try {
      const plan = await planAdaptiveScenario(s.playerSnapshot(), req, (msg) => s.logDirector(msg));
      s.setAiDifficulty(plan.difficulty.tier);
      s.startDynamicMission(plan.scenario);
      navigate("/soc");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Panel
        title="AI Game Director"
        subtitle="Adaptive training intelligence — analysis, difficulty, and generated scenarios"
        action={
          <span className="mono inline-flex items-center gap-1.5 rounded border border-slate-700 px-2 py-1 text-[11px] tracking-widest" aria-label={status === "ONLINE" ? "AI Director online" : "AI Director offline mode"}>
            <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${status === "ONLINE" ? "animate-pulse bg-cyan-300" : "bg-amber-300"}`} />
            <span className={status === "ONLINE" ? "text-cyan-300" : "text-amber-300"}>
              {status === "ONLINE" ? "ONLINE" : "OFFLINE MODE"}
            </span>
          </span>
        }
      >
        {!analysis ? (
          <div aria-label="Analyzing player performance">
            <p className="mono animate-pulse text-xs tracking-widest text-violet-300">ANALYZING PLAYER PERFORMANCE…</p>
            <div className="mt-2 h-2 overflow-hidden rounded bg-slate-800" aria-hidden="true">
              <div className="h-full w-2/3 animate-pulse bg-violet-400/60" />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mono text-[11px] tracking-widest text-slate-500">PLAYER ANALYSIS ({provider})</p>
              <p className="mono mt-1 text-3xl font-black text-white">{analysis.overallSkill}<span className="text-sm text-slate-500">/100</span></p>
              <div className="mt-3 space-y-2">
                {SKILL_DEFS.map((d) => (
                  <SkillBar key={d.key} label={d.label} value={analysis.skills[d.key]} dim={d.key !== analysis.strongestSkill && d.key !== analysis.weakestSkill} />
                ))}
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs tracking-widest text-slate-500 uppercase">Strongest — {FOCUS_LABELS[analysis.strongestSkill]}</p>
                <p className="mt-1 text-slate-300">Performance {analysis.skills[analysis.strongestSkill]}%. Containment you can rely on.</p>
              </div>
              <div className="rounded-md border border-amber-400/25 bg-amber-400/5 p-3">
                <p className="text-xs tracking-widest text-amber-300 uppercase">Training opportunity — {FOCUS_LABELS[analysis.weakestSkill]}</p>
                <p className="mt-1 text-slate-300">Performance {analysis.skills[analysis.weakestSkill]}%. {FOCUS_LABELS[analysis.weakestSkill]} drills recommended.</p>
              </div>
              <dl className="mono grid grid-cols-2 gap-2 text-xs">
                <div className="rounded border border-slate-800 p-2"><dt className="text-slate-500">TREND</dt><dd className="mt-0.5 flex items-center gap-1 text-slate-100">{analysis.recentTrend === "IMPROVING" ? <TrendingUp className="h-3.5 w-3.5 text-emerald-300" /> : analysis.recentTrend === "DECLINING" ? <TrendingDown className="h-3.5 w-3.5 text-red-300" /> : "—"} {analysis.recentTrend} ({analysis.trendDelta >= 0 ? "+" : ""}{analysis.trendDelta})</dd></div>
                <div className="rounded border border-slate-800 p-2"><dt className="text-slate-500">DIFFICULTY FIT</dt><dd className="mt-0.5 text-slate-100">{analysis.recommendedDifficulty}</dd></div>
                <div className="rounded border border-slate-800 p-2"><dt className="text-slate-500">SUCCESS RATE</dt><dd className="mt-0.5 text-slate-100">{(analysis.missionSuccessRate * 100).toFixed(0)}% ({analysis.missionsSampled} missions)</dd></div>
                <div className="rounded border border-slate-800 p-2"><dt className="text-slate-500">AVG RESPONSE</dt><dd className="mt-0.5 text-slate-100">{analysis.averageResponseTime}s</dd></div>
              </dl>
              <div className="rounded-md border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs tracking-widest text-slate-500 uppercase">Why this assessment?</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{directorWhy(analysis)}</p>
              </div>
            </div>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Adaptive training" subtitle="A scenario built around your weakest area at your fitted difficulty">
          {rec && analysis ? (
            <>
              <p className="flex items-center gap-2 text-sm text-slate-200">
                <Dumbbell className="h-4 w-4 text-violet-300" aria-hidden="true" />
                Focus: <strong>{FOCUS_LABELS[analysis.trainingFocus]}</strong> · Difficulty: <strong>{analysis.recommendedDifficulty}</strong>
              </p>
              <p className="mt-1 text-xs text-slate-400">{rec.reason}</p>
              <Button onClick={() => void launch({ focus: "AUTO" })} disabled={busy} className="mt-3 w-full">
                <BrainCircuit className="h-4 w-4" aria-hidden="true" /> {busy ? "Generating…" : "Generate training"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-slate-500">Waiting for analysis…</p>
          )}
        </Panel>

        <Panel title="Free simulation" subtitle="You choose the parameters — the director assembles a safe drill">
          <div className="space-y-3">
            <div>
              <label htmlFor="fs-diff" className="mb-1 block text-xs font-semibold text-slate-300">Difficulty</label>
              <select id="fs-diff" value={fsDiff} onChange={(e) => setFsDiff(e.target.value as DifficultyName)} className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm">
                {DIFFS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className="mb-1 text-xs font-semibold text-slate-300">Threat types (max 3 matter most)</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {THREAT_OPTIONS.map((t) => (
                  <label key={t} className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded border border-slate-800 px-2 py-1.5 text-xs text-slate-300 has-checked:border-cyan-400/50">
                    <input
                      type="checkbox"
                      checked={fsThreats.includes(t)}
                      onChange={(e) => setFsThreats((prev) => (e.target.checked ? [...prev, t].slice(0, 5) : prev.filter((x) => x !== t)))}
                      className="accent-cyan-400"
                    />
                    {t.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="fs-count" className="mb-1 block text-xs font-semibold text-slate-300">Incidents: {fsCount}</label>
              <input id="fs-count" type="range" min={1} max={4} value={fsCount} onChange={(e) => setFsCount(Number(e.target.value))} className="w-full accent-cyan-400" />
            </div>
            <Button
              onClick={() => void launch({ focus: "AUTO", difficulty: fsDiff, incidentCount: fsCount, threatTypes: fsThreats.length > 0 ? fsThreats : undefined })}
              disabled={busy || fsThreats.length === 0}
              className="w-full"
            >
              <FlaskConical className="h-4 w-4" aria-hidden="true" /> {busy ? "Generating…" : "Build simulation"}
            </Button>
          </div>
        </Panel>
      </div>

      <Panel title="Training history" subtitle="Adaptive runs and fitted difficulty persist locally">
        <div className="flex flex-wrap gap-4 text-sm">
          <p className="text-slate-300">Fitted difficulty: <strong className="mono">{s.aiDifficulty}</strong></p>
          <p className="text-slate-300">Adaptive runs: <strong className="mono">{s.trainingRuns.length}</strong></p>
        </div>
        {s.trainingRuns.length > 0 && (
          <ul className="mono mt-2 space-y-1 text-xs text-slate-400">
            {s.trainingRuns.slice(0, 8).map((run) => (
              <li key={run.id}>
                [{new Date(run.at).toLocaleDateString()}] {run.title} — {run.focus} — {run.success ? "SUCCESS" : "FAILED"}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
