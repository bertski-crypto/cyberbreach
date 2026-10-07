/**
 * Optional external provider. Never required: any failure (disabled flag,
 * missing endpoint, timeout, invalid shape) falls back to deterministic
 * output. Only anonymous game-performance snapshots ever leave the client,
 * and only when explicitly enabled.
 */
import type {
  DebriefSnapshot,
  GameAIProvider,
  GeneratedHint,
  GeneratedScenario,
  HintSnapshot,
  PlayerAnalysis,
  PlayerSnapshot,
  ScenarioRequest,
} from "../aiTypes";
import { buildDeterministicDebrief } from "../debriefEngine";
import { buildDeterministicHint } from "../hintEngine";
import { analyzePlayer } from "../playerAnalyzer";
import { buildDeterministicScenario, trimText, validateScenario } from "../scenarioGenerator";

function env(key: string): string | undefined {
  try {
    const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
    return meta.env?.[key];
  } catch {
    return undefined;
  }
}

function isEnabled(): boolean {
  return env("VITE_AI_ENABLED") === "true";
}

function endpoint(): string | undefined {
  const ep = env("VITE_AI_ENDPOINT");
  return ep && ep.startsWith("https://") ? ep : undefined;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const ep = endpoint();
  if (!isEnabled() || !ep) throw new Error("external AI disabled");
  const timeoutMs = Number(env("VITE_AI_TIMEOUT_MS") ?? 6000) || 6000;
  const ctrl = new AbortController();
  const id = window.setTimeout(() => ctrl.abort(), Math.min(15000, Math.max(1000, timeoutMs)));
  try {
    const res = await fetch(`${ep.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`AI ${res.status}`);
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(id);
  }
}

function saneScenario(s: Partial<GeneratedScenario>): GeneratedScenario | null {
  try {
    const full = s as GeneratedScenario;
    const check = validateScenario(full);
    if (!check.ok) return null;
    return {
      ...full,
      title: trimText(full.title, 80),
      briefing: trimText(full.briefing, 800),
      provider: "EXTERNAL",
    };
  } catch {
    return null;
  }
}

export class ExternalGameAI implements GameAIProvider {
  readonly name = "EXTERNAL" as const;

  async analyzePlayer(input: PlayerSnapshot): Promise<PlayerAnalysis> {
    try {
      const out = await post<PlayerAnalysis>("/analyze", input);
      if (typeof out.overallSkill !== "number" || !out.trainingFocus) throw new Error("bad shape");
      return out;
    } catch {
      return analyzePlayer(input);
    }
  }

  async generateScenario(input: ScenarioRequest & { analysis: PlayerAnalysis }): Promise<GeneratedScenario> {
    try {
      const out = await post<Partial<GeneratedScenario>>("/scenario", {
        focus: input.focus,
        difficulty: input.difficulty,
        incidentCount: input.incidentCount,
      });
      const sane = saneScenario(out);
      if (!sane) throw new Error("invalid scenario");
      return sane;
    } catch {
      return buildDeterministicScenario(input, "DETERMINISTIC");
    }
  }

  async generateHint(input: HintSnapshot): Promise<GeneratedHint> {
    try {
      const out = await post<{ level: 1 | 2 | 3; text: string }>("/hint", input);
      if (!out.text || ![1, 2, 3].includes(out.level)) throw new Error("bad shape");
      return { level: out.level, text: trimText(out.text, 300), provider: "EXTERNAL" };
    } catch {
      return buildDeterministicHint(input);
    }
  }

  async generateDebrief(input: DebriefSnapshot) {
    try {
      const { analysis: _a, ...rest } = input;
      void _a;
      const out = await post<{ classification: string; strengths: string[]; text: string }>("/debrief", rest);
      if (!out.text) throw new Error("bad shape");
      void out;
      return { ...buildDeterministicDebrief(input), provider: "EXTERNAL" as const };
    } catch {
      return { ...buildDeterministicDebrief(input), provider: "DETERMINISTIC" as const };
    }
  }
}
