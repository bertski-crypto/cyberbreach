import type { ReactNode } from "react";

export default function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase">{label}</p>
        {icon}
      </div>
      <p className="mono mt-2 text-2xl font-bold text-slate-100">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
