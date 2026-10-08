# CYBER//BREACH — AI Network Defense Simulator

> Your network is under attack. How long can you keep it alive?

A browser-based, AI-powered cybersecurity network defense simulator. You play a Network Security Specialist inside a virtual Security Operations Center (SOC): monitor a live network, triage incidents, investigate threats, isolate compromised hosts, configure firewall rules, and earn your rank from **Junior Analyst → Cyber Defense Commander**.

All attacks are **fictional simulations for education**. No real offensive-security functionality exists anywhere in this codebase.

---

## Table of Contents

- [The Experience](#the-experience)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Database](#database)
- [API Reference](#api-reference)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [License](#license)

---

## The Experience

1. **Landing** — cinematic boot sequence, animated network backdrop, "Play Demo" for instant access.
2. **Missions** — 5-mission campaign with sequential unlocking:
   - Mission 01: First Response
   - Mission 02: Brute Force
   - Mission 03: Compromised Workstation
   - Mission 04: Network Intrusion
   - Mission 05: Multi-Stage Attack
3. **Gameplay** — a 14-host network map (Internet → Firewall → Core Router → servers/workstations/IoT) with animated traffic, attack paths, and a countdown timer. Incidents appear with severity, source IP, and attempt counts. You investigate, block sources, isolate devices, or ignore — every decision has consequences.
4. **Progression** — XP, 10 ranks, 5 persistent skills, 8 achievements, personal records, streaks.
5. **AI Director** — analyzes your real performance data, adapts difficulty (EASY–ELITE), generates scenarios with staged waves, provides 3-level hints, and writes after-action reviews.
6. **Online Layer** — global leaderboards (5 categories), public operator profiles, daily challenges (server-verified, one reward/day), career analytics with charts and skill radar, admin system monitor.

---

## Architecture

```
React 19 + TypeScript + Vite          →  Vercel
        │ REST API
Node + Express + TypeScript          →  Render
        │ pg (Pool, SSL, transactions)
PostgreSQL                           →  Supabase / Neon / Render
```

### Design Principles

- **Offline-first**: plays entirely from localStorage in demo mode. No backend, database, or AI key required.
- **Server-authoritative**: mission results are re-adjudicated server-side (score/XP bounds, idempotent `clientKey`, transactional updates). The client cannot award itself progress.
- **AI abstraction**: `DeterministicGameAI` always works; `ExternalGameAI` is opt-in via env vars with validated fallback.
- **No data loss**: local save is backed up before every cloud merge; unions for sets, max for progress.
- **Fair adaptation**: difficulty changes only at safe boundaries (briefing, waves, debrief), never mid-action.

---

## Features

### Core Gameplay

- 14-host simulated network with real-time topology visualization
- 10 threat types (brute force, malware, phishing, port scan, DDoS, exfiltration, ransomware, insider, suspicious login, unauthorized access)
- Timed incident response with countdown and escalation
- Firewall rule builder with validation
- Network health monitoring
- Event log with severity-tagged audit trail
- Pause / restart / abort mission controls

### Progression

- 10-level XP curve with 10 named ranks
- 5 persistent skills (Threat Detection, Incident Response, Network Defense, Firewall Management, Decision Making)
- 8 achievements with rarity tiers and XP rewards
- Personal records (best score, fastest response, best health, streaks)
- Mission history with ratings and debriefs

### AI Game Director

- Performance analysis from real gameplay data (trend, strengths, weaknesses)
- Adaptive difficulty engine (EASY / NORMAL / HARD / EXPERT / ELITE)
- Deterministic scenario generator with staged waves
- 3-level contextual hints (observation → direction → guidance)
- After-action review with classification, strengths, improvements
- Career advisor with training recommendations

### Online Platform

- Global leaderboards (Overall, Career, Network Defender, Rapid Response, Threat Hunter)
- Public operator profiles (non-sensitive data only)
- Daily challenges (server-verified, one reward per day)
- Career analytics (performance trend, skill radar, career timeline)
- Admin system monitor (API status, database, users, missions, uptime)

### UX Polish

- Cinematic boot sequence (skippable, once per session)
- Ctrl+K command palette
- Settings panel (sound, reduced motion, notifications)
- Polished empty / error / offline states
- Route-level code splitting
- Responsive design (mobile → desktop)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, Zustand, React Router |
| Backend | Node.js, Express 4, TypeScript |
| Database | PostgreSQL (pg driver, migrations, transactions) |
| Auth | JWT (access + rotating refresh), bcrypt-128 |
| Validation | Zod schemas |
| Security | Helmet, CORS, rate limiting, parameterized queries |
| DevOps | Docker Compose, multi-stage Dockerfile, health checks |
| Testing | node:test (12 backend tests) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL (local or cloud)

### Frontend

```bash
npm install
npm run dev        # http://localhost:5173
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT secrets
npm run migrate    # create tables
npm run seed       # optional: dev demo account
npm run dev        # http://localhost:4000
```

### Docker (PostgreSQL only)

```bash
docker compose up -d postgres
```

---

## Database

### Tables

| Table | Purpose |
|---|---|
| `users` | Authentication (email, password_hash, role) |
| `refresh_tokens` | Rotating refresh token sessions |
| `player_profiles` | Codename, level, XP, rank |
| `player_skills` | 5 skill values (0–100) |
| `mission_attempts` | Validated mission results (idempotent via `client_key`) |
| `achievements` | Static achievement catalogue |
| `player_achievements` | Unlocked achievements (unique per player) |
| `player_statistics` | Aggregated stats, bests, streaks |
| `ai_sessions` | AI training session records |
| `ai_analysis` | AI performance analysis snapshots |
| `daily_challenges` | Date-seeded challenge definitions |
| `daily_completions` | One reward per player per day |

### Migrations

```bash
npm run migrate    # idempotent, safe to run repeatedly
npm run seed       # dev-only demo account (refuses in production)
```

Migrations are numbered SQL files in `backend/migrations/`. The runner tracks applied versions in `schema_migrations`.

---

## API Reference

All responses use a consistent envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "SOME_ERROR", "message": "Human readable" } }
```

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | API + database status |

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account (email, password, codename) |
| POST | `/api/auth/login` | No | Sign in (returns access token + refresh cookie) |
| POST | `/api/auth/refresh` | No | Rotate refresh token |
| POST | `/api/auth/logout` | No | Revoke refresh token |
| GET | `/api/auth/me` | Yes | Current operator |

### Player

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/player/profile` | Yes | Profile data |
| PATCH | `/api/player/profile` | Yes | Update codename |
| GET | `/api/player/progression` | Yes | Level, XP, rank |
| GET | `/api/player/skills` | Yes | 5 skill values |
| GET | `/api/player/statistics` | Yes | Aggregated stats |
| GET | `/api/player/history` | Yes | Mission history (paginated) |

### Missions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/missions/:id/complete` | Yes | Submit result (server-validated) |
| GET | `/api/missions/attempts` | Yes | Attempt history |

### Achievements

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/achievements` | Yes | Catalogue + unlock status |
| POST | `/api/achievements/unlock` | Yes | Record unlock (idempotent) |

### Leaderboard

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/leaderboard` | No | Global rankings (paginated) |
| GET | `/api/leaderboard/category/:cat` | No | Category rankings |
| GET | `/api/leaderboard/mission/:id` | No | Per-mission rankings |
| GET | `/api/leaderboard/me` | Yes | Your positions |

### Operators

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/operators/:codename` | No | Public operator profile |

### Challenges

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/challenges/daily` | Yes | Today's challenge |
| POST | `/api/challenges/daily/complete` | Yes | Claim reward (server-verified) |

### Sync

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/sync/pull` | Yes | Cloud snapshot |
| POST | `/api/sync/push` | Yes | Upload local progress (merged) |

### AI

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/ai/analyze` | Yes | Performance analysis |
| POST | `/api/ai/scenario` | Yes | Generate training scenario |
| POST | `/api/ai/hint` | Yes | Contextual hint |
| POST | `/api/ai/debrief` | Yes | After-action review |
| GET | `/api/ai/history` | Yes | AI session history |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/system` | Admin | System status monitor |

---

## Security

- **Passwords**: bcrypt-128, never stored in plaintext, never returned by any endpoint
- **Tokens**: Short-lived JWT access tokens (15 min) + rotating refresh tokens (httpOnly, SameSite=Lax)
- **Authorization**: `requireAuth` middleware on all protected routes; `requireAdmin` checks DB role server-side
- **Validation**: Zod schemas on every endpoint; parameterized SQL queries throughout
- **Rate limiting**: Auth endpoints (30/15min), AI endpoints (20/min), general (300/min)
- **CORS**: Scoped to `FRONTEND_URL`, credentials enabled, no wildcard
- **Secrets**: Environment variables only; `.env` git-ignored; no secrets in logs or API responses
- **Health check**: Returns safe status without exposing credentials or connection strings

---

## Testing

```bash
cd backend
npm test           # 12 tests: auth, player, missions, achievements, sync, AI, security, leaderboard, challenges, admin
```

Test coverage includes:
- Registration, duplicate email, login, token validation, logout
- Profile CRUD, cross-user isolation, progression bounds
- Mission completion, server-side XP validation, idempotency
- Achievement unlock, duplicate prevention
- Sync merge, conflict resolution, cloud adoption
- AI analysis, scenario generation, fallback
- Security: unauthorized access, invalid scores, secret leakage
- Leaderboard ranking, pagination, category filtering
- Daily challenge verification, duplicate reward prevention
- Admin authorization (role-gated)

---

## Deployment

### Frontend (Vercel)

1. Import the `AI Network Defense Simulator` folder
2. Framework: Vite
3. Build: `npm run build`
4. Output: `dist`
5. Environment: `VITE_API_BASE_URL=https://your-backend.onrender.com/api`

### Backend (Render)

1. Create a Web Service
2. Root Directory: `backend`
3. Build: `npm install && npm run build`
4. Start: `npm start`
5. Health Check: `/api/health`
6. Environment variables:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Render-provided |
| `DATABASE_URL` | PostgreSQL connection string |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` |
| `JWT_SECRET` | Random 48+ char string |
| `JWT_REFRESH_SECRET` | Random 48+ char string |
| `DATABASE_SSL` | `require` (or `disable` if unsupported) |

### PostgreSQL

Supabase, Neon, or Render PostgreSQL all work. After creating the database:

```bash
npm run migrate    # create tables + indexes
npm run seed       # optional: dev demo account
```

---

## Project Structure

```
AI Network Defense Simulator/
├── src/                          # React frontend
│   ├── components/
│   │   ├── game/                 # BootSequence, CommandPalette, LevelUpModal, etc.
│   │   ├── layout/               # TopBar, Sidebar, DashboardLayout
│   │   ├── network/              # NetworkMap (SVG topology)
│   │   ├── ui/                   # Button, Panel, Badge, StatCard
│   │   └── ...
│   ├── game/
│   │   ├── ai/                   # GameDirector, providers, engines
│   │   ├── data/                 # Devices, missions, incidents, achievements
│   │   └── systems/              # XP, scoring, threat engine, objectives
│   ├── pages/                    # Landing, Overview, Missions, Leaderboard, etc.
│   ├── services/
│   │   ├── api/                  # Centralized API client
│   │   ├── audio/                # WebAudio sound system
│   │   └── sync/                 # Cloud merge logic
│   ├── store/                    # Zustand game + auth state
│   └── types/                    # Shared TypeScript types
├── backend/
│   ├── src/
│   │   ├── config/               # Environment validation
│   │   ├── db/                   # Client, migrations, seed
│   │   ├── middleware/           # Auth, admin, rate limit, error handling
│   │   ├── routes/               # Auth, player, missions, leaderboard, etc.
│   │   ├── services/             # Business logic
│   │   ├── utils/                # Logger, security, response helpers
│   │   └── validation/           # Zod schemas
│   ├── migrations/               # Numbered SQL files
│   ├── tests/                    # node:test suites
│   ├── Dockerfile                # Multi-stage production build
│   └── package.json
├── docker-compose.yml            # Local PostgreSQL
├── .env.example                  # Frontend env template
└── README.md                     # This file
```

---

## License

Educational portfolio project. All threats and attacks are fictional simulations.

---

## Contact

Built by [bertski-crypto](https://github.com/bertski-crypto) — aspiring IT / network-security professional.
