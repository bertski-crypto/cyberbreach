import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrainCircuit } from "lucide-react";
import { directorDebrief, directorRecommendation, planAdaptiveScenario } from "../../game/ai/gameDirector";
import { analyzePlayer } from "../../game/ai/playerAnalyzer";
import type { DebriefReport } from "../../game/ai/aiTypes";
import { FOCUS_LABELS } from "../../game/data/scenarios";
import { useGameStore } from "../../store/gameStore";
import Button from "../ui/Button";

/** After-action review generated from the mission result + career analysis. */
export default function AiDebriefPanel() {
  const s = useGameStore();
  const navigate = useNavigate();
  const [report, setReport] = useState<DebriefReport | null>(null);
  const [rec, setRec] = useState<{ focus: string; title: string; reason: string } | null>(null);
  const [training, setTraining] = useState(false);

  const r = s.lastResult;
  useEffect(() => {
    if (!r) return;
    let live = true;
    const snap = s.playerSnapshot();
    const analysis = analyzePlayer(snap);
    directorDebrief({
        missionTitle: r.missionId,
        success: r.success,
        score: r.score,
        accuracy: r.accuracy,
        avgResponseTimeSec: r.avgResponseTimeSec,
        networkHealthPct: r.networkHealthPct,
        threatsNeutralized: r.threatsNeutralized,
        incorrectDecisions: r.incorrectDecisions,
        escalations: r.escalations,
        objectivesDone: r.objectivesDone,
        objectivesTotal: r.objectivesTotal,
        rating: r.securityRating,
        analysis,
      }).then((rep) => {
        if (live) {
          setReport(rep);
          setRec(directorRecommendation(analysis));
        }
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.completedAt]);

  if (!r || !report) {
    return (
      <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4" aria-label="AI after-action review loading">
        <p className="mono flex items-center gap-2 text-xs tracking-widest text-slate-400">
          <BrainCircuit className="h-4 w-4 animate-pulse text-violet-300" aria-hidden="true" />
          AI AFTER-ACTION REVIEW â€” ANALYZINGâ€¦
        </p>
      </div>
    );
  }

  const startTraining = async () => {
    setTraining(true);
    try {
      const plan = await planAdaptiveScenario(
        s.playerSnapshot(),
        { focus: report.recommendedFocus },
        (msg) => s.logDirector(msg),
      );
      s.setAiDifficulty(plan.difficulty.tier);
      s.startDynamicMission(plan.scenario);
      navigate("/soc");
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="rounded-md border border-violet-400/25 bg-violet-400/5 p-4" aria-label="AI after-action review">
      <p className="mono flex items-center gap-2 text-xs font-bold tracking-widest text-violet-300">
        <BrainCircuit className="h-4 w-4" aria-hidden="true" />
        AI AFTER-ACTION REVIEW {report.provider === "DETERMINISTIC" ? "(OFFLINE ANALYSIS)" : "(EXTERNAL)"}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-[11px] tracking-widest text-slate-500 uppercase">Overall â€” {report.overallLabel} ({report.classification})</p>
          <ul className="mt-1 space-y-1 text-sm text-slate-200">
            {report.strengths.map((t) => (
              <li key={t}>âœ“ {t}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] tracking-widest text-slate-500 uppercase">Areas to improve</p>
          <ul className="mt-1 space-y-1 text-sm text-slate-300">
            {report.improvements.length === 0 ? <li>None â€” textbook operation.</li> : report.improvements.map((t) => (
              <li key={t}>! {t}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mono mt-3 text-xs text-slate-400">
        RESPONSE QUALITY {report.responseQualityPct}% Â· RECOMMENDED FOCUS {FOCUS_LABELS[report.recommendedFocus]}
      </p>
      <p className="mt-1 text-sm text-slate-300">{report.recommendation}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={startTraining} disabled={training || !rec}>
          {training ? "Generatingâ€¦" : `Train: ${rec?.title ?? "adaptive drill"}`}
        </Button>
        <Button variant="ghost" onClick={() => { s.resetWorld(); navigate("/soc/missions"); }}>
          Continue campaign
        </Button>
      </div>
    </div>
  );
}

