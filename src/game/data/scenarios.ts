/**
 * Deterministic scenario building blocks. Every address is from
 * documentation/reserved ranges — display strings only, never dialed.
 */
import type { SkillKey, ThreatType } from "../../types/game";

export const FICTIONAL_IP_POOL = [
  "185.203.44.21",
  "91.77.13.88",
  "172.19.44.81",
  "203.0.113.42",
  "198.51.100.17",
  "192.0.2.90",
  "203.0.113.117",
  "198.51.100.203",
];

export const SCENARIO_NAMES = [
  "THE QUIET INTRUSION",
  "GHOSTS ON THE WIRE",
  "MIDNIGHT HANDSHAKE",
  "THE PATIENT ADVERSARY",
  "SIGNALS IN THE NOISE",
  "THE SECOND KNOCK",
  "SHADOW SESSION",
  "ECHOES FROM PC-07",
];

/** Training focus → threat templates that exercise it (whitelisted ids). */
export const FOCUS_TEMPLATES: Record<SkillKey, string[]> = {
  threatDetection: ["inc-port-scan", "inc-susp-login", "inc-phishing", "inc-m2-creds"],
  incidentResponse: ["inc-malware", "inc-ransomware", "inc-m3-beacon", "inc-m4-pivot"],
  networkDefense: ["inc-ddos", "inc-exfil", "inc-unauth", "inc-m4-target"],
  firewallManagement: ["inc-brute-force", "inc-m2-auth", "inc-susp-login", "inc-port-scan"],
  decisionMaking: ["inc-m4-foothold", "inc-insider", "inc-m3-lateral", "inc-unauth"],
};

/** Threat type → template pool for free-simulation picks. */
export const THREAT_TEMPLATES: Record<ThreatType, string[]> = {
  BRUTE_FORCE: ["inc-brute-force", "inc-m2-auth"],
  MALWARE: ["inc-malware", "inc-m3-beacon", "inc-m4-pivot"],
  PHISHING: ["inc-phishing"],
  PORT_SCAN: ["inc-port-scan"],
  DDOS: ["inc-ddos"],
  UNAUTHORIZED_ACCESS: ["inc-unauth", "inc-m3-lateral"],
  DATA_EXFILTRATION: ["inc-exfil", "inc-m4-target"],
  SUSPICIOUS_LOGIN: ["inc-susp-login", "inc-m2-creds", "inc-m4-foothold"],
  RANSOMWARE: ["inc-ransomware"],
  INSIDER_THREAT: ["inc-insider"],
};

export const FOCUS_LABELS: Record<SkillKey, string> = {
  threatDetection: "Threat Detection",
  incidentResponse: "Incident Response",
  networkDefense: "Network Defense",
  firewallManagement: "Firewall Management",
  decisionMaking: "Decision Making",
};

export const FOCUS_REASONS: Record<SkillKey, string> = {
  threatDetection: "Your containment skills are strong, but early threat identification can improve. The next scenario will emphasize early indicators.",
  incidentResponse: "Containment is the skill that ends incidents. The next scenario will force fast, correct containment calls.",
  networkDefense: "Infrastructure protection decides mission ratings. The next scenario will threaten servers directly.",
  firewallManagement: "Blocking the right source at the right time is surgical work. The next scenario will test source identification.",
  decisionMaking: "Good calls under time pressure win campaigns. The next scenario will present competing priorities.",
};
