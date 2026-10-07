import { useNavigate } from "react-router-dom";
import { canUnlock } from "../game/systems/progression";
import { useGameStore } from "../store/gameStore";
import MissionCard from "../components/missions/MissionCard";
import Panel from "../components/ui/Panel";

const ORDER = ["m1", "m2", "m3", "m4", "m5"];

export default function MissionsPage() {
  const { missions, completedMissionIds, bests, level, startMission } = useGameStore();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <Panel title="Mission board" subtitle="Campaign order plus rank gates — replays earn reduced base XP plus improvement bonuses.">
        <p className="text-sm text-slate-400">
          {completedMissionIds.length}/5 complete · Operator Level {level} · training → incident response → network defense → adaptive
        </p>
      </Panel>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {missions.map((m) => {
          const prev = ORDER[ORDER.indexOf(m.id) - 1] ?? "";
          const check = canUnlock(m, completedMissionIds, level, prev);
          return (
            <MissionCard
              key={m.id}
              mission={m}
              completed={completedMissionIds.includes(m.id)}
              best={bests[m.id]}
              lockReasons={check.reasons}
              onStart={(id) => {
                startMission(id);
                navigate("/soc");
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
