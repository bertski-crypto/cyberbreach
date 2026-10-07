import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import DashboardLayout from "./components/layout/DashboardLayout";
import CommandPalette from "./components/game/CommandPalette";
import DemoMode from "./components/game/DemoMode";

// Route-level code splitting — heavy pages load on demand
const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const NetworkPage = lazy(() => import("./pages/NetworkPage"));
const IncidentsPage = lazy(() => import("./pages/IncidentsPage"));
const FirewallPage = lazy(() => import("./pages/FirewallPage"));
const MissionsPage = lazy(() => import("./pages/MissionsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const AchievementsPage = lazy(() => import("./pages/AchievementsPage"));
const AiDirectorPage = lazy(() => import("./pages/AiDirectorPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const OperatorPage = lazy(() => import("./pages/OperatorPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading">
      <p className="mono animate-pulse text-xs tracking-widest text-slate-400">LOADING…</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CommandPalette />
      <DemoMode />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/soc" element={<DashboardLayout />}>
          <Route index element={<Suspense fallback={<PageLoader />}><OverviewPage /></Suspense>} />
          <Route path="network" element={<Suspense fallback={<PageLoader />}><NetworkPage /></Suspense>} />
          <Route path="incidents" element={<Suspense fallback={<PageLoader />}><IncidentsPage /></Suspense>} />
          <Route path="firewall" element={<Suspense fallback={<PageLoader />}><FirewallPage /></Suspense>} />
          <Route path="missions" element={<Suspense fallback={<PageLoader />}><MissionsPage /></Suspense>} />
          <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
          <Route path="achievements" element={<Suspense fallback={<PageLoader />}><AchievementsPage /></Suspense>} />
          <Route path="ai" element={<Suspense fallback={<PageLoader />}><AiDirectorPage /></Suspense>} />
          <Route path="leaderboard" element={<Suspense fallback={<PageLoader />}><LeaderboardPage /></Suspense>} />
          <Route path="operator/:codename" element={<Suspense fallback={<PageLoader />}><OperatorPage /></Suspense>} />
          <Route path="admin" element={<Suspense fallback={<PageLoader />}><AdminPage /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
