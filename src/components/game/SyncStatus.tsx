import { useAuthStore } from "../../store/authStore";

/** Subtle cloud sync indicator: SYNCED / SYNCING / OFFLINE / ERROR. */
export default function SyncStatus() {
  const status = useAuthStore((s) => s.status);
  const syncState = useAuthStore((s) => s.syncState);
  const message = useAuthStore((s) => s.syncMessage);

  if (status !== "auth") {
    return (
      <span className="mono hidden items-center gap-1.5 text-[11px] tracking-widest text-slate-500 md:inline-flex" title="Guest mode — progress saved locally">
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-slate-500" />
        GUEST
      </span>
    );
  }
  const dot =
    syncState === "synced" ? "bg-emerald-400" : syncState === "syncing" ? "animate-pulse bg-cyan-300" : syncState === "error" ? "bg-red-400" : "bg-slate-500";
  const label = syncState === "synced" ? "CLOUD SYNCED" : syncState === "syncing" ? "SYNCING…" : syncState === "error" ? "SYNC ERROR" : "OFFLINE";
  return (
    <span
      className="mono hidden items-center gap-1.5 text-[11px] tracking-widest text-slate-300 md:inline-flex"
      title={message ?? label}
      role="status"
      aria-label={`Cloud sync status: ${label}`}
    >
      <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
      {label === "CLOUD SYNCED" ? "◉ CLOUD SYNCED" : label === "SYNCING…" ? "◌ SYNCING…" : label === "OFFLINE" ? "○ OFFLINE" : label}
    </span>
  );
}
