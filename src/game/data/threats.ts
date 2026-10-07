/**
 * Threat catalogue metadata — display labels, observed patterns,
 * and the textbook response for each simulated threat type.
 */
import type { ThreatType } from "../../types/game";

export interface ThreatMeta {
  label: string;
  pattern: string;
  textbookResponse: string;
}

export const THREAT_META: Record<ThreatType, ThreatMeta> = {
  BRUTE_FORCE: {
    label: "Brute Force",
    pattern: "High-rate automated login attempts",
    textbookResponse: "Block the source at the firewall.",
  },
  MALWARE: {
    label: "Malware",
    pattern: "Periodic beaconing to unknown host",
    textbookResponse: "Isolate the endpoint, then block the destination.",
  },
  PHISHING: {
    label: "Phishing",
    pattern: "Malicious attachment / credential lure",
    textbookResponse: "Investigate the endpoint, isolate if payload executed.",
  },
  PORT_SCAN: {
    label: "Port Scan",
    pattern: "Sequential probes across many ports",
    textbookResponse: "Investigate and log; block if it persists.",
  },
  DDOS: {
    label: "DDoS",
    pattern: "Volumetric flood from distributed sources",
    textbookResponse: "Block malicious traffic patterns at the edge.",
  },
  UNAUTHORIZED_ACCESS: {
    label: "Unauthorized Access",
    pattern: "Privilege misuse outside of expected behavior",
    textbookResponse: "Investigate the account, isolate the source host.",
  },
  DATA_EXFILTRATION: {
    label: "Data Exfiltration",
    pattern: "Large unexplained outbound transfers",
    textbookResponse: "Isolate the source immediately.",
  },
  SUSPICIOUS_LOGIN: {
    label: "Suspicious Login",
    pattern: "Failed attempts followed by anomalous success",
    textbookResponse: "Investigate, then block the source.",
  },
  RANSOMWARE: {
    label: "Ransomware",
    pattern: "Mass file renames / encryption staging",
    textbookResponse: "Isolate affected hosts immediately.",
  },
  INSIDER_THREAT: {
    label: "Insider Threat",
    pattern: "Legitimate credentials, illegitimate behavior",
    textbookResponse: "Investigate to confirm, then isolate.",
  },
};
