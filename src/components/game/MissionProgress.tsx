import { CheckCircle2, Circle } from "lucide-react";
import { useGameStore, findMission } from "../../store/gameStore";
import { evaluateObjective } from "../../game/systems/objectives";

/** Live mission objectives — evaluated against the centralized game state. */
export default function MissionProgress() {
  const mission = useGameStore((s) => findMission(s, s.activeMissionId) ?? null);
  const incidents = useGameStore((s) => s.incidents);
  const investigatedIds = useGameStore((s) => s.investigatedIds);
  const firewallRules = useGameStore((s) => s.firewallRules);
  const devices = useGameStore((s) => s.devices);
  const totalResponseTimeSec = useGameStore((s) => s.totalResponseTimeSec);
  const responsesCount = useGameStore((s) => s.responsesCount);
  const gameStatus = useGameStore((s) => s.gameStatus);

  if (!mission) return null;
  const snapshot = { incidents, investigatedIds, firewallRules, devices, totalResponseTimeSec, responsesCount };
  const done = mission.objectives.filter((o) => evaluateObjective(snapshot, o)).length;

  return (
    <div>
      <ol className="space-y-2" aria-label={`Mission objectives, ${done} of ${mission.objectives.length} complete`}>
        {mission.objectives.map((o) => {
          const ok = evaluateObjective(snapshot, o);
          return (
            <li key={o.id} className="flex items-center gap-2 text-sm">
              {ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
              )}
              <span className={ok ? "text-slate-100" : "text-slate-400"}>{o.label}</span>
              <span className="sr-only">{ok ? "done" : "pending"}</span>
            </li>
          );
        })}
      </ol>
      {gameStatus === "MISSION_COMPLETE" && (
        <p className="mt-1 text-xs text-slate-500">Objectives {done}/{mission.objectives.length}</p>
      )}
    </div>
  );
}
