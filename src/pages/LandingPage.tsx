import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Code2,
  Database,
  Gauge,
  Network,
  Play,
  Radar,
  Server,
  Shield,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { MISSIONS } from "../game/data/mockData";
import BootSequence from "../components/game/BootSequence";

function HeroBackdrop() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-40"
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g stroke="#1e293b" strokeWidth="1">
        {[
          "100,80 300,60 520,110 700,70",
          "60,220 260,200 470,250 740,210",
          "120,380 320,340 540,400 700,350",
          "300,60 260,200 320,340",
          "520,110 470,250 540,400",
          "200,450 400,300 600,450",
        ].map((p, i) => (
          <polyline key={i} points={p} fill="none" />
        ))}
      </g>
      <g fill="#22d3ee">
        {[
          [100, 80], [300, 60], [520, 110], [700, 70],
          [60, 220], [260, 200], [470, 250], [740, 210],
          [120, 380], [320, 340], [540, 400], [700, 350],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 5 : 3} opacity={i % 4 === 0 ? 0.9 : 0.5}>
            {i % 3 === 0 && <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2.5s" repeatCount="indefinite" />}
          </circle>
        ))}
      </g>
      <g fill="none" stroke="#ef4444" strokeWidth="1.5">
        <circle cx="470" cy="250" r="10" opacity="0.8">
          <animate attributeName="r" values="8;22" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}

export default function LandingPage() {
  const [booted, setBooted] = useState(() => {
    try {
      return sessionStorage.getItem("cb-booted") === "1";
    } catch {
      return false;
    }
  });

  const finishBoot = () => {
    setBooted(true);
    try {
      sessionStorage.setItem("cb-booted", "1");
    } catch {
      /* private mode */
    }
  };

  return (
    <div className="soc-grid-bg min-h-screen bg-slate-950 text-slate-200">
      {!booted && <BootSequence onDone={finishBoot} />}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:text-cyan-300">
        Skip to content
      </a>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <span className="flex items-center gap-2 font-mono text-sm font-bold tracking-widest">
          <Radar className="h-5 w-5 text-cyan-400" aria-hidden="true" />
          CYBER<span className="text-cyan-400">//</span>BREACH
        </span>
        <nav className="flex items-center gap-2" aria-label="Primary">
          <Link to="/soc/missions" className="hidden rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 sm:inline">
            Missions
          </Link>
          <Link
            to="/soc?demo=1"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-cyan-400/40 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/10"
          >
            <Play className="h-4 w-4" aria-hidden="true" /> Play Demo
          </Link>
          <Link to="/soc" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
            Enter Operations <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <main id="main">
        {/* HERO */}
        <section className="relative overflow-hidden border-y border-slate-800/80">
          <HeroBackdrop />
          <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:py-24 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mono inline-flex items-center gap-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] tracking-widest text-red-300"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" aria-hidden="true" />
                LIVE SIMULATION · DEMO MODE · NO REAL ATTACKS
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mt-4 font-mono text-4xl leading-tight font-black tracking-tight text-white sm:text-6xl"
              >
                CYBER<span className="text-cyan-400">//</span>BREACH
              </motion.h1>
              <p className="mt-2 text-lg font-semibold text-slate-300">AI-Powered Cyber Defense Simulator</p>
              <p className="mt-1 text-sm tracking-widest text-slate-500 uppercase">Detect · Investigate · Contain · Defend</p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
                Your network is under attack. How long can you keep it alive? Monitor a virtual
                Security Operations Center, triage incidents, isolate hosts, tune the firewall —
                and earn your rank from Junior Analyst to Cyber Defense Expert.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/soc?demo=1"
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-md bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
                >
                  <Play className="h-4 w-4" aria-hidden="true" /> Play Demo
                </Link>
                <Link to="/soc" className="inline-flex min-h-[48px] items-center rounded-md border border-slate-700 px-6 py-3 font-semibold text-slate-200 hover:bg-slate-800">
                  Enter Operations
                </Link>
              </div>
              <dl className="mt-8 grid max-w-lg grid-cols-3 gap-4">
                {[
                  ["5", "Missions"],
                  ["10", "Threat types"],
                  ["14", "Network hosts"],
                ].map(([v, l]) => (
                  <div key={l} className="glass-panel rounded-md p-3 text-center">
                    <dt className="sr-only">{l}</dt>
                    <dd className="mono text-2xl font-bold text-cyan-300">{v}</dd>
                    <dd className="text-xs text-slate-400">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Terminal-style status card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-panel self-start rounded-lg p-4 font-mono text-xs leading-relaxed"
              aria-label="Simulated SOC feed preview"
            >
              <p className="flex items-center gap-2 text-slate-400">
                <Terminal className="h-4 w-4 text-cyan-400" aria-hidden="true" /> soc-feed — live
              </p>
              <div className="mt-3 space-y-2">
                <p><span className="text-emerald-300">[OK]</span> <span className="text-slate-300">fw-01 heartbeat · 12ms</span></p>
                <p><span className="text-amber-300">[WARN]</span> <span className="text-slate-300">pc-07 · 6 failed logins</span></p>
                <p><span className="text-red-300">[CRIT]</span> <span className="text-slate-300">ransomware pattern on file-01</span></p>
                <p><span className="text-cyan-300">[INFO]</span> <span className="text-slate-300">AI director adapting difficulty…</span></p>
                <p className="text-slate-500">▊ awaiting analyst action</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-xl font-bold text-white">How it works</h2>
          <p className="mt-1 text-sm text-slate-400">Built for interviews: explain networking, incident response, and AI adaptation in one demo.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Network, t: "Monitor", d: "Watch 14 hosts across WAN, DMZ, core, server, and IoT segments on a live topology map." },
              { icon: Shield, t: "Investigate", d: "Triage alerts by severity — recon gets investigated, floods get blocked, malware gets isolated." },
              { icon: Gauge, t: "Respond", d: "Beat the countdown. Every action changes network health, score, XP, and reputation." },
              { icon: BrainCircuit, t: "Adapt", d: "An AI director (with offline fallback) scales difficulty and writes your performance debrief." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="glass-panel rounded-lg p-5">
                <Icon className="h-6 w-6 text-cyan-400" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-slate-100">{t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MISSIONS */}
        <section className="mx-auto max-w-6xl px-4 pb-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Mission preview</h2>
              <p className="mt-1 text-sm text-slate-400">Five operations, from first response to a multi-stage attack.</p>
            </div>
            <Link to="/soc/missions" className="text-sm text-cyan-300 hover:underline">All missions →</Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {MISSIONS.slice(0, 3).map((m) => (
              <div key={m.id} className="glass-panel rounded-lg p-5">
                <p className="mono text-[11px] tracking-widest text-cyan-300">{m.code}</p>
                <h3 className="mt-1 font-bold text-slate-100">{m.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-400">{m.objective}</p>
                <p className="mono mt-3 text-xs text-slate-300">{"★".repeat(m.difficulty)}{"☆".repeat(5 - m.difficulty)} · +{m.xpReward} XP</p>
              </div>
            ))}
          </div>
        </section>

        {/* TECH */}
        <section className="border-y border-slate-800/80 bg-slate-900/30">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 lg:grid-cols-2">
            <div>
              <h2 className="text-xl font-bold text-white">Engineering highlights</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {[
                  "React + TypeScript + Vite, Tailwind, Zustand game state",
                  "Deterministic simulation engine — playable fully offline in demo mode",
                  "AI service abstraction with graceful fallback (no key required)",
                  "Modular architecture: engine, systems, services, store, components",
                  "Responsive + accessible: keyboard nav, ARIA, reduced-motion support",
                ].map((t) => (
                  <li key={t} className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />{t}</li>
                ))}
              </ul>
            </div>
            <div className="glass-panel rounded-lg p-5">
              <h3 className="flex items-center gap-2 font-semibold text-slate-100"><Server className="h-5 w-5 text-cyan-400" aria-hidden="true" /> Portfolio project</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Built by an aspiring IT / network-security professional to demonstrate game
                development, networking concepts, API design, and data visualization in one
                playable product. All attacks are fictional simulations for education.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href="https://github.com/bertski-crypto" target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
                  <Code2 className="h-4 w-4" aria-hidden="true" /> github.com/bertski-crypto
                </a>
                <span className="inline-flex items-center gap-2 rounded-md border border-slate-800 px-4 py-2 text-sm text-slate-400">
                  <Database className="h-4 w-4" aria-hidden="true" /> Demo mode · no login needed
                </span>
              </div>
            </div>
          </div>
        </section>

        <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-8 text-xs text-slate-500">
          <span className="font-mono">CYBER//BREACH — educational simulation. All threats fictional.</span>
          <Link to="/soc" className="text-cyan-300 hover:underline">Enter Operations →</Link>
        </footer>
      </main>
    </div>
  );
}
