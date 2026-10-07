# CYBER//BREACH — AI Network Defense Simulator

> Your network is under attack. How long can you keep it alive?

A browser-based cybersecurity / network-defense simulation game. You are a Network
Security Specialist inside a virtual Security Operations Center (SOC): monitor the
network, triage incidents, isolate hosts, tune firewall rules, and earn your rank
from **Junior Analyst → Cyber Defense Expert**.

**Portfolio project:** https://github.com/bertski-crypto

All attacks are **fictional simulations for education**. No real offensive-security
functionality exists in this codebase.

---

## Overview

- **Playable campaign (Phase 3):** 5 missions (training → brute force → malware →
  lateral-movement intrusion → multi-stage final), sequential unlocking, replays
  with personal bests — all in deterministic demo mode, no backend/AI key needed.
- **Game loop:** enter SOC → briefing → monitor → incident → investigate → decide → network
  reacts → escalation if ignored → debrief → XP/level → next mission.
- **Progression:** XP curve, 7 ranks, security ratings (S–F), 6 achievements,
  mission history, localStorage saves.

## Features

- 13-host simulated network (WAN → firewall → core router → servers / workstations / IoT)
- 10 threat types (brute force, malware, phishing, port scan, DDoS, exfiltration,
  ransomware, insider, …) across 4 severity levels
- Timed incident response with consequences for wrong/slow/ignored decisions
- Threat escalation engine: unresolved incidents advance stages, spread to adjacent
  hosts, and damage the network at severity-driven rates
- Prioritized incident queue (P1–P4), live mission objectives, S–F performance ratings
- Personal bests per mission with replayable campaign progression
- Career progression: 10-rank ladder (Junior Analyst → Cyber Defense Commander),
  event-driven XP, 5 persistent skills, 8 achievements, records, streaks,
  level-gated missions, and confirmed career reset — all local-first
- AI Game Director: performance analysis (trend, strengths, weaknesses),
  adaptive difficulty (EASY–ELITE), deterministic scenario generator with
  staged waves, 3-level hints, after-action reviews, free simulation,
  and optional external AI with validated offline fallback
- Online platform: global leaderboards (5 categories, paginated), public
  operator profiles, daily challenges (server-verified, one reward/day),
  career analytics with charts + skill radar, admin system monitor,
  production Docker image, and cloud deployment readiness
- Polish: cinematic boot sequence (skippable, once per session), Ctrl+K command
  palette, demo mode for instant employer experience, settings panel
  (sound/reduced-motion/notifications), route-level code splitting,
  polished empty/error/offline states
- Firewall rule builder with validation (port ranges, required fields)
- AI director abstraction (`src/services/ai/aiService.ts`) with deterministic
  offline fallback — game never blocks on AI availability
- Analytics (Recharts), leaderboard (demo data), player skills, mission debriefs
- WebAudio feedback (mutable), reduced-motion support, keyboard navigation, ARIA

## Gameplay

1. Open the app → **Enter the SOC**.
2. Go to **Missions** → start **Mission 01: First Response** → read the briefing → **Begin operation**.
3. Active alerts appear with a countdown. Match the response to the threat:
   - **Isolate** compromised endpoints (malware, ransomware, exfiltration)
   - **Block** external floods at the firewall (brute force, DDoS)
   - **Investigate** recon first (port scans, suspicious logins)
4. Finish all alerts → read the **mission report + AI debrief** → next mission unlocks.

## Architecture

```
src/
  types/          domain types (devices, threats, incidents, missions, player)
  game/
    data/         deterministic mock content (devices, missions, incident templates)
    systems/      pure logic (xp curve, levels, scoring, security rating)
  store/          Zustand game state (player, network, incidents, session, persistence)
  services/
    ai/           AI abstraction + offline fallback (hints, debriefs)
    storage/      localStorage save system
    audio/        WebAudio feedback (no assets)
  components/
    ui/           Button, Panel, Badge, StatCard
    layout/       TopBar, Sidebar, DashboardLayout
    network/      SVG topology map
    incidents/    IncidentCard (timers, actions, consequences)
    missions/    MissionCard
  pages/          Landing, Overview, Network, Incidents, Firewall,
                  Missions, Analytics, Leaderboard, Profile
```

Backend (`backend/`), database migrations (`database/`), and docs (`docs/`) are
scaffolded for later phases. The frontend never depends on them (demo mode).

## Technology Stack

- Frontend: React 19 + TypeScript + Vite, Tailwind CSS v4, Zustand,
  React Router, Framer Motion, Lucide icons, Recharts
- Planned: Node.js/Express API, PostgreSQL/Supabase, Docker, Vercel + Render deploy

## AI System

`generateHint()` / `generateDebrief()` call an optional endpoint configured via
`VITE_AI_ENDPOINT` + `VITE_AI_API_KEY`. When unconfigured or on any failure,
the game uses labeled deterministic fallback content (`fallbackDebrief`,
per-incident hints). AI only writes scenario text — never real attacks.

## Networking Simulation

A fixed topology with per-device `{ id, hostname, ip, type, segment, status,
health }`. Incident responses mutate device status/health; network damage derives
from average device health. States: ONLINE, OFFLINE, WARNING, COMPROMISED,
ISOLATED, UNDER_ATTACK — always shown as text + icon, never color alone.

## Security Considerations

- Simulated threats only; no scanning/exploitation/payload code paths exist.
- Frontend validates firewall input (ports 1–65535, required addresses).
- No secrets in code; AI key (if any) lives in env, never committed.
- Friendly error states; no raw API errors or blank screens.

## Installation

```bash
npm install
```

## Environment Variables

```bash
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
```

All variables are optional — the game runs in demo mode without them.

## Running Locally

```bash
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
npm run preview  # serve the production build
```

## Deployment

- Frontend → Vercel (`npm run build`, output `dist/`)
- Backend → Render, Database → Supabase/PostgreSQL (Phase 6)

---

## Full-Stack Architecture (Phase 6)

```
                    CYBER//BREACH
                          |
            +-------------+-------------+
            |                           |
   React Frontend (offline-first)   Guest / localStorage
            |  REST API                      |
            v                                v
   Node / Express backend              Cloud Save (JWT)
            |
            v
   PostgreSQL (migrations + seed)
```

The game is **offline-first**: without an account or backend it plays entirely
from localStorage (`cyberbreach.save.v1`, guest mode). Signing in enables cloud
sync; the server is authoritative for XP/levels/achievements when online, with
field-appropriate merging (unions for sets, max for progress — never blind
server-wins).

### Backend

```
backend/
  src/
    config/env.ts            validated environment
    db/client.ts             pg Pool (pg-mem emulator when TEST_DB_MEM=1)
    db/migrate.ts            migration runner (schema_migrations)
    db/seed.ts               dev-only demo account + catalogue
    middleware/              auth (Bearer), errorHandler, validation, rateLimit
    routes/                  auth, players, missions, achievements, sync, ai
    services/                authService, playerService, missionService,
                             achievementService, syncService, aiService, missionRules
    validation/schemas.ts    zod input schemas
    utils/                   logger, security (bcrypt/JWT), respond (envelope)
    app.ts / server.ts
  migrations/001_init.sql    9 tables + FKs + checks
  migrations/002_achievements.sql  catalogue rows
  tests/                     node:test suites (in-memory DB, no server needed)
```

### Database

Tables: `users`, `refresh_tokens`, `player_profiles`, `player_skills`,
`mission_attempts` (idempotent via `UNIQUE(player_id, client_key)`),
`achievements`, `player_achievements` (`UNIQUE(player_id, achievement_id)`),
`player_statistics`, `ai_sessions`, `ai_analysis` (+ `schema_migrations`).

```bash
# Development database (Docker)
docker compose up -d postgres

cd backend
npm install
npm run migrate   # reproducible schema
npm run seed      # dev demo account only (ALLOW_SEED=true, never in prod)
npm run dev       # :4000
npm test          # in-memory DB suite
```

### Authentication

- `POST /api/auth/register` (email, password, codename) → 201 + access token
- `POST /api/auth/login` → access token + httpOnly refresh cookie
- `POST /api/auth/refresh` (rotating refresh tokens) · `POST /api/auth/logout`
- `GET /api/auth/me` · bcrypt (12 rounds) · short-lived JWT (15 min)
- Password hashes never leave the server; rate-limited auth endpoints.

### API (all JSON, `{success, data}` / `{success, error{code,message}}`)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | no | status + DB connectivity |
| POST | `/api/auth/register,login,refresh,logout` | no* | session management |
| GET | `/api/auth/me` | yes | current operator |
| GET/PATCH | `/api/player/profile` | yes | profile / codename |
| GET | `/api/player/progression,skills,statistics,history` | yes | career data |
| POST | `/api/missions/:id/complete` | yes | validated result, server XP |
| GET | `/api/missions/attempts` | yes | attempt history |
| GET/POST | `/api/achievements`, `/unlock` | yes | catalogue + unlocks |
| GET/POST | `/api/sync/pull,push` | yes | merged cloud snapshot |
| POST/GET | `/api/ai/analyze,scenario,hint,debrief,history` | yes | deterministic AI + history |

Mission results are re-adjudicated server-side (score/XP bounds, mission
caps, idempotent `clientKey`, transactional updates) — the client cannot
award itself progress.

### Guest → cloud

Registering with local progress shows **LOCAL PROGRESS FOUND** with
[SYNC PROGRESS] (union merge) or [START FRESH]. Sync states
(`◉ CLOUD SYNCED / ◌ SYNCING… / ○ OFFLINE`) appear in the header and profile.

### Environment

Frontend: `VITE_API_BASE_URL` (default `http://localhost:4000/api`).
Backend: see `backend/.env.example` (`DATABASE_URL`, `JWT_SECRET`,
`JWT_REFRESH_SECRET`, `FRONTEND_URL`, `PORT`). Never commit `.env`.

## Future Improvements (phases 2–8)

- Timed auto-damage ticks + simultaneous multi-alert pressure
- Adaptive AI difficulty scaling from accuracy/response history
- Express + PostgreSQL persistence, auth, server-side leaderboard
- Sound packs, level-up cinematics, mobile map gestures

## Developer

Built by **bertski-crypto** — aspiring IT / software / networking professional.
https://github.com/bertski-crypto
