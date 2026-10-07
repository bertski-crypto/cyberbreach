/** Deterministic provider — always available, fully offline. */
import type {
  DebriefSnapshot,
  GameAIProvider,
  GeneratedHint,
  HintSnapshot,
  PlayerAnalysis,
  PlayerSnapshot,
  ScenarioRequest,
} from "../aiTypes";
import { analyzePlayer } from "../playerAnalyzer";
import { buildDeterministicScenario } from "../scenarioGenerator";
import { buildDeterministicHint } from "../hintEngine";
import { buildDeterministicDebrief } from "../debriefEngine";

export class DeterministicGameAI implements GameAIProvider {
  readonly name = "DETERMINISTIC" as const;

  async analyzePlayer(input: PlayerSnapshot): Promise<PlayerAnalysis> {
    return analyzePlayer(input);
  }

  async generateScenario(input: ScenarioRequest & { analysis: PlayerAnalysis }) {
    return buildDeterministicScenario(input, "DETERMINISTIC");
  }

  async generateHint(input: HintSnapshot): Promise<GeneratedHint> {
    return buildDeterministicHint(input);
  }

  async generateDebrief(input: DebriefSnapshot) {
    return { ...buildDeterministicDebrief(input), provider: "DETERMINISTIC" as const };
  }
}
