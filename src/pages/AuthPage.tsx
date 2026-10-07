import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, Play, Radar, UserPlus } from "lucide-react";
import { ApiError, ApiOfflineError } from "../services/api/client";
import { pullAndMerge, pushLocalProgress } from "../services/sync/syncService";
import { loadSave } from "../services/storage/saveService";
import { useAuthStore } from "../store/authStore";
import Button from "../components/ui/Button";
import Panel from "../components/ui/Panel";

const inputCls =
  "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500";

function friendly(e: unknown): string {
  if (e instanceof ApiOfflineError) return "Backend unavailable — you can keep playing as guest. Progress stays local.";
  if (e instanceof ApiError) return e.message;
  return "Something went wrong. You can keep playing as guest.";
}

function hasLocalProgress(): boolean {
  const s = loadSave();
  return !!s && (s.xp > 0 || s.completedMissionIds.length > 0);
}

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codename, setCodename] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Guest → account handoff: offer to sync pre-existing local progress.
  const [migrateChoice, setMigrateChoice] = useState<null | { xp: number; missions: number; achievements: number }>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "register" && (codename.trim().length < 3 || password.length < 8)) {
      setError("Codename needs 3+ characters and password needs 8+ characters with a letter and a number.");
      return;
    }
    setBusy(true);
    try {
      const local = loadSave();
      if (mode === "login") {
        await login(email.trim(), password);
        await pullAndMerge();
        navigate((location.state as { from?: string })?.from ?? "/soc");
      } else {
        await register(email.trim(), password, codename.trim());
        if (local && (local.xp > 0 || local.completedMissionIds.length > 0)) {
          setMigrateChoice({ xp: local.xp, missions: local.completedMissionIds.length, achievements: local.achievements.length });
          return;
        }
        await pullAndMerge();
        navigate("/soc");
      }
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  if (migrateChoice) {
    return (
      <div className="soc-grid-bg flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <Panel title="Local progress found" subtitle="Sync your guest career to the new cloud account, or start fresh.">
          <dl className="mono grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded border border-slate-800 p-3"><dt className="text-slate-500">LEVEL/XP</dt><dd className="font-bold text-slate-100">{migrateChoice.xp.toLocaleString()} XP</dd></div>
            <div className="rounded border border-slate-800 p-3"><dt className="text-slate-500">MISSIONS</dt><dd className="font-bold text-slate-100">{migrateChoice.missions}</dd></div>
            <div className="rounded border border-slate-800 p-3"><dt className="text-slate-500">MEDALS</dt><dd className="font-bold text-slate-100">{migrateChoice.achievements}</dd></div>
          </dl>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await pushLocalProgress();
                  navigate("/soc");
                } catch (err) {
                  setError(friendly(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Sync progress
            </Button>
            <Button variant="ghost" className="flex-1" disabled={busy} onClick={() => navigate("/soc")}>
              Start fresh
            </Button>
          </div>
          {error && <p role="alert" className="mt-3 rounded border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}
        </Panel>
      </div>
    );
  }

  return (
    <div className="soc-grid-bg min-h-screen bg-slate-950 text-slate-200">
      <header className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2 font-mono text-sm font-bold tracking-widest">
          <Radar className="h-5 w-5 text-cyan-400" aria-hidden="true" />
          CYBER<span className="text-cyan-400">//</span>BREACH
        </Link>
        <Link to="/soc" className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
          <Play className="h-4 w-4" aria-hidden="true" /> Play as guest
        </Link>
      </header>
      <main className="mx-auto max-w-md px-4 pb-10">
        <Panel
          title={mode === "login" ? "Operator sign in" : "Create operator profile"}
          subtitle={mode === "login" ? "Cloud save syncs your career across devices." : "Guest progress stays local until you sync it."}
        >
          <form onSubmit={submit} className="space-y-3">
            {mode === "register" && (
              <div>
                <label htmlFor="codename" className="mb-1 block text-xs font-semibold text-slate-300">Codename</label>
                <input id="codename" value={codename} onChange={(e) => setCodename(e.target.value)} maxLength={24} placeholder="NEXUS" className={inputCls} autoComplete="username" />
              </div>
            )}
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-semibold text-slate-300">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operator@example.com" className={inputCls} autoComplete="email" />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-semibold text-slate-300">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </div>
            {error && <p role="alert" className="rounded border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {mode === "login" ? <LogIn className="h-4 w-4" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
              {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-400">
            {mode === "login" ? (
              <>No account? <Link to="/register" className="text-cyan-300 hover:underline">Create one</Link></>
            ) : (
              <>Have an account? <Link to="/login" className="text-cyan-300 hover:underline">Sign in</Link></>
            )}
          </p>
          <p className="mt-2 text-center text-xs text-slate-500">
            {hasLocalProgress() ? "Local guest progress detected — you will be offered a sync." : "No local progress yet — guest mode needs nothing."}
          </p>
        </Panel>
      </main>
    </div>
  );
}
