import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, TopBar } from "./Chrome";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import { useMissionReporter } from "../../hooks/useMissionReporter";
import type { NoticeTone } from "../../types/game";
import LevelUpModal from "../game/LevelUpModal";
import AchievementToast from "../game/AchievementToast";

const TONE: Record<NoticeTone, string> = {
  info: "border-cyan-400/30 bg-cyan-400/5 text-cyan-100",
  success: "border-emerald-400/30 bg-emerald-400/5 text-emerald-100",
  warning: "border-amber-400/40 bg-amber-400/10 text-amber-100",
  error: "border-red-400/40 bg-red-400/10 text-red-100",
};

const TONE_LABEL: Record<NoticeTone, string> = {
  info: "Notice",
  success: "Success",
  warning: "Warning",
  error: "Error",
};

export default function DashboardLayout() {
  const notice = useGameStore((s) => s.notice);
  const noticeTone = useGameStore((s) => s.noticeTone);
  const noticeId = useGameStore((s) => s.noticeId);
  const dismissNotice = useGameStore((s) => s.dismissNotice);
  const checkHealth = useAuthStore((s) => s.checkHealth);
  useMissionReporter();

  // Backend availability probe (offline-first: failure only sets the flag).
  useEffect(() => {
    void checkHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss toasts; the event log keeps a permanent record.
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => dismissNotice(), 6000);
    return () => window.clearTimeout(id);
  }, [notice, noticeId, dismissNotice]);

  return (
    <div className="soc-grid-bg min-h-screen bg-slate-950 text-slate-200">
      <TopBar />
      <div className="mx-auto flex max-w-7xl items-start">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 pt-5 pb-24 lg:pb-10" id="main">
          {notice && (
            <div
              role={noticeTone === "error" ? "alert" : "status"}
              className={`mb-4 flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm ${TONE[noticeTone]}`}
            >
              <p>
                <span className="mr-2 font-mono text-[11px] font-bold tracking-widest uppercase opacity-80">
                  {TONE_LABEL[noticeTone]}
                </span>
                {notice}
              </p>
              <button
                onClick={dismissNotice}
                className="shrink-0 rounded px-2 py-1 hover:bg-white/10"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
      <LevelUpModal />
      <AchievementToast />
    </div>
  );
}
