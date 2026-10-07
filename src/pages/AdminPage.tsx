import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Database, Server, ShieldCheck, Users } from "lucide-react";
import { adminApi, type SystemStatus } from "../services/api/onlineApi";
import { useAuthStore } from "../store/authStore";
import Panel from "../components/ui/Panel";

function fmtUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${sec % 60}s`;
}

export default function AdminPage() {
  const status = useAuthStore((s) => s.status);
  const [data, setData] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "auth") return;
    let live = true;
    setLoading(true);
    adminApi
      .system()
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : "Admin access denied.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [status]);

  if (status !== "auth") {
    return (
      <Panel title="Admin access required" subtitle="Sign in with an administrator account to view system status.">
        <p className="text-sm text-slate-400">This area is restricted to operators with the ADMIN role.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel title="System monitor" subtitle="Protected admin endpoint — server-side role enforcement">
        {loading ? (
          <p className="mono animate-pulse py-8 text-center text-xs tracking-widest text-slate-400" role="status">
            LOADING SYSTEM STATUS…
          </p>
        ) : error ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
            <p className="font-semibold">ACCESS DENIED</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        ) : data ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { icon: Server, label: "API STATUS", value: data.status.toUpperCase(), ok: data.status === "ok" },
              { icon: Database, label: "DATABASE", value: data.database.toUpperCase(), ok: data.database === "connected" },
              { icon: Users, label: "REGISTERED USERS", value: data.users.toLocaleString(), ok: true },
              { icon: ShieldCheck, label: "OPERATOR PROFILES", value: data.operators.toLocaleString(), ok: true },
              { icon: Activity, label: "MISSION ATTEMPTS", value: data.missionAttempts.toLocaleString(), ok: true },
              { icon: Activity, label: "COMPLETED TODAY", value: data.completedToday.toLocaleString(), ok: true },
            ].map(({ icon: Icon, label, value, ok }) => (
              <div key={label} className="rounded-md border border-slate-800 bg-slate-900/50 p-4">
                <p className="flex items-center gap-1.5 text-[11px] tracking-widest text-slate-500">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
                </p>
                <p className={`mono mt-1 text-xl font-bold ${ok ? "text-emerald-300" : "text-red-300"}`}>{value}</p>
              </div>
            ))}
            <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4 sm:col-span-2 xl:col-span-3">
              <p className="text-[11px] tracking-widest text-slate-500">SERVER UPTIME</p>
              <p className="mono mt-1 text-xl font-bold text-slate-100">{fmtUptime(data.uptimeSec)}</p>
              <p className="mt-1 text-xs text-slate-500">Achievements unlocked to date: {data.achievementsUnlocked.toLocaleString()}</p>
            </div>
          </motion.div>
        ) : null}
      </Panel>
    </div>
  );
}
