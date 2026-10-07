import { useGameStore } from "../../store/gameStore";
import Badge from "../ui/Badge";

/** Full device dossier for the selected node — text + icon, never color alone. */
export default function DeviceDetails() {
  const selectedId = useGameStore((s) => s.selectedDeviceId);
  const devices = useGameStore((s) => s.devices);
  const isolateDevice = useGameStore((s) => s.isolateDevice);
  const selectDevice = useGameStore((s) => s.selectDevice);

  const d = devices.find((x) => x.id === selectedId);
  if (!d) {
    return <p className="text-sm text-slate-500">Select a node on the map to inspect it.</p>;
  }

  const security =
    d.status === "ONLINE"
      ? "NORMAL"
      : d.status === "ISOLATED"
        ? "QUARANTINED"
        : d.status === "WARNING"
          ? "ELEVATED"
          : "COMPROMISED";

  return (
    <div className="rounded-md border border-sky-400/30 bg-sky-400/5 p-4" role="status" aria-label={`Device details for ${d.hostname}`}>
      <h3 className="mono text-base font-bold text-slate-100">{d.hostname}</h3>
      <dl className="mono mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
        <div><dt className="text-slate-500">IP</dt><dd className="text-slate-200">{d.ip}</dd></div>
        <div><dt className="text-slate-500">TYPE</dt><dd className="text-slate-200">{d.type}</dd></div>
        <div><dt className="text-slate-500">SEGMENT</dt><dd className="text-slate-200">{d.segment}</dd></div>
        <div><dt className="text-slate-500">STATUS</dt><dd><Badge value={d.status} /></dd></div>
        <div><dt className="text-slate-500">SECURITY</dt><dd className="text-slate-200">{security}</dd></div>
        <div><dt className="text-slate-500">HEALTH</dt><dd className="text-slate-200">{d.health}%</dd></div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        {d.status !== "ISOLATED" && (
          <button
            onClick={() => isolateDevice(d.id)}
            className="min-h-[44px] rounded border border-sky-400/40 px-3 py-1.5 text-sm text-sky-300 hover:bg-sky-400/10"
          >
            Isolate host
          </button>
        )}
        <button
          onClick={() => selectDevice(null)}
          className="min-h-[44px] rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          Clear selection
        </button>
      </div>
    </div>
  );
}
