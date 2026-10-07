import { useGameStore } from "../store/gameStore";
import { isOpenIncident } from "../game/systems/threatEngine";
import NetworkMap from "../components/network/NetworkMap";
import DeviceDetails from "../components/game/DeviceDetails";
import Panel from "../components/ui/Panel";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

export default function NetworkPage() {
  const { devices, selectedDeviceId, selectDevice, isolateDevice, incidents } = useGameStore();
  const attackTargetIds = incidents
    .filter((i) => isOpenIncident(i) && (i.severity === "HIGH" || i.severity === "CRITICAL"))
    .map((i) => i.targetDeviceId);
  return (
    <div className="space-y-4">
      <Panel title="Network topology" subtitle="14 simulated hosts · click or Tab+Enter a node to inspect it">
        <NetworkMap devices={devices} selectedId={selectedDeviceId} onSelect={(id) => selectDevice(id)} attackTargetIds={attackTargetIds} />
        <div className="mt-3">
          <DeviceDetails />
        </div>
      </Panel>
      <Panel title="Device inventory" subtitle="Status is shown as text + icon, never color alone">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] tracking-widest text-slate-500 uppercase">
                <th className="py-2 pr-3">Hostname</th>
                <th className="py-2 pr-3">IP</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Segment</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Health</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id} className="border-b border-slate-800/60 last:border-0">
                  <td className="mono py-2 pr-3 font-semibold text-slate-100">{d.hostname}</td>
                  <td className="mono py-2 pr-3 text-slate-400">{d.ip}</td>
                  <td className="py-2 pr-3 text-slate-300">{d.type}</td>
                  <td className="py-2 pr-3 text-slate-300">{d.segment}</td>
                  <td className="py-2 pr-3"><Badge value={d.status} /></td>
                  <td className="mono py-2 pr-3 text-slate-300">{d.health}%</td>
                  <td className="py-2">
                    {d.status === "ISOLATED" ? (
                      <span className="text-xs text-slate-500">Isolated</span>
                    ) : (
                      <Button variant="outline" onClick={() => isolateDevice(d.id)} aria-label={`Isolate ${d.hostname}`}>
                        Isolate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
