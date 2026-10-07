import { useEffect, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import type { LogSeverity } from "../../types/game";

function clock(at: number): string {
  const d = new Date(at);
  return d.toTimeString().slice(0, 8);
}

const SEV_STYLE: Record<LogSeverity, string> = {
  INFO: "text-slate-400",
  HIGH: "text-amber-300",
  SUCCESS: "text-emerald-300",
  WARN: "text-orange-300",
  ERROR: "text-red-300",
};

/** Scrolling SOC event log — timestamped, severity-tagged audit trail. */
export default function GameLog() {
  const eventLog = useGameStore((s) => s.eventLog);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [eventLog.length]);

  if (eventLog.length === 0) {
    return <p className="text-sm text-slate-500">No events yet — start a mission.</p>;
  }

  return (
    <ol
      className="soc-scroll max-h-56 space-y-1.5 overflow-y-auto pr-1 font-mono text-xs leading-relaxed"
      aria-label="Mission event log"
      aria-live="polite"
    >
      {eventLog.map((e) => (
        <li key={e.id} className="flex gap-2">
          <span className="shrink-0 text-slate-500">[{clock(e.at)}]</span>
          <span className={`shrink-0 font-bold ${SEV_STYLE[e.sev ?? "INFO"]}`}>[{e.sev ?? "INFO"}]</span>
          <span className="text-slate-300">{e.message}</span>
        </li>
      ))}
      <div ref={bottomRef} />
    </ol>
  );
}
