import { create } from "zustand";
import type {
  Achievement,
  DeviceStatus,
  FirewallRule,
  GameLogEntry,
  GameStatus,
  Incident,
  IncidentActionKind,
  IncidentActionResult,
  LogSeverity,
  Mission,
  MissionResult,
  NetworkDevice,
  NoticeTone,
  PerformanceRating,
  PersonalBest,
  SkillKey,
  Skills,
  ThreatLevel,
  XpBreakdownItem,
} from "../types/game";
import { ratingLabel } from "../types/game";
import {
  ACHIEVEMENT_DEFS,
  LEGACY_ACHIEVEMENT_MAP,
} from "../game/data/achievements";
import {
  CORRECT_ACTIONS,
  INCIDENT_TEMPLATES,
  INITIAL_ACHIEVEMENTS,
  INITIAL_FIREWALL_RULES,
  MISSIONS,
  SUBOPTIMAL_CONTAINMENT,
} from "../game/data/mockData";
import { INITIAL_DEVICES } from "../game/data/devices";
import { levelFromXp, networkHealth } from "../game/systems/xp";
import { POINTS, containmentPoints, missionScore, performanceRating } from "../game/systems/scoring";
import {
  betterRating,
  canUnlock,
  INITIAL_SKILLS,
  skillGain,
  XP_TABLE,
} from "../game/systems/progression";
import {
  escalationDamage,
  escalationIntervalSec,
  globalThreatLevel,
  isOpenIncident,
  priorityOf,
  responseTier,
} from "../game/systems/threatEngine";
import { objectivesSummary } from "../game/systems/objectives";
import { fallbackDebrief } from "../services/ai/aiService";
import { loadSave, persistSave } from "../services/storage/saveService";
import { sound } from "../services/audio/sound";
import type {
  DifficultyName,
  GeneratedScenario,
  PlayerSnapshot,
} from "../game/ai/aiTypes";
import { scenarioToMission } from "../game/ai/aiTypes";
import { directorHint } from "../game/ai/gameDirector";
import { HINT_BUDGET_PER_MISSION } from "../game/ai/hintEngine";
import { analyzePlayer } from "../game/ai/playerAnalyzer";

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const MISSION_ORDER = ["m1", "m2", "m3", "m4", "m5"];

export function findMission(s: { missions: Mission[]; dynamicMissions: Mission[] }, id: string | null): Mission | undefined {
  return s.missions.find((m) => m.id === id) ?? s.dynamicMissions.find((m) => m.id === id);
}

function prevMission(id: string): string {
  const i = MISSION_ORDER.indexOf(id);
  return i <= 0 ? "" : MISSION_ORDER[i - 1];
}

export function actionLabel(a: IncidentActionKind): string {
  switch (a) {
    case "ISOLATE_DEVICE":
      return "Isolate device";
    case "BLOCK_TRAFFIC":
      return "Block traffic";
    case "BLOCK_SOURCE":
      return "Block source";
    case "INVESTIGATE":
      return "Investigate";
    case "IGNORE":
      return "Ignore";
    case "RESTART_DEVICE":
      return "Restart device";
    case "ADD_FIREWALL_RULE":
      return "Add firewall rule";
  }
}

/** Infrastructure worth extra protection XP when its attack is contained. */
function isServerTarget(d: NetworkDevice | undefined): boolean {
  return !!d && (d.type === "SERVER" || d.type === "DATABASE");
}

export interface TrainingRun {
  id: string;
  title: string;
  focus: string;
  success: boolean;
  at: number;
}

export interface CareerRecords {
  bestScoreOverall: number;
  bestRating: PerformanceRating | null;
  fastestCriticalSec: number | null;
  bestHealthPct: number;
  mostContainedSingle: number;
  currentStreak: number;
  longestStreak: number;
  missionsPlayed: number;
}

const DEFAULT_RECORDS: CareerRecords = {
  bestScoreOverall: 0,
  bestRating: null,
  fastestCriticalSec: null,
  bestHealthPct: 0,
  mostContainedSingle: 0,
  currentStreak: 0,
  longestStreak: 0,
  missionsPlayed: 0,
};

interface MissionXpBuckets {
  detection: number;
  investigation: number;
  action: number;
  completion: number;
  bonus: number;
  achievement: number;
}

const EMPTY_XP: MissionXpBuckets = {
  detection: 0,
  investigation: 0,
  action: 0,
  completion: 0,
  bonus: 0,
  achievement: 0,
};

interface MissionSnapshot {
  score: number;
  xp: number;
  threatsNeutralized: number;
  incorrectDecisions: number;
  totalResponseTimeSec: number;
  responsesCount: number;
}

interface GameState {
  username: string;
  level: number;
  xp: number;
  reputation: number;
  score: number;
  completedMissionIds: string[];
  failedMissionIds: string[];
  bests: Record<string, PersonalBest>;
  skills: Skills;
  records: CareerRecords;
  totalDetected: number;
  successfulBlocks: number;
  threatsNeutralized: number;
  incorrectDecisions: number;
  totalResponseTimeSec: number;
  responsesCount: number;
  firewallRulesCreated: number;
  achievements: Achievement[];
  missionHistory: MissionResult[];
  devices: NetworkDevice[];
  incidents: Incident[];
  firewallRules: FirewallRule[];
  missions: Mission[];
  /** AI-generated training missions (kept separate from the campaign) */
  dynamicMissions: Mission[];
  /** Per-template scenario overrides for the active dynamic mission */
  scenarioOverrides: Record<string, { sourceIp?: string; wave?: number }>;
  hintsUsed: number;
  aiDifficulty: DifficultyName;
  trainingRuns: TrainingRun[];
  activeMissionId: string | null;
  missionStartedAt: number | null;
  /** Countdown state for the active mission */
  missionTimeTotal: number;
  missionTimeLeft: number;
  missionElapsedSec: number;
  missionMistakes: number;
  missionEscalations: number;
  missionUnnecessary: number;
  missionAchievements: string[];
  missionSkillGains: Partial<Record<SkillKey, number>>;
  missionXp: MissionXpBuckets;
  investigatedIds: string[];
  ignoreCounts: Record<string, number>;
  eventLog: GameLogEntry[];
  gameStatus: GameStatus;
  threatLevel: ThreatLevel;
  selectedDeviceId: string | null;
  lastResult: MissionResult | null;
  pendingLevelUp: { from: number; to: number } | null;
  lastAchievement: { id: string; at: number } | null;
  soundOn: boolean;
  demoMode: boolean;
  notice: string | null;
  noticeTone: NoticeTone;
  noticeId: number;

  setUsername: (name: string) => void;
  toggleSound: () => void;
  dismissNotice: () => void;
  dismissLevelUp: () => void;
  selectDevice: (id: string | null) => void;
  startMission: (missionId: string) => void;
  /** Launch an AI-generated adaptive scenario as a playable mission */
  startDynamicMission: (scenario: GeneratedScenario) => void;
  /** Spend one hint from the per-mission budget (null when exhausted) */
  requestHint: () => Promise<{ level: 1 | 2 | 3; text: string } | null>;
  setAiDifficulty: (tier: DifficultyName) => void;
  logDirector: (message: string) => void;
  playerSnapshot: () => PlayerSnapshot;
  restartMission: () => void;
  pauseMission: () => void;
  resumeMission: () => void;
  /** 1-second engine tick - called by useMissionTimer while PLAYING */
  tick: () => void;
  respondToIncident: (incidentId: string, action: IncidentActionKind) => IncidentActionResult;
  addFirewallRule: (rule: Omit<FirewallRule, "id" | "hits">) => void;
  toggleFirewallRule: (id: string) => void;
  isolateDevice: (deviceId: string) => void;
  completeMission: () => MissionResult | null;
  failMission: (reason: string) => MissionResult | null;
  resetWorld: () => void;
  resetCareer: () => void;
  /** Recompute campaign locks from completed missions + level (used after cloud sync). */
  refreshMissionLocks: () => void;
  persist: () => void;
}

export type ScenarioOverride = { sourceIp?: string; wave?: number };

function spawnIncidents(
  templateIds: string[],
  now: number,
  overrides: Record<string, ScenarioOverride> = {},
): Incident[] {
  return templateIds.map((tid, i) => {
    const t = INCIDENT_TEMPLATES.find((x) => x.templateId === tid);
    if (!t) throw new Error(`Unknown incident template: ${tid}`);
    const ov = overrides[tid];
    const wave = Math.max(0, ov?.wave ?? 0);
    // Fictional source rotation applies only to external-facing templates;
    // internal-origin stories (malware beacons, insider accounts) keep theirs.
    const external = /external|botnet/i.test(t.source);
    const sourceIp = ov?.sourceIp && external ? ov.sourceIp : t.sourceIp;
    return {
      ...t,
      templateId: t.templateId,
      id: uid("inc"),
      source: external && ov?.sourceIp ? `${ov.sourceIp} (external)` : t.source,
      sourceIp,
      wave,
      status: (wave > 0 ? "QUEUED" : "ACTIVE") as Incident["status"],
      escalationLevel: 0,
      createdAt: now + i * 4000,
      expiresAt: t.timeLimitSec > 0 ? now + i * 4000 + t.timeLimitSec * 1000 : null,
    };
  });
}

function pushLog(log: GameLogEntry[], message: string, sev: LogSeverity = "INFO"): GameLogEntry[] {
  return [...log, { id: uid("log"), at: Date.now(), message, sev }].slice(-60);
}

const saved = loadSave();
const savedLevel = levelFromXp(saved?.xp ?? 0);

/** Map legacy Phase 1-3 achievement progress onto the Phase 4 catalogue. */
function initialAchievements(): Achievement[] {
  const legacy = new Set(saved?.achievements ?? []);
  return INITIAL_ACHIEVEMENTS.map((a) => {
    const unlocked =
      legacy.has(a.id) || Object.entries(LEGACY_ACHIEVEMENT_MAP).some(([oldId, newId]) => newId === a.id && legacy.has(oldId));
    return { ...a, unlocked, unlockedAt: null };
  });
}

function initialMissions(): Mission[] {
  const completed = saved?.completedMissionIds ?? [];
  return MISSIONS.map((m) => {
    const check = canUnlock(m, completed, savedLevel, prevMission(m.id));
    return { ...m, locked: !check.unlocked };
  });
}

function validSkills(raw: unknown): Skills {
  const fallback = { ...INITIAL_SKILLS };
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;
  (Object.keys(fallback) as SkillKey[]).forEach((k) => {
    const v = r[k];
    fallback[k] = typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : INITIAL_SKILLS[k];
  });
  return fallback;
}

function validRecords(raw: unknown): CareerRecords {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_RECORDS };
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, fb: number) => (typeof v === "number" && Number.isFinite(v) ? v : fb);
  const rating = typeof r.bestRating === "string" ? (r.bestRating as PerformanceRating) : null;
  return {
    bestScoreOverall: num(r.bestScoreOverall, 0),
    bestRating: rating,
    fastestCriticalSec: typeof r.fastestCriticalSec === "number" ? r.fastestCriticalSec : null,
    bestHealthPct: num(r.bestHealthPct, 0),
    mostContainedSingle: num(r.mostContainedSingle, 0),
    currentStreak: num(r.currentStreak, 0),
    longestStreak: num(r.longestStreak, 0),
    missionsPlayed: num(r.missionsPlayed, 0),
  };
}

export const useGameStore = create<GameState>()((set, get) => {
  const notify = (notice: string, noticeTone: NoticeTone) =>
    set((s) => ({ notice, noticeTone, noticeId: s.noticeId + 1 }));

  const playSound = (kind: "xp" | "achievement" | "levelup" | "success" | "fail" | "alert" | "click") => {
    try {
      if (!get().soundOn) return;
      sound[kind]();
    } catch { /* best-effort */ }
  };

  const refreshThreat = () => {
    const s = get();
    const open = s.incidents.filter(isOpenIncident);
    const openCrit = open.filter((i) => i.severity === "CRITICAL").length;
    const ignored = Object.values(s.ignoreCounts).reduce((a, b) => a + b, 0);
    const escalationTotal = open.reduce((a, i) => a + (i.escalationLevel ?? 0), 0);
    const health = networkHealth(s.devices.map((d) => d.health));
    set({
      threatLevel: globalThreatLevel({
        openCritical: openCrit,
        openTotal: open.length,
        ignoredTotal: ignored,
        escalationTotal,
        networkHealth: health,
      }),
    });
  };

  const maybeFinish = () => {
    const s = get();
    if (s.incidents.some((i) => i.status === "QUEUED")) return;
    if (s.activeMissionId && s.incidents.filter(isOpenIncident).length === 0) {
      setTimeout(() => get().completeMission(), 600);
    }
  };

  const damageDevice = (deviceId: string, amount: number): NetworkDevice[] => {
    return get().devices.map((d) => {
      if (d.id !== deviceId) return d;
      const health = Math.max(8, d.health - amount);
      const status: DeviceStatus =
        d.status === "ISOLATED" ? d.status : health <= 25 ? "COMPROMISED" : "UNDER_ATTACK";
      return { ...d, health, status };
    });
  };

  /**
   * Central XP faucet. Every meaningful decision flows through here exactly
   * once per game event (status transitions make re-awards impossible),
   * and level-ups are detected in one place.
   */
  const awardXp = (amount: number, bucket: keyof MissionXpBuckets) => {
    if (amount <= 0) return;
    const s = get();
    const xp = s.xp + Math.floor(amount);
    const level = levelFromXp(xp);
    const leveled = level > s.level;
    set((prev) => ({
      xp,
      level,
      missionXp: { ...prev.missionXp, [bucket]: prev.missionXp[bucket] + Math.floor(amount) },
      pendingLevelUp: leveled ? { from: prev.level, to: level } : prev.pendingLevelUp,
    }));
    if (leveled) playSound("levelup");
    else playSound("xp");
  };

  const addSkill = (key: SkillKey, base: number) => {
    const s = get();
    const gained = skillGain(s.skills[key], base);
    set((prev) => ({
      skills: { ...prev.skills, [key]: Math.min(100, prev.skills[key] + gained) },
      missionSkillGains: {
        ...prev.missionSkillGains,
        [key]: (prev.missionSkillGains[key] ?? 0) + gained,
      },
    }));
  };

  const grantAchievement = (id: string) => {
    const s = get();
    const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
    const entry = s.achievements.find((a) => a.id === id);
    if (!def || !entry || entry.unlocked) return;
    set((prev) => ({
      achievements: prev.achievements.map((a) =>
        a.id === id ? { ...a, unlocked: true, unlockedAt: Date.now() } : a,
      ),
      lastAchievement: { id, at: Date.now() },
      missionAchievements: prev.missionAchievements.includes(id)
        ? prev.missionAchievements
        : [...prev.missionAchievements, id],
      eventLog: pushLog(prev.eventLog, `Achievement unlocked: ${def.name} (+${def.xpReward} XP).`, "SUCCESS"),
    }));
    awardXp(def.xpReward, "achievement");
    notify(`Achievement unlocked: ${def.name} - ${def.description} (+${def.xpReward} XP).`, "success");
    playSound("achievement");
  };

  return {
    username: saved?.username ?? "NEXUS",
    level: savedLevel,
    xp: Math.max(0, Math.floor(saved?.xp ?? 0)),
    reputation: saved?.reputation ?? 50,
    score: saved?.score ?? 0,
    completedMissionIds: saved?.completedMissionIds ?? [],
    failedMissionIds: [],
    bests: saved?.bests ?? {},
    skills: validSkills(saved?.skills),
    records: validRecords(saved?.records),
    totalDetected: saved?.totalDetected ?? 0,
    successfulBlocks: saved?.successfulBlocks ?? 0,
    threatsNeutralized: saved?.stats.threatsNeutralized ?? 0,
    incorrectDecisions: saved?.stats.incorrectDecisions ?? 0,
    totalResponseTimeSec: saved?.stats.totalResponseTimeSec ?? 0,
    responsesCount: saved?.stats.responsesCount ?? 0,
    firewallRulesCreated: saved?.stats.firewallRulesCreated ?? 0,
    achievements: initialAchievements(),
    missionHistory: [],
    devices: INITIAL_DEVICES,
    incidents: [],
    firewallRules: INITIAL_FIREWALL_RULES,
    missions: initialMissions(),
    dynamicMissions: [],
    scenarioOverrides: {},
    hintsUsed: 0,
    aiDifficulty: (saved?.aiDifficulty as DifficultyName | undefined) ?? "NORMAL",
    trainingRuns: Array.isArray(saved?.trainingRuns) ? saved.trainingRuns : [],
    activeMissionId: null,
    missionStartedAt: null,
    missionTimeTotal: 0,
    missionTimeLeft: 0,
    missionElapsedSec: 0,
    missionMistakes: 0,
    missionEscalations: 0,
    missionUnnecessary: 0,
    missionAchievements: [],
    missionSkillGains: {},
    missionXp: { ...EMPTY_XP },
    investigatedIds: [],
    ignoreCounts: {},
    eventLog: [],
    gameStatus: "MENU",
    threatLevel: "LOW",
    selectedDeviceId: null,
    lastResult: null,
    pendingLevelUp: null,
    lastAchievement: null,
    soundOn: saved?.soundOn ?? true,
    demoMode: true,
    notice: null,
    noticeTone: "info",
    noticeId: 0,

    setUsername: (name) => {
      const username = name.trim().slice(0, 24) || "NEXUS";
      set({ username });
      get().persist();
    },

    toggleSound: () => {
      set((s) => ({ soundOn: !s.soundOn }));
      get().persist();
    },

    dismissNotice: () => set({ notice: null }),

    dismissLevelUp: () => set({ pendingLevelUp: null }),

    refreshMissionLocks: () => {
      const s = get();
      set({
        missions: MISSIONS.map((m) => {
          const keep = s.missions.find((x) => x.id === m.id);
          const check = canUnlock(m, s.completedMissionIds, s.level, prevMission(m.id));
          return { ...(keep ?? m), locked: !check.unlocked };
        }),
      });
      get().persist();
    },

    setAiDifficulty: (tier) => {
      set({ aiDifficulty: tier });
      get().persist();
    },

    selectDevice: (id) => set({ selectedDeviceId: id }),

    startMission: (missionId) => {
      const mission =
        get().missions.find((m) => m.id === missionId) ??
        get().dynamicMissions.find((m) => m.id === missionId);
      if (!mission || mission.locked) return;
      const now = Date.now();
      const incidents = spawnIncidents(mission.incidentIds, now, get().scenarioOverrides);
      const targeted = new Set(incidents.map((i) => i.targetDeviceId));
      const devices = INITIAL_DEVICES.map((d) => {
        if (!targeted.has(d.id)) return { ...d };
        const sev = incidents.find((i) => i.targetDeviceId === d.id)?.severity;
        const status: DeviceStatus = sev === "CRITICAL" ? "UNDER_ATTACK" : "WARNING";
        return { ...d, status, health: sev === "CRITICAL" ? 62 : 82 };
      });
      let eventLog = pushLog([], `${mission.code} started - ${mission.title}.`, "INFO");
      for (const i of incidents) {
        eventLog = pushLog(
          eventLog,
          i.status === "QUEUED"
            ? `Staged threat queued: ${i.title} (wave ${(i.wave ?? 0) + 1}) - activates as earlier waves resolve.`
            : `Alert: ${i.title} on ${i.targetHostname} [${i.severity}].`,
          i.status === "QUEUED" ? "INFO" : i.severity === "CRITICAL" ? "ERROR" : "HIGH",
        );
      }
      const detected = get().totalDetected + incidents.length;
      set({
        activeMissionId: missionId,
        missionStartedAt: now,
        missionTimeTotal: mission.timeLimitSec,
        missionTimeLeft: mission.timeLimitSec,
        missionElapsedSec: 0,
        missionMistakes: 0,
        missionEscalations: 0,
        missionUnnecessary: 0,
        missionAchievements: [],
        missionSkillGains: {},
        missionXp: { ...EMPTY_XP },
        investigatedIds: [],
        ignoreCounts: {},
        eventLog,
        gameStatus: "BRIEFING",
        incidents,
        devices,
        selectedDeviceId: null,
        lastResult: null,
        totalDetected: detected,
        hintsUsed: 0,
        records: { ...get().records, missionsPlayed: get().records.missionsPlayed + 1 },
      });
      // Detection XP - one event per spawned threat, never re-awarded.
      awardXp(incidents.length * XP_TABLE.THREAT_DETECTED, "detection");
      if (detected >= 10) grantAchievement("threat-hunter");
      refreshThreat();
      const crit = incidents.filter((i) => i.severity === "CRITICAL").length;
      if (crit > 0) {
        notify(`CRITICAL INCIDENT: ${crit} critical alert${crit > 1 ? "s" : ""} require immediate triage.`, "error");
      }
      const s = get();
      (get as unknown as { _snapshot?: MissionSnapshot })._snapshot = {
        score: s.score,
        xp: s.xp,
        threatsNeutralized: s.threatsNeutralized,
        incorrectDecisions: s.incorrectDecisions,
        totalResponseTimeSec: s.totalResponseTimeSec,
        responsesCount: s.responsesCount,
      };
    },

    playerSnapshot: () => {
      const s = get();
      return {
        skills: { ...s.skills },
        missionHistory: s.missionHistory.map((m) => ({
          missionId: m.missionId,
          success: m.success,
          score: m.score,
          accuracy: m.accuracy,
          avgResponseTimeSec: m.avgResponseTimeSec,
          networkHealthPct: m.networkHealthPct,
          threatsNeutralized: m.threatsNeutralized,
          incorrectDecisions: m.incorrectDecisions,
          completedAt: m.completedAt,
        })),
        totalDetected: s.totalDetected,
        successfulBlocks: s.successfulBlocks,
        incorrectDecisions: s.incorrectDecisions,
        responsesCount: s.responsesCount,
        totalResponseTimeSec: s.totalResponseTimeSec,
        firewallRulesCreated: s.firewallRulesCreated,
        level: s.level,
      };
    },

    logDirector: (message) => {
      set((s) => ({ eventLog: pushLog(s.eventLog, message, "INFO") }));
    },

    startDynamicMission: (scenario) => {
      const mission: Mission = {
        ...scenarioToMission(scenario),
        aiBriefing: {
          assessment: "",
          focus: scenario.trainingFocus,
          why: scenario.why,
          provider: scenario.provider,
          difficultyName: scenario.threatLevel,
        },
      };
      const overrides: Record<string, ScenarioOverride> = {};
      for (const t of scenario.threats) {
        overrides[t.templateId] = { sourceIp: t.sourceIp, wave: t.wave ?? 0 };
      }
      set((s) => ({
        dynamicMissions: [mission, ...s.dynamicMissions.filter((m) => m.id !== mission.id)].slice(0, 10),
        scenarioOverrides: overrides,
      }));
      get().logDirector(
        `AI DIRECTOR scenario ready: "${scenario.title}" (${scenario.threats.length} threat(s), ${scenario.stages.length} stage(s), provider ${scenario.provider}).`,
      );
      get().startMission(mission.id);
      get().persist();
    },

    requestHint: async () => {
      const s = get();
      if (!s.activeMissionId || (s.gameStatus !== "PLAYING" && s.gameStatus !== "PAUSED")) return null;
      if (s.hintsUsed >= HINT_BUDGET_PER_MISSION) {
        notify("Hint budget exhausted for this mission (3 per operation).", "warning");
        return null;
      }
      const open = s.incidents.filter(isOpenIncident);
      if (open.length === 0) return null;
      const target = [...open].sort((a, b) => priorityOf(a) - priorityOf(b))[0];
      const analysis = analyzePlayer(s.playerSnapshot());
      const hint = await directorHint({
        incidentTitle: target.title,
        threatType: target.threatType,
        severity: target.severity,
        targetHostname: target.targetHostname,
        sourceIp: target.sourceIp,
        investigated: s.investigatedIds.includes(target.id),
        escalationLevel: target.escalationLevel ?? 0,
        hintsUsed: s.hintsUsed,
        weakestSkill: analysis.weakestSkill,
      });
      const logMsg = "AI hint (Lv" + hint.level + ") issued for " + target.targetHostname + ".";
      set((prev) => ({
        hintsUsed: prev.hintsUsed + 1,
        eventLog: pushLog(prev.eventLog, logMsg, "INFO"),
      }));
      get().persist();
      return { level: hint.level, text: hint.text };
    },

    restartMission: () => {
      const s = get();
      const mission = findMission(s, s.activeMissionId);
      if (!mission) return;
      const snap = (get as unknown as { _snapshot?: MissionSnapshot })._snapshot;
      const now = Date.now();
      const incidents = spawnIncidents(mission.incidentIds, now, get().scenarioOverrides);
      const targeted = new Set(incidents.map((i) => i.targetDeviceId));
      const devices = INITIAL_DEVICES.map((d) => {
        if (!targeted.has(d.id)) return { ...d };
        const sev = incidents.find((i) => i.targetDeviceId === d.id)?.severity;
        const status: DeviceStatus = sev === "CRITICAL" ? "UNDER_ATTACK" : "WARNING";
        return { ...d, status, health: sev === "CRITICAL" ? 62 : 82 };
      });
      set({
        missionStartedAt: now,
        missionTimeTotal: mission.timeLimitSec,
        missionTimeLeft: mission.timeLimitSec,
        missionElapsedSec: 0,
        missionMistakes: 0,
        missionEscalations: 0,
        missionUnnecessary: 0,
        missionAchievements: [],
        missionSkillGains: {},
        missionXp: { ...EMPTY_XP },
        investigatedIds: [],
        ignoreCounts: {},
        hintsUsed: 0,
        eventLog: pushLog([], `${mission.code} restarted - timer, threats, network, and objectives reset.`, "INFO"),
        gameStatus: "PLAYING",
        incidents,
        devices,
        selectedDeviceId: null,
        lastResult: null,
        score: snap?.score ?? s.score,
        xp: snap?.xp ?? s.xp,
        threatsNeutralized: snap?.threatsNeutralized ?? s.threatsNeutralized,
        incorrectDecisions: snap?.incorrectDecisions ?? s.incorrectDecisions,
        totalResponseTimeSec: snap?.totalResponseTimeSec ?? s.totalResponseTimeSec,
        responsesCount: snap?.responsesCount ?? s.responsesCount,
      });
      refreshThreat();
      notify("Mission restarted - fresh timer, fresh network.", "info");
      get().persist();
    },

    pauseMission: () => {
      if (get().gameStatus === "PLAYING") set({ gameStatus: "PAUSED" });
    },

    resumeMission: () => {
      const st = get().gameStatus;
      if (st === "PAUSED" || st === "BRIEFING") set({ gameStatus: "PLAYING" });
    },

    tick: () => {
      const s = get();
      if (s.gameStatus !== "PLAYING" || !s.activeMissionId) return;
      const mission =
        s.missions.find((m) => m.id === s.activeMissionId) ??
        s.dynamicMissions.find((m) => m.id === s.activeMissionId);
      const elapsed = s.missionElapsedSec + 1;
      const left = Math.max(0, s.missionTimeLeft - 1);
      set({ missionElapsedSec: elapsed, missionTimeLeft: left });
      if (left <= 0) {
        get().failMission("Time expired - the attacker operated unchecked for too long.");
        return;
      }
      // Staged wave release: the next wave goes live when all earlier waves
      // are resolved - or on its own after 40s per wave if ignored.
      const queued = get().incidents.filter((i) => i.status === "QUEUED");
      if (queued.length > 0) {
        const nextWave = Math.min(...queued.map((i) => i.wave ?? 1));
        const earlierOpen = get().incidents.some(
          (i) => isOpenIncident(i) && (i.wave ?? 0) < nextWave,
        );
        if (!earlierOpen || elapsed >= 40 * nextWave) {
          const now = Date.now();
          const released = queued.filter((i) => (i.wave ?? 1) === nextWave);
          set((prev) => ({
            incidents: prev.incidents.map((i) =>
              released.some((r) => r.id === i.id)
                ? { ...i, status: "ACTIVE" as const, createdAt: now }
                : i,
            ),
            eventLog: pushLog(
              prev.eventLog,
              `Stage ${nextWave + 1} inbound: ${released.map((r) => r.title).join("; ")}.`,
              "ERROR",
            ),
          }));
          refreshThreat();
          notify(`New stage inbound - ${released.length} additional threat(s) now live.`, "error");
          playSound("alert");
        }
      }
      const interval = escalationIntervalSec(mission?.difficulty ?? 1);
      if (elapsed % interval !== 0) return;

      // Threat escalation tick: every open incident advances one stage.
      const cur = get();
      let devices = cur.devices;
      let eventLog = cur.eventLog;
      let escalations = cur.missionEscalations;
      let failReason: string | null = null;
      let loudest = "";
      let loudestLevel = 0;
      const incidents = cur.incidents.map((i) => {
        if (!isOpenIncident(i)) return i;
        return { ...i, escalationLevel: Math.min(POINTS.MAX_ESCALATION_LEVEL, (i.escalationLevel ?? 0) + 1) };
      });
      for (const i of incidents) {
        if (!isOpenIncident(i) || (i.escalationLevel ?? 0) === 0) continue;
        const dmg = escalationDamage(i.severity, i.escalationLevel);
        const target = devices.find((d) => d.id === i.targetDeviceId);
        if (target) {
          const health = Math.max(8, target.health - dmg);
          const status: DeviceStatus =
            target.status === "ISOLATED"
              ? target.status
              : health <= 25
                ? "COMPROMISED"
                : target.status === "ONLINE"
                  ? "UNDER_ATTACK"
                  : target.status;
          devices = devices.map((d) => (d.id === target.id ? { ...d, health, status } : d));
          if (health <= 25) {
            failReason = `${i.targetHostname} was fully compromised at escalation level ${i.escalationLevel}.`;
          }
        }
        // Stage 3+: the attack visibly spreads to an adjacent healthy host.
        if (i.escalationLevel >= 3) {
          const neighbor = devices.find(
            (d) =>
              d.id !== i.targetDeviceId &&
              d.status === "ONLINE" &&
              d.type !== "INTERNET" &&
              d.type !== "FIREWALL" &&
              d.type !== "ROUTER",
          );
          if (neighbor) {
            devices = devices.map((d) =>
              d.id === neighbor.id
                ? { ...d, health: Math.max(8, d.health - 4), status: "WARNING" as DeviceStatus }
                : d,
            );
            eventLog = pushLog(eventLog, `Spreading: ${i.title} affecting adjacent system ${neighbor.hostname}.`, "HIGH");
          }
        }
        if (i.escalationLevel >= POINTS.MAX_ESCALATION_LEVEL) {
          failReason = `Critical incident - ${i.title} reached maximum escalation.`;
        }
        escalations += 1;
        eventLog = pushLog(
          eventLog,
          `Escalation Lv${i.escalationLevel}: ${i.title} on ${i.targetHostname} [${i.severity}] - damage spreading.`,
          i.severity === "CRITICAL" ? "ERROR" : "WARN",
        );
        if (i.escalationLevel > loudestLevel) {
          loudestLevel = i.escalationLevel;
          loudest = i.title;
        }
      }
      set({ incidents, devices, missionEscalations: escalations, eventLog });
      refreshThreat();
      if (failReason) {
        get().failMission(failReason);
        return;
      }
      if (loudest) {
        notify(`Threat escalation (Lv${loudestLevel}): ${loudest} - respond before it spreads further.`, "warning");
        playSound("alert");
      }
    },

    respondToIncident: (incidentId, action) => {
      const s = get();
      const incident = s.incidents.find((i) => i.id === incidentId);
      if (!incident || !isOpenIncident(incident)) {
        return {
          success: false,
          message: "Incident is no longer active.",
          xpAwarded: 0,
          scoreDelta: 0,
          correct: false,
        };
      }
      const templateKey = incident.templateId ?? "";
      const responseSec = Math.max(0.5, (Date.now() - incident.createdAt) / 1000);

      // ---------- INVESTIGATE: intel only, costs time, never contains ----------
      if (action === "INVESTIGATE") {
        if (s.investigatedIds.includes(incidentId)) {
          const message = "Already investigated - no new intel. Contain the threat.";
          notify(message, "info");
          return { success: true, message, xpAwarded: 0, scoreDelta: 0, correct: true };
        }
        const timeLeft = Math.max(0, s.missionTimeLeft - POINTS.INVESTIGATE_TIME_COST_SEC);
        const incidents = s.incidents.map((i) =>
          i.id === incidentId ? { ...i, status: "INVESTIGATING" as const } : i,
        );
        set({
          incidents,
          investigatedIds: [...s.investigatedIds, incidentId],
          score: s.score + POINTS.INVESTIGATE,
          missionTimeLeft: timeLeft,
          eventLog: pushLog(
            pushLog(s.eventLog, `Investigation started on ${incident.targetHostname}.`, "INFO"),
            `Intel: ${incident.attempts ? `${incident.attempts} attempts` : "anomalous activity"} from ${incident.sourceIp}. Recommendation: ${incident.hint}`,
            "SUCCESS",
          ),
        });
        awardXp(XP_TABLE.THREAT_INVESTIGATED, "investigation");
        addSkill("threatDetection", 2);
        refreshThreat();
        const message = `Investigation complete (+${POINTS.INVESTIGATE} pts, +${XP_TABLE.THREAT_INVESTIGATED} XP, -${POINTS.INVESTIGATE_TIME_COST_SEC}s). Recommendation: ${incident.hint}`;
        notify(message, "info");
        playSound("click");
        get().persist();
        return { success: true, message, xpAwarded: XP_TABLE.THREAT_INVESTIGATED, scoreDelta: POINTS.INVESTIGATE, correct: true };
      }

      // ---------- IGNORE: threat continues, escalates immediately ----------
      if (action === "IGNORE") {
        const count = (s.ignoreCounts[incidentId] ?? 0) + 1;
        const ignoreCounts = { ...s.ignoreCounts, [incidentId]: count };
        const devices = damageDevice(incident.targetDeviceId, POINTS.IGNORE_HEALTH_COST);
        const target = devices.find((d) => d.id === incident.targetDeviceId);
        const incidents = s.incidents.map((i) =>
          i.id === incidentId
            ? { ...i, escalationLevel: Math.min(POINTS.MAX_ESCALATION_LEVEL, (i.escalationLevel ?? 0) + 1) }
            : i,
        );
        const escalated = incidents.find((i) => i.id === incidentId)?.escalationLevel ?? 0;
        set({
          ignoreCounts,
          devices,
          incidents,
          missionEscalations: s.missionEscalations + 1,
          score: Math.max(0, s.score + POINTS.IGNORE_THREAT),
          reputation: Math.max(0, s.reputation - 4),
          incorrectDecisions: s.incorrectDecisions + 1,
          missionMistakes: s.missionMistakes + 1,
          eventLog: pushLog(s.eventLog, `WARNING: ${incident.title} ignored (${count}x) - still active, escalated to Lv${escalated}.`, "WARN"),
        });
        refreshThreat();
        playSound("alert");
        if (count >= POINTS.IGNORE_ESCALATION_LIMIT) {
          notify("Threat ignored too many times - it spread beyond containment.", "error");
          get().failMission("The ignored threat spread network-wide.");
          return { success: false, message: "Ignored too many times.", xpAwarded: 0, scoreDelta: POINTS.IGNORE_THREAT, correct: false };
        }
        if ((target?.health ?? 100) <= 25) {
          notify(`${incident.targetHostname} was fully compromised.`, "error");
          get().failMission(`${incident.targetHostname} was fully compromised while the alert was ignored.`);
          return { success: false, message: "Target compromised.", xpAwarded: 0, scoreDelta: POINTS.IGNORE_THREAT, correct: false };
        }
        const message = `WARNING: the suspicious activity remains active (${POINTS.IGNORE_THREAT} pts, network -${POINTS.IGNORE_HEALTH_COST}% on ${incident.targetHostname}).`;
        notify(message, "warning");
        get().persist();
        return { success: false, message, xpAwarded: 0, scoreDelta: POINTS.IGNORE_THREAT, correct: false };
      }

      // ---------- CONTAINMENT ----------
      const containmentSet = CORRECT_ACTIONS[templateKey] ?? [];
      const suboptimalSet = SUBOPTIMAL_CONTAINMENT[templateKey] ?? [];
      const contains = containmentSet.includes(action) || action === "ISOLATE_DEVICE";

      if (contains) {
        const suboptimal = !containmentSet.includes(action) || suboptimalSet.includes(action);
        const gained = containmentPoints(suboptimal, responseSec);
        const isBlock = action === "BLOCK_SOURCE" || action === "BLOCK_TRAFFIC" || action === "ADD_FIREWALL_RULE";
        const isIsolate = action === "ISOLATE_DEVICE";
        const incidents = s.incidents.map((i) =>
          i.id === incidentId ? { ...i, status: "CONTAINED" as const } : i,
        );
        const dev = s.devices.find((d) => d.id === incident.targetDeviceId);
        const serverBonus = isServerTarget(dev);
        // BLOCK_* applies a live firewall rule against the attacker.
        let firewallRules = s.firewallRules;
        let firewallRulesCreated = s.firewallRulesCreated;
        let successfulBlocks = s.successfulBlocks;
        let ruleMsg = "";
        if (action === "BLOCK_SOURCE") {
          const targetIp = dev?.ip ?? incident.targetHostname;
          firewallRules = [
            ...s.firewallRules,
            {
              id: uid("rule"),
              source: incident.sourceIp,
              destination: targetIp,
              port: 0,
              protocol: "TCP" as const,
              action: "BLOCK" as const,
              enabled: true,
              hits: 0,
            },
          ];
          firewallRulesCreated += 1;
          successfulBlocks += 1;
          ruleMsg = ` Firewall rule applied: BLOCK TCP from ${incident.sourceIp}. Attack traffic stopped.`;
        } else if (action === "BLOCK_TRAFFIC") {
          successfulBlocks += 1;
        }
        const neutralized = s.threatsNeutralized + 1;

        const containedDevices = get().devices.map((d) =>
          d.id === incident.targetDeviceId
            ? {
                ...d,
                status: (isIsolate ? "ISOLATED" : "ONLINE") as DeviceStatus,
                health: Math.min(
                  100,
                  (d.health ?? 80) + 18 - (suboptimal && isIsolate ? POINTS.ISOLATE_HEALTH_COST : 0),
                ),
              }
            : d,
        );
        // Career records: fastest critical containment.
        const records = { ...s.records };
        if (incident.severity === "CRITICAL") {
          if (records.fastestCriticalSec === null || responseSec < records.fastestCriticalSec) {
            records.fastestCriticalSec = Math.round(responseSec * 10) / 10;
          }
        }
        set({
          incidents,
          devices: containedDevices,
          firewallRules,
          firewallRulesCreated,
          successfulBlocks,
          records,
          threatsNeutralized: neutralized,
          totalResponseTimeSec: s.totalResponseTimeSec + responseSec,
          responsesCount: s.responsesCount + 1,
          score: s.score + gained,
          reputation: Math.min(100, s.reputation + 2),
          eventLog: suboptimal
            ? pushLog(
                pushLog(s.eventLog, `${incident.targetHostname} isolated - host offline, threat contained with operational cost.`, "WARN"),
                `Contained (${actionLabel(action)}, suboptimal +${gained}).`,
                "SUCCESS",
              )
            : pushLog(s.eventLog, `Threat contained via ${actionLabel(action)} (+${gained}).${ruleMsg}`, "SUCCESS"),
        });
        // Meaningful-decision XP: response + containment + technique + server bonus.
        awardXp(XP_TABLE.CORRECT_RESPONSE, "action");
        awardXp(XP_TABLE.THREAT_CONTAINED, "action");
        if (isBlock) {
          awardXp(XP_TABLE.SOURCE_BLOCKED, "action");
          addSkill("firewallManagement", 3);
        }
        if (isIsolate) {
          awardXp(XP_TABLE.DEVICE_ISOLATED, "action");
          addSkill("incidentResponse", 2);
        } else {
          addSkill("incidentResponse", 3);
        }
        if (serverBonus) {
          awardXp(XP_TABLE.SERVER_PROTECTED, "action");
          addSkill("networkDefense", 3);
        }
        if (responseSec < POINTS.FAST_RESPONSE_WINDOW_SEC) {
          addSkill("decisionMaking", 2);
        }
        if (neutralized === 1) grantAchievement("first-response");
        if (successfulBlocks >= 10) grantAchievement("firewall-master");
        if (incident.severity === "CRITICAL" && responseSec < 10) {
          grantAchievement("lightning");
        }
        refreshThreat();
        const message = suboptimal
          ? `Contained by isolation (+${gained} pts) - valid, but ${incident.targetHostname} is offline (-${POINTS.ISOLATE_HEALTH_COST}% availability). Blocking the source would have been optimal.`
          : `Threat successfully contained (+${gained} pts).${ruleMsg}`;
        notify(message, "success");
        playSound("success");
        maybeFinish();
        get().persist();
        return { success: true, message, xpAwarded: XP_TABLE.CORRECT_RESPONSE + XP_TABLE.THREAT_CONTAINED, scoreDelta: gained, correct: true };
      }

      // ---------- WRONG ACTION ----------
      const devices = damageDevice(incident.targetDeviceId, POINTS.WRONG_HEALTH_COST);
      const target = devices.find((d) => d.id === incident.targetDeviceId);
      set({
        devices,
        score: Math.max(0, s.score + POINTS.WRONG_ACTION),
        reputation: Math.max(0, s.reputation - 2),
        incorrectDecisions: s.incorrectDecisions + 1,
        missionMistakes: s.missionMistakes + 1,
        totalResponseTimeSec: s.totalResponseTimeSec + responseSec,
        responsesCount: s.responsesCount + 1,
        eventLog: pushLog(s.eventLog, `Incorrect response (${actionLabel(action)}) on ${incident.targetHostname} - no effect, damage spreading.`, "ERROR"),
      });
      refreshThreat();
      playSound("fail");
      if ((target?.health ?? 100) <= 25) {
        notify(`${incident.targetHostname} was fully compromised.`, "error");
        get().failMission(`${incident.targetHostname} was fully compromised.`);
        return { success: false, message: "Target compromised.", xpAwarded: 0, scoreDelta: POINTS.WRONG_ACTION, correct: false };
      }
      const message = `Incorrect response (${POINTS.WRONG_ACTION} pts). ${actionLabel(action)} had no effect on "${incident.title}".`;
      notify(message, "error");
      get().persist();
      return { success: false, message, xpAwarded: 0, scoreDelta: POINTS.WRONG_ACTION, correct: false };
    },

    addFirewallRule: (rule) => {
      const s = get();
      const nr: FirewallRule = { ...rule, id: uid("rule"), hits: 0 };
      set({
        firewallRules: [...s.firewallRules, nr],
        firewallRulesCreated: s.firewallRulesCreated + 1,
        score: s.score + 50,
        eventLog: pushLog(s.eventLog, `Firewall rule added: ${nr.action} ${nr.protocol}/${nr.port === 0 ? "ALL" : nr.port} from ${nr.source}.`, "SUCCESS"),
      });
      awardXp(15, "action");
      notify(`Firewall rule added: ${nr.action} ${nr.protocol}/${nr.port === 0 ? "ALL" : nr.port} from ${nr.source}. +15 XP.`, "success");
      get().persist();
    },

    toggleFirewallRule: (id) =>
      set((s) => ({
        firewallRules: s.firewallRules.map((r) =>
          r.id === id ? { ...r, enabled: !r.enabled } : r,
        ),
      })),

    isolateDevice: (deviceId) => {
      const s = get();
      const dev = s.devices.find((d) => d.id === deviceId);
      const relevant = s.incidents.some(
        (i) => isOpenIncident(i) && i.targetDeviceId === deviceId,
      );
      const unnecessary = !!dev && dev.status === "ONLINE" && !relevant;
      const inMission = !!s.activeMissionId && (s.gameStatus === "PLAYING" || s.gameStatus === "PAUSED");
      set((prev) => ({
        devices: prev.devices.map((d) =>
          d.id === deviceId ? { ...d, status: "ISOLATED" as const } : d,
        ),
        score: unnecessary ? Math.max(0, prev.score + POINTS.UNNECESSARY_ISOLATION) : prev.score,
        missionUnnecessary: unnecessary && inMission ? prev.missionUnnecessary + 1 : prev.missionUnnecessary,
        eventLog: pushLog(
          prev.eventLog,
          unnecessary
            ? `${deviceId} isolated with no active threat - unnecessary outage (${POINTS.UNNECESSARY_ISOLATION} pts).`
            : `${deviceId} manually isolated from the network.`,
          unnecessary ? "WARN" : "INFO",
        ),
      }));
      notify(
        unnecessary
          ? `Unnecessary isolation: ${deviceId} had no active threat (${POINTS.UNNECESSARY_ISOLATION} pts).`
          : `${deviceId} isolated from the network.`,
        unnecessary ? "warning" : "info",
      );
      get().persist();
    },

    completeMission: () => {
      const s = get();
      const mission = findMission(s, s.activeMissionId);
      const st = s.gameStatus;
      if (!mission || (st !== "PLAYING" && st !== "BRIEFING" && st !== "PAUSED")) return null;

      const counted = s.incidents.filter((i) => i.status !== "QUEUED");
      const queued = s.incidents.length - counted.length;
      const total = counted.length;
      const contained = counted.filter((i) => i.status === "CONTAINED").length;
      const incorrect = s.missionMistakes;
      const accuracy = total === 0 ? 100 : Math.round((contained / total) * 100);
      const avg = s.responsesCount === 0 ? 0 : s.totalResponseTimeSec / s.responsesCount;
      const health = networkHealth(s.devices.map((d) => d.health));
      const clampedDamage = Math.max(0, Math.min(95, 100 - health));
      const success = queued === 0 && contained === total && total > 0;
      const score = missionScore(contained, incorrect, avg, clampedDamage, success, s.missionEscalations);
      const rating = performanceRating({ accuracyPct: accuracy, networkHealthPct: health, avgResponseSec: avg });
      const obj = objectivesSummary(
        {
          incidents: s.incidents,
          investigatedIds: s.investigatedIds,
          firewallRules: s.firewallRules,
          devices: s.devices,
          totalResponseTimeSec: s.totalResponseTimeSec,
          responsesCount: s.responsesCount,
        },
        mission.objectives,
      );

      // ---- Completion XP: replay-aware base + performance bonuses ----
      const isReplay = s.completedMissionIds.includes(mission.id);
      const breakdown: XpBreakdownItem[] = [];
      const pushBonus = (label: string, amount: number, bucket: keyof MissionXpBuckets) => {
        if (amount <= 0) return;
        breakdown.push({ label, amount: Math.floor(amount) });
        awardXp(amount, bucket);
      };
      const base = isReplay ? Math.round(mission.xpReward * XP_TABLE.REPLAY_BASE_RATE) : mission.xpReward;
      pushBonus(isReplay ? "Replay reward (reduced base)" : "Mission reward", base, "completion");
      const prevBest = s.bests[mission.id];
      if (success && health === 100) pushBonus("Excellent network health", XP_TABLE.EXCELLENT_HEALTH_BONUS, "bonus");
      if (success && s.responsesCount > 0 && avg < 5) pushBonus("Fast response", XP_TABLE.FAST_RESPONSE_BONUS, "bonus");
      const perfect = success && incorrect === 0 && s.missionUnnecessary === 0 && s.responsesCount > 0 && avg < 5 && health >= 95;
      if (perfect) pushBonus("Perfect mission", XP_TABLE.PERFECT_MISSION_BONUS, "bonus");
      if (success && (rating === "S" || rating === "A_PLUS")) {
        pushBonus("Excellent performance", XP_TABLE.EXCELLENT_PERFORMANCE_BONUS, "bonus");
      }
      if (success && isReplay && prevBest) {
        if (score > prevBest.score) pushBonus("New best score", XP_TABLE.REPLAY_BEAT_SCORE_BONUS, "bonus");
        if (health > prevBest.health) pushBonus("Improved network health", XP_TABLE.REPLAY_BETTER_HEALTH_BONUS, "bonus");
        if (avg < prevBest.responseSec) pushBonus("Faster response", XP_TABLE.REPLAY_FASTER_BONUS, "bonus");
        if (betterRating(rating, prevBest.rating)) pushBonus("Improved rating", XP_TABLE.REPLAY_BETTER_RATING_BONUS, "bonus");
      }

      // ---- Campaign achievements decided at debrief ----
      if (success && health === 100) grantAchievement("zero-damage");
      if (success && mission.incidentIds.length >= 2) grantAchievement("network-savior");
      if (perfect) grantAchievement("perfect-response");

      const xpLive = get().missionXp;
      const xpEarned =
        xpLive.detection + xpLive.investigation + xpLive.action +
        xpLive.completion + xpLive.bonus + xpLive.achievement;
      const labeled: XpBreakdownItem[] = [
        ...(xpLive.detection > 0 ? [{ label: `Threats detected x${total}`, amount: xpLive.detection }] : []),
        ...(xpLive.investigation > 0 ? [{ label: "Investigations", amount: xpLive.investigation }] : []),
        ...(xpLive.action > 0 ? [{ label: "Responses & containment", amount: xpLive.action }] : []),
        ...breakdown,
        ...(xpLive.achievement > 0 ? [{ label: "Achievements", amount: xpLive.achievement }] : []),
      ];

      const result: MissionResult = {
        missionId: mission.id,
        success,
        score,
        accuracy,
        avgResponseTimeSec: Math.round(avg * 10) / 10,
        responseTier: responseTier(avg),
        threatsNeutralized: contained,
        incorrectDecisions: incorrect,
        escalations: s.missionEscalations,
        networkDamagePct: clampedDamage,
        networkHealthPct: health,
        objectivesDone: obj.done,
        objectivesTotal: obj.total,
        xpEarned,
        xpBreakdown: labeled,
        skillGains: { ...s.missionSkillGains },
        achievementsEarned: [...get().missionAchievements],
        securityRating: rating,
        debrief: "",
        completedAt: Date.now(),
      };
      result.debrief = fallbackDebrief(result, mission.title);

      const isCampaign = MISSION_ORDER.includes(mission.id);
      const completedIds =
        success && isCampaign
          ? Array.from(new Set([...s.completedMissionIds, mission.id]))
          : s.completedMissionIds;
      if (success && completedIds.length >= 5) grantAchievement("incident-commander");

      // Personal best - completion history and records survive replays.
      let bests = get().bests;
      if (success) {
        const prev = bests[mission.id];
        if (!prev || score > prev.score) {
          bests = {
            ...bests,
            [mission.id]: {
              score,
              rating,
              responseSec: Math.round(avg * 10) / 10,
              health,
              at: Date.now(),
            },
          };
        }
      }

      // Career records.
      const rec = { ...get().records };
      if (score > rec.bestScoreOverall) rec.bestScoreOverall = score;
      if (!rec.bestRating || betterRating(rating, rec.bestRating)) rec.bestRating = rating;
      if (health > rec.bestHealthPct) rec.bestHealthPct = health;
      if (contained > rec.mostContainedSingle) rec.mostContainedSingle = contained;
      rec.currentStreak = success ? rec.currentStreak + 1 : 0;
      rec.longestStreak = Math.max(rec.longestStreak, rec.currentStreak);

      // Campaign + progression gates recomputed for every mission.
      const leveledState = get();
      const missions = MISSIONS.map((m) => {
        const check = canUnlock(m, completedIds, leveledState.level, prevMission(m.id));
        return { ...m, locked: !check.unlocked };
      });

      // Training runs (dynamic missions) are tracked separately from the campaign.
      const trainingRuns = mission.id.startsWith("dyn-")
        ? [
            {
              id: mission.id,
              title: mission.title,
              focus: mission.aiBriefing?.focus ?? "training",
              success,
              at: Date.now(),
            },
            ...get().trainingRuns,
          ].slice(0, 30)
        : get().trainingRuns;

      set({
        score: s.score + score,
        reputation: Math.min(100, Math.max(0, s.reputation + (success ? 6 : -6))),
        completedMissionIds: completedIds,
        failedMissionIds: success
          ? s.failedMissionIds
          : Array.from(new Set([...s.failedMissionIds, mission.id])),
        bests,
        records: rec,
        missions,
        trainingRuns,
        missionHistory: [result, ...s.missionHistory].slice(0, 20),
        lastResult: result,
        gameStatus: success ? "MISSION_COMPLETE" : "MISSION_FAILED",
        threatLevel: "LOW",
        eventLog: pushLog(
          s.eventLog,
          success
            ? `MISSION COMPLETE - ${contained}/${total} contained, rating ${ratingLabel(rating)}, +${score} pts, +${xpEarned} XP, objectives ${obj.done}/${obj.total}.`
            : `MISSION FAILED - ${contained}/${total} contained, damage ${clampedDamage}%.`,
          success ? "SUCCESS" : "ERROR",
        ),
      });
      const after = get();
      notify(
        after.pendingLevelUp
          ? `Level up - you are now Level ${after.level} (${ratingLabel(result.securityRating)} mission).`
          : success
            ? `Mission complete. +${xpEarned} XP earned.`
            : "Mission failed - review the debrief and retry.",
        success ? "success" : "error",
      );
      playSound(success ? "success" : "alert");
      get().persist();
      return result;
    },

    failMission: (reason) => {
      const s = get();
      if (!s.activeMissionId) return null;
      set((prev) => ({ eventLog: pushLog(prev.eventLog, `MISSION FAILED - ${reason}`, "ERROR") }));
      notify(reason, "error");
      return get().completeMission();
    },

    resetWorld: () =>
      set({
        devices: INITIAL_DEVICES,
        incidents: [],
        activeMissionId: null,
        missionStartedAt: null,
        missionTimeTotal: 0,
        missionTimeLeft: 0,
        missionElapsedSec: 0,
        missionMistakes: 0,
        missionEscalations: 0,
        missionUnnecessary: 0,
        missionAchievements: [],
        missionSkillGains: {},
        missionXp: { ...EMPTY_XP },
        investigatedIds: [],
        ignoreCounts: {},
        scenarioOverrides: {},
        hintsUsed: 0,
        eventLog: [],
        gameStatus: "MENU",
        threatLevel: "LOW",
        selectedDeviceId: null,
        lastResult: null,
      }),

    resetCareer: () => {
      const s = get();
      set({
        xp: 0,
        level: 1,
        score: 0,
        reputation: 50,
        completedMissionIds: [],
        failedMissionIds: [],
        bests: {},
        skills: { ...INITIAL_SKILLS },
        records: { ...DEFAULT_RECORDS },
        totalDetected: 0,
        successfulBlocks: 0,
        threatsNeutralized: 0,
        incorrectDecisions: 0,
        totalResponseTimeSec: 0,
        responsesCount: 0,
        firewallRulesCreated: 0,
        achievements: INITIAL_ACHIEVEMENTS.map((a) => ({ ...a, unlocked: false, unlockedAt: null })),
        missionHistory: [],
        firewallRules: INITIAL_FIREWALL_RULES,
        missions: MISSIONS.map((m) => ({ ...m, locked: m.id !== "m1" })),
        dynamicMissions: [],
        scenarioOverrides: {},
        hintsUsed: 0,
        aiDifficulty: "NORMAL",
        trainingRuns: [],
        missionXp: { ...EMPTY_XP },
        missionSkillGains: {},
        missionAchievements: [],
        pendingLevelUp: null,
        notice: "Career progress has been reset. Fresh operator file created.",
        noticeTone: "info",
        noticeId: s.noticeId + 1,
      });
      get().resetWorld();
      get().persist();
    },

    persist: () => {
      const s = get();
      persistSave({
        username: s.username,
        xp: s.xp,
        level: s.level,
        score: s.score,
        reputation: s.reputation,
        completedMissionIds: s.completedMissionIds,
        achievements: s.achievements.filter((a) => a.unlocked).map((a) => a.id),
        bests: s.bests,
        skills: s.skills,
        records: s.records,
        totalDetected: s.totalDetected,
        successfulBlocks: s.successfulBlocks,
        aiDifficulty: s.aiDifficulty,
        trainingRuns: s.trainingRuns,
        stats: {
          completedMissions: s.completedMissionIds.length,
          failedMissions: s.failedMissionIds.length,
          threatsNeutralized: s.threatsNeutralized,
          incorrectDecisions: s.incorrectDecisions,
          totalResponseTimeSec: s.totalResponseTimeSec,
          responsesCount: s.responsesCount,
          firewallRulesCreated: s.firewallRulesCreated,
        },
        soundOn: s.soundOn,
      });
    },
  };
});


