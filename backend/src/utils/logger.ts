type Level = "info" | "warn" | "error";

function line(level: Level, msg: string, extra?: Record<string, unknown>): string {
  const base: Record<string, unknown> = { t: new Date().toISOString(), level, msg };
  if (extra) base.extra = extra;
  return JSON.stringify(base);
}

export const logger = {
  info(msg: string, extra?: Record<string, unknown>): void {
    console.log(line("info", msg, extra));
  },
  warn(msg: string, extra?: Record<string, unknown>): void {
    console.warn(line("warn", msg, extra));
  },
  error(msg: string, extra?: Record<string, unknown>): void {
    console.error(line("error", msg, extra));
  },
};
