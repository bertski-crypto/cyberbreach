import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Radar } from "lucide-react";

const BOOT_LINES = [
  { label: "NETWORK", status: "ONLINE" },
  { label: "FIREWALL", status: "ONLINE" },
  { label: "THREAT ENGINE", status: "ONLINE" },
  { label: "AI DIRECTOR", status: "ONLINE" },
  { label: "DATABASE", status: "ONLINE" },
];

/** Cinematic boot sequence — 2.5s max, skippable, shown once per session. */
export default function BootSequence({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const reducible =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reducible) {
      setDone(true);
      onDone();
      return;
    }
    const timers: number[] = [];
    BOOT_LINES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStep(i + 1), 350 * (i + 1)));
    });
    timers.push(window.setTimeout(() => setDone(true), 350 * BOOT_LINES.length + 400));
    timers.push(window.setTimeout(onDone, 350 * BOOT_LINES.length + 900));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      role="dialog"
      aria-label="System boot sequence"
    >
      <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900/80 p-6 font-mono text-sm">
        <p className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-cyan-300">
          <Radar className="h-4 w-4" aria-hidden="true" />
          CYBER<span className="text-cyan-400">//</span>BREACH
        </p>
        <p className="mt-1 text-[10px] tracking-widest text-slate-500">SECURITY OPERATIONS SYSTEM</p>
        <div className="mt-4 space-y-2">
          {BOOT_LINES.map((line, i) => (
            <div key={line.label} className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{line.label}</span>
              <span className={i < step ? "text-emerald-300" : "text-slate-600"}>
                {i < step ? line.status : "···"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded bg-slate-800" aria-hidden="true">
          <div
            className="h-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${(step / BOOT_LINES.length) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-center text-[10px] tracking-widest text-slate-500">
          {step >= BOOT_LINES.length ? "SYSTEM READY" : "INITIALIZING…"}
        </p>
        <button
          onClick={() => {
            setDone(true);
            onDone();
          }}
          className="mt-3 w-full rounded border border-slate-700 py-2 text-xs text-slate-400 hover:bg-slate-800"
        >
          SKIP
        </button>
      </div>
    </motion.div>
  );
}
