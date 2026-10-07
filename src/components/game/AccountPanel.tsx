import { useState } from "react";
import { Link } from "react-router-dom";
import { Cloud, CloudOff, LogOut, RefreshCw } from "lucide-react";
import { ApiError } from "../../services/api/client";
import { playerApi } from "../../services/api/playerApi";
import { pullAndMerge, pushLocalProgress } from "../../services/sync/syncService";
import { useAuthStore } from "../../store/authStore";
import { useGameStore } from "../../store/gameStore";
import Button from "../ui/Button";

/** Cloud account card: sign-in state, sync controls, codename sync. */
export default function AccountPanel() {
  const auth = useAuthStore();
  const setUsername = useGameStore((s) => s.setUsername);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Sync failed. Local progress is safe.");
    } finally {
      setBusy(false);
    }
  };

  if (auth.status !== "auth" || !auth.user) {
    return (
      <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <CloudOff className="h-4 w-4 text-slate-400" aria-hidden="true" />
          Guest mode â€” progress saved on this device only.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/login" className="inline-flex min-h-[44px] items-center rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
            Sign in for cloud save
          </Link>
          <Link to="/register" className="inline-flex min-h-[44px] items-center rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
        <Cloud className="h-4 w-4 text-emerald-300" aria-hidden="true" />
        {auth.user.codename}
        <span className="mono ml-auto text-xs font-normal text-slate-400">{auth.user.email}</span>
      </p>
      <p className="mt-1 text-xs text-slate-400" role="status">
        {auth.syncState === "synced" ? "â—‰ Cloud synced." : auth.syncState === "syncing" ? "â—Œ Syncingâ€¦" : auth.syncState === "error" ? "Sync error â€” local progress safe." : "â—‹ Offline."}
        {auth.lastSyncedAt ? ` Last sync ${new Date(auth.lastSyncedAt).toLocaleTimeString()}.` : ""}
      </p>
      {msg && <p role="status" className="mt-2 text-xs text-slate-300">{msg}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => void run(() => pullAndMerge().then(() => undefined), "Cloud profile loaded.")}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Sync now
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await pushLocalProgress();
              const profile = (await playerApi.profile()) as { codename?: string };
              if (profile.codename) setUsername(profile.codename);
            }, "Local progress uploaded.")}
        >
          Upload local
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const profile = (await playerApi.updateCodename(useGameStore.getState().username)) as { codename?: string };
              if (profile.codename) setUsername(profile.codename);
            }, "Codename synced to cloud.")}
        >
          Sync codename
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => void auth.logout(true)}>
          <LogOut className="h-4 w-4" aria-hidden="true" /> Logout (keep local)
        </Button>
      </div>
    </div>
  );
}
