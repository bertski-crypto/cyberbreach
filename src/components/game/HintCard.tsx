import { useState } from "react";
import { Sparkles } from "lucide-react";
import { HINT_BUDGET_PER_MISSION } from "../../game/ai/hintEngine";
import { useGameStore } from "../../store/gameStore";
import Button from "../ui/Button";

/** Director guidance on demand — 3 hints per operation, escalating levels. */
export default function HintCard() {
  const requestHint = useGameStore((s) => s.requestHint);
  const hintsUsed = useGameStore((s) => s.hintsUsed);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const [hint, setHint] = useState<{ level: number; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (gameStatus !== "PLAYING" && gameStatus !== "PAUSED") return null;
  const left = HINT_BUDGET_PER_MISSION - hintsUsed;

  return (
    <div className="rounded-md border border-violet-400/25 bg-violet-400/5 p-3" aria-label="AI Director hints">
      <div className="flex items-center justify-between gap-2">
        <p className="mono flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-violet-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> AI HINT {left > 0 ? `(${left} left)` : "(exhausted)"}
        </p>
        <Button
          variant="outline"
          disabled={busy || left <= 0}
          onClick={async () => {
            setBusy(true);
            try {
              const h = await requestHint();
              if (h) setHint(h);
            } finally {
              setBusy(false);
            }
          }}
          aria-label="Request an AI Director hint"
        >
          {busy ? "Consulting…" : "Ask director"}
        </Button>
      </div>
      {hint ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-200">
          <span className="mono mr-2 rounded bg-violet-400/15 px-1.5 py-0.5 text-[11px] font-bold text-violet-200">
            LV{hint.level}
          </span>
          {hint.text}
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-500">Guidance only — the director never solves it for you.</p>
      )}
    </div>
  );
}
