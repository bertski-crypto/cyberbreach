import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Award,
  BrainCircuit,
  LayoutDashboard,
  LogOut,
  Play,
  ScrollText,
  Search,
  Settings,
  Trophy,
  User,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: typeof LayoutDashboard;
  action: () => void;
}

/** Ctrl+K command palette — keyboard-first navigation. */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { status, logout } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setActive(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const commands: Command[] = [
    { id: "dash", label: "Go to Dashboard", icon: LayoutDashboard, action: () => navigate("/soc") },
    { id: "missions", label: "Go to Missions", icon: ScrollText, action: () => navigate("/soc/missions") },
    { id: "leaderboard", label: "Go to Leaderboard", icon: Trophy, action: () => navigate("/soc/leaderboard") },
    { id: "analytics", label: "Go to Analytics", icon: Activity, action: () => navigate("/soc/analytics") },
    { id: "achievements", label: "Go to Achievements", icon: Award, action: () => navigate("/soc/achievements") },
    { id: "ai", label: "Open AI Director", icon: BrainCircuit, action: () => navigate("/soc/ai") },
    { id: "profile", label: "Go to Profile", icon: User, action: () => navigate("/soc/profile") },
    { id: "demo", label: "Start Demo", icon: Play, action: () => navigate("/soc?demo=1") },
    { id: "settings", label: "Open Settings", icon: Settings, action: () => navigate("/soc/profile") },
    ...(status === "auth"
      ? [{ id: "logout", label: "Logout", icon: LogOut, action: () => void logout(true) }]
      : []),
  ];

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  const run = (cmd: Command) => {
    setOpen(false);
    cmd.action();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && filtered[active]) {
      e.preventDefault();
      run(filtered[active]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/70 p-4 pt-[15vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            className="glass-panel w-full max-w-lg overflow-hidden rounded-lg"
            initial={{ scale: 0.96, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: -8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Type a command…"
                className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                aria-label="Search commands"
              />
              <kbd className="mono rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500">ESC</kbd>
            </div>
            <ul className="max-h-72 overflow-y-auto p-2" role="listbox" aria-label="Commands">
              {filtered.length === 0 && (
                <li className="px-3 py-4 text-center text-sm text-slate-500">No commands found.</li>
              )}
              {filtered.map((cmd, i) => (
                <li key={cmd.id}>
                  <button
                    role="option"
                    aria-selected={i === active}
                    onClick={() => run(cmd)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                      i === active ? "bg-cyan-400/10 text-cyan-300" : "text-slate-300"
                    }`}
                  >
                    <cmd.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {cmd.label}
                    {cmd.hint && <span className="ml-auto text-xs text-slate-500">{cmd.hint}</span>}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500">
              <span>↑↓ navigate · ↵ select</span>
              <span className="mono">Ctrl+K to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
