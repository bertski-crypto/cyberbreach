import { useState } from "react";
import { Plus } from "lucide-react";
import { useGameStore } from "../store/gameStore";
import Panel from "../components/ui/Panel";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";

const inputCls =
  "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500";

export default function FirewallPage() {
  const { firewallRules, addFirewallRule, toggleFirewallRule } = useGameStore();
  const [source, setSource] = useState("203.0.113.88");
  const [destination, setDestination] = useState("10.0.1.10");
  const [port, setPort] = useState("22");
  const [protocol, setProtocol] = useState<"TCP" | "UDP" | "ICMP" | "ANY">("TCP");
  const [action, setAction] = useState<"ALLOW" | "BLOCK">("BLOCK");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = Number(port);
    if (!source.trim() || !destination.trim()) {
      setError("Source and destination are required.");
      return;
    }
    if (!Number.isInteger(p) || p < 1 || p > 65535) {
      setError("Port must be an integer between 1 and 65535.");
      return;
    }
    setError(null);
    addFirewallRule({ source: source.trim(), destination: destination.trim(), port: p, protocol, action, enabled: true });
    setSource("");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title="New firewall rule" subtitle="Rules take effect immediately in the simulation">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="fw-src" className="mb-1 block text-xs font-semibold text-slate-300">Source IP / CIDR</label>
            <input id="fw-src" className={inputCls} value={source} onChange={(e) => setSource(e.target.value)} placeholder="203.0.113.88" />
          </div>
          <div>
            <label htmlFor="fw-dst" className="mb-1 block text-xs font-semibold text-slate-300">Destination</label>
            <input id="fw-dst" className={inputCls} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="10.0.1.10" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="fw-port" className="mb-1 block text-xs font-semibold text-slate-300">Port</label>
              <input id="fw-port" inputMode="numeric" className={inputCls} value={port} onChange={(e) => setPort(e.target.value)} />
            </div>
            <div>
              <label htmlFor="fw-proto" className="mb-1 block text-xs font-semibold text-slate-300">Protocol</label>
              <select id="fw-proto" className={inputCls} value={protocol} onChange={(e) => setProtocol(e.target.value as typeof protocol)}>
                <option>TCP</option><option>UDP</option><option>ICMP</option><option>ANY</option>
              </select>
            </div>
            <div>
              <label htmlFor="fw-act" className="mb-1 block text-xs font-semibold text-slate-300">Action</label>
              <select id="fw-act" className={inputCls} value={action} onChange={(e) => setAction(e.target.value as typeof action)}>
                <option>BLOCK</option><option>ALLOW</option>
              </select>
            </div>
          </div>
          {error && <p role="alert" className="rounded border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}
          <Button type="submit" className="w-full">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add rule (+15 XP)
          </Button>
        </form>
      </Panel>

      <Panel title={`Active rules (${firewallRules.length})`} subtitle="Toggle rules on/off — disabled rules stop matching traffic">
        <ul className="space-y-2">
          {firewallRules.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-md border border-slate-800 bg-slate-900/50 p-3">
              <span className="mono text-xs font-bold text-slate-100">{r.id}</span>
              <Badge value={r.action} />
              <span className="mono text-xs text-slate-300">{r.protocol}/{r.port === 0 ? "ALL" : r.port}</span>
              <span className="mono text-xs text-slate-400">{r.source} → {r.destination}</span>
              <span className="mono ml-auto text-[11px] text-slate-500">{r.hits} hits</span>
              <button
                onClick={() => toggleFirewallRule(r.id)}
                aria-pressed={r.enabled}
                aria-label={`${r.enabled ? "Disable" : "Enable"} rule ${r.id}`}
                className={`rounded border px-3 py-1.5 text-xs font-semibold ${r.enabled ? "border-emerald-500/40 text-emerald-300" : "border-slate-600 text-slate-400"}`}
              >
                {r.enabled ? "ENABLED" : "DISABLED"}
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
