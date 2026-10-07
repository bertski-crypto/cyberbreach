import { useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { challengesApi, type DailyChallenge } from "../../services/api/onlineApi";
import { useAuthStore } from "../../store/authStore";
import Button from "../ui/Button";

/** Daily cyber challenge — server-verified, one reward per day. */
export default function DailyChallengeCard() {
  const status = useAuthStore((s) => s.status);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "auth") {
      setChallenge(null);
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    challengesApi
      .daily()
      .then((c) => {
        if (live) setChallenge(c);
      })
      .catch(() => {
        /* daily challenge is best-effort */
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [status]);

  if (status !== "auth") return null;

  const claim = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await challengesApi.completeDaily();
      setChallenge(r.challenge);
      setMsg(r.xpAwarded > 0 ? `+${r.xpAwarded} XP — challenge complete.` : "Already claimed today.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Challenge not complete yet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border border-amber-400/25 bg-amber-400/5 p-4" aria-label="Daily cyber challenge">
      <p className="mono flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-amber-300">
        <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" /> DAILY CYBER CHALLENGE
      </p>
      {loading ? (
        <p className="mono mt-2 animate-pulse text-xs text-slate-400" role="status">LOADING DAILY CHALLENGE…</p>
      ) : challenge ? (
        <>
          <p className="mt-2 text-sm font-semibold text-slate-100">{challenge.missionTitle}</p>
          <ul className="mono mt-1 space-y-0.5 text-xs text-slate-300">
            <li>▸ Contain {challenge.requiredThreats} threats</li>
            <li>▸ Maintain {challenge.minHealth}%+ network health</li>
            <li>▸ Reward: +{challenge.rewardXp} XP</li>
          </ul>
          <div className="mt-3">
            {challenge.completed ? (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Completed — see you tomorrow.
              </p>
            ) : (
              <Button variant="outline" disabled={busy} onClick={() => void claim()} className="w-full">
                {busy ? "Verifying…" : "Claim reward"}
              </Button>
            )}
          </div>
          {msg && <p role="status" className="mt-2 text-xs text-slate-300">{msg}</p>}
        </>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Daily challenge unavailable right now.</p>
      )}
    </div>
  );
}
