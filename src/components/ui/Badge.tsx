const tone: Record<string, string> = {
  LOW: "bg-slate-500/15 text-slate-300 border-slate-500/40",
  MEDIUM: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  HIGH: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  ONLINE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  WARNING: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  UNDER_ATTACK: "bg-red-500/15 text-red-300 border-red-500/40",
  COMPROMISED: "bg-red-600/20 text-red-200 border-red-600/50",
  ISOLATED: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  OFFLINE: "bg-slate-500/15 text-slate-400 border-slate-600/50",
  GUARDED: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  ELEVATED: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  HIGH_T: "bg-red-500/15 text-red-300 border-red-500/40",
  CRITICAL: "bg-red-500/15 text-red-300 border-red-500/40",
};

export default function Badge({ value }: { value: string }) {
  const key = value === "HIGH" ? "HIGH" : value;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide ${tone[key] ?? tone.LOW}`}
    >
      <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {value.replace(/_/g, " ")}
    </span>
  );
}
