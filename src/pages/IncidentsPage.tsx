import { Link } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { isOpenIncident, priorityOf } from "../game/systems/threatEngine";
import IncidentCard from "../components/incidents/IncidentCard";
import Panel from "../components/ui/Panel";

export default function IncidentsPage() {
  const incidents = useGameStore((s) => s.incidents);
  const active = incidents
    .filter(isOpenIncident)
    .sort((a, b) => priorityOf(a) - priorityOf(b) || a.createdAt - b.createdAt);
  const handled = incidents.filter((i) => !isOpenIncident(i));

  return (
    <div className="space-y-4">
      <Panel title={`Incident console — ${active.length} active`} subtitle="Prioritized queue: P1 critical first. Ignoring is also a decision.">
        {incidents.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
            <p className="font-semibold text-slate-200">No incidents yet</p>
            <p className="mt-1">Start a mission and alerts will stream in here.</p>
            <Link to="/soc/missions" className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300">
              Go to missions
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((i) => (
              <IncidentCard key={i.id} incident={i} />
            ))}
            {handled.length > 0 && (
              <>
                <h3 className="pt-2 text-xs font-semibold tracking-widest text-slate-500 uppercase">
                  Handled ({handled.length})
                </h3>
                {handled.map((i) => (
                  <IncidentCard key={i.id} incident={i} />
                ))}
              </>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
