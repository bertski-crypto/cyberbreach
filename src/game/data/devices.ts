/**
 * Simulated company network inventory.
 * Fictional RFC-5737 / RFC-1918 addressing for education only.
 */
import type { NetworkDevice } from "../../types/game";

export const INITIAL_DEVICES: NetworkDevice[] = [
  { id: "wan", hostname: "INTERNET", ip: "0.0.0.0", type: "INTERNET", segment: "WAN", status: "ONLINE", health: 100, x: 50, y: 6 },
  { id: "fw-01", hostname: "FIREWALL", ip: "203.0.113.1", type: "FIREWALL", segment: "DMZ", status: "ONLINE", health: 100, x: 50, y: 22 },
  { id: "rtr-01", hostname: "CORE-RTR", ip: "10.0.0.1", type: "ROUTER", segment: "CORE", status: "ONLINE", health: 100, x: 50, y: 38 },
  { id: "web-01", hostname: "WEB-01", ip: "10.0.1.10", type: "SERVER", segment: "SERVERS", status: "ONLINE", health: 100, x: 18, y: 58 },
  { id: "file-01", hostname: "FILE-01", ip: "10.0.1.20", type: "SERVER", segment: "SERVERS", status: "ONLINE", health: 100, x: 36, y: 62 },
  { id: "db-01", hostname: "DB-01", ip: "10.0.2.10", type: "DATABASE", segment: "SERVERS", status: "ONLINE", health: 100, x: 62, y: 60 },
  { id: "db-02", hostname: "DB-02", ip: "10.0.2.11", type: "DATABASE", segment: "SERVERS", status: "ONLINE", health: 100, x: 80, y: 58 },
  { id: "auth-01", hostname: "AUTH-01", ip: "10.0.1.30", type: "SERVER", segment: "SERVERS", status: "ONLINE", health: 100, x: 50, y: 50 },
  { id: "pc-01", hostname: "PC-01", ip: "192.168.1.11", type: "WORKSTATION", segment: "WORKSTATIONS", status: "ONLINE", health: 100, x: 12, y: 82 },
  { id: "pc-02", hostname: "PC-02", ip: "192.168.1.12", type: "WORKSTATION", segment: "WORKSTATIONS", status: "ONLINE", health: 100, x: 30, y: 86 },
  { id: "pc-03", hostname: "PC-03", ip: "192.168.1.13", type: "WORKSTATION", segment: "WORKSTATIONS", status: "ONLINE", health: 100, x: 48, y: 84 },
  { id: "pc-07", hostname: "PC-07", ip: "192.168.1.17", type: "WORKSTATION", segment: "WORKSTATIONS", status: "ONLINE", health: 100, x: 66, y: 86 },
  { id: "prn-01", hostname: "PRN-01", ip: "192.168.1.50", type: "PRINTER", segment: "WORKSTATIONS", status: "ONLINE", health: 100, x: 82, y: 82 },
  { id: "iot-01", hostname: "IOT-CAM-01", ip: "192.168.2.10", type: "IOT", segment: "IOT", status: "ONLINE", health: 100, x: 50, y: 97 },
];

/** Static topology edges (device id pairs) drawn by the network map. */
export const NETWORK_LINKS: Array<[string, string]> = [
  ["wan", "fw-01"],
  ["fw-01", "rtr-01"],
  ["rtr-01", "web-01"],
  ["rtr-01", "auth-01"],
  ["rtr-01", "file-01"],
  ["rtr-01", "db-01"],
  ["rtr-01", "db-02"],
  ["rtr-01", "pc-01"],
  ["rtr-01", "pc-02"],
  ["rtr-01", "pc-03"],
  ["rtr-01", "pc-07"],
  ["rtr-01", "prn-01"],
  ["rtr-01", "iot-01"],
];
