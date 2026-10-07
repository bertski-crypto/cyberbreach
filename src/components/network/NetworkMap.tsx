/**
 * SVG network topology map. Nodes carry text labels + status badges —
 * state is never communicated by color alone.
 */
import { useMemo } from "react";
import type { DeviceStatus, NetworkDevice } from "../../types/game";
import { NETWORK_LINKS } from "../../game/data/devices";

const STATUS_COLOR: Record<DeviceStatus, string> = {
  ONLINE: "#34d399",
  OFFLINE: "#64748b",
  WARNING: "#fbbf24",
  COMPROMISED: "#ef4444",
  ISOLATED: "#38bdf8",
  UNDER_ATTACK: "#f87171",
};

const STATUS_GLYPH: Record<DeviceStatus, string> = {
  ONLINE: "●",
  OFFLINE: "○",
  WARNING: "▲",
  COMPROMISED: "✖",
  ISOLATED: "◈",
  UNDER_ATTACK: "◆",
};

const LINKS: Array<[string, string]> = NETWORK_LINKS;

export default function NetworkMap({
  devices,
  selectedId,
  onSelect,
  animated = true,
  attackTargetIds = [],
}: {
  devices: NetworkDevice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  animated?: boolean;
  /** Device ids with live hostile traffic — drawn as attack paths */
  attackTargetIds?: string[];
}) {
  const byId = useMemo(() => new Map(devices.map((d) => [d.id, d])), [devices]);
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <div role="img" aria-label="Network topology map showing device health states">
      <svg viewBox="0 0 100 104" className="h-auto w-full" role="presentation">
        {/* links */}
        {LINKS.map(([a, b]) => {
          const A = byId.get(a);
          const B = byId.get(b);
          if (!A || !B) return null;
          const alert =
            A.status === "UNDER_ATTACK" ||
            A.status === "COMPROMISED" ||
            B.status === "UNDER_ATTACK" ||
            B.status === "COMPROMISED";
          return (
            <line
              key={`${a}-${b}`}
              x1={A.x}
              y1={A.y}
              x2={B.x}
              y2={B.y}
              stroke={alert ? "#ef4444" : "#334155"}
              strokeOpacity={alert ? 0.9 : 0.7}
              strokeWidth={alert ? 0.5 : 0.3}
              strokeDasharray={alert ? "1.2 0.8" : undefined}
            >
              {animated && !reduceMotion && alert && (
                <animate attributeName="stroke-opacity" values="0.9;0.35;0.9" dur="1.2s" repeatCount="indefinite" />
              )}
            </line>
          );
        })}

        {/* packet dots on backbone */}
        {animated && !reduceMotion && (
          <g fill="#22d3ee" opacity={0.8}>
            <circle r={0.7} cx={50} cy={14}>
              <animate attributeName="cy" values="8;36" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle r={0.7} cx={50} cy={36}>
              <animate attributeName="cy" values="36;8" dur="3.1s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* attack-traffic paths: core router → targeted host */}
        {attackTargetIds.map((tid) => {
          const T = byId.get(tid);
          const R = byId.get("rtr-01");
          if (!T || !R || tid === "rtr-01") return null;
          return (
            <g key={`attack-${tid}`}>
              <line
                x1={R.x}
                y1={R.y}
                x2={T.x}
                y2={T.y}
                stroke="#ef4444"
                strokeWidth={0.7}
                strokeDasharray="1.6 1"
              >
                {animated && !reduceMotion && (
                  <animate attributeName="stroke-dashoffset" values="0;-5" dur="0.7s" repeatCount="indefinite" />
                )}
              </line>
              {animated && !reduceMotion && (
                <circle r={0.9} fill="#ef4444">
                  <animate attributeName="cx" values={`${R.x};${T.x}`} dur="1.1s" repeatCount="indefinite" />
                  <animate attributeName="cy" values={`${R.y};${T.y}`} dur="1.1s" repeatCount="indefinite" />
                </circle>
              )}
              <text x={T.x} y={T.y - 9} textAnchor="middle" fontSize={2.2} fill="#f87171" fontFamily="monospace" fontWeight="bold">
                ⚠ ATTACK
              </text>
            </g>
          );
        })}

        {/* nodes */}
        {devices.map((d) => {
          const selected = d.id === selectedId;
          const c = STATUS_COLOR[d.status];
          return (
            <g
              key={d.id}
              transform={`translate(${d.x},${d.y})`}
              onClick={() => onSelect(d.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(d.id);
              }}
              tabIndex={0}
              role="button"
              aria-label={`${d.hostname} ${d.ip}, status ${d.status}, health ${d.health} percent`}
              style={{ cursor: "pointer" }}
            >
              {selected && (
                <rect x={-9} y={-7.5} width={18} height={13.4} rx={1.6} fill="none" stroke="#38bdf8" strokeWidth={0.5} />
              )}
              {d.status === "UNDER_ATTACK" && !reduceMotion && (
                <circle r={4.6} fill="none" stroke="#ef4444" strokeWidth={0.3} opacity={0.7}>
                  <animate attributeName="r" values="3.4;5.4;3.4" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
              <rect x={-7.5} y={-4.6} width={15} height={7.4} rx={1.2} fill="#0b1220" stroke={c} strokeWidth={0.55} />
              <text textAnchor="middle" y={-0.2} fontSize={2.6} fill={c} fontFamily="monospace">
                {STATUS_GLYPH[d.status]}
              </text>
              <text textAnchor="middle" y={2.6} fontSize={1.9} fill="#e2e8f0" fontFamily="monospace" fontWeight="bold">
                {d.hostname.length > 10 ? d.hostname.slice(0, 10) : d.hostname}
              </text>
              <text textAnchor="middle" y={7.6} fontSize={1.6} fill="#94a3b8" fontFamily="monospace">
                {d.status}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400" aria-hidden="true">
        {(Object.keys(STATUS_COLOR) as DeviceStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1">
            <span className="font-mono" style={{ color: STATUS_COLOR[s] }}>{STATUS_GLYPH[s]}</span> {s}
          </span>
        ))}
      </div>
    </div>
  );
}
