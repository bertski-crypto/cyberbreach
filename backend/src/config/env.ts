import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  // Cloud Postgres (Render/Supabase/Neon) typically needs SSL; allow explicit override.
  databaseSsl: process.env.DATABASE_SSL ?? "",
  testDbMem: process.env.TEST_DB_MEM === "1",
  jwtSecret: required("JWT_SECRET", "dev-access-secret-change-me-32-chars-min"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me-32-chars"),
  jwtAccessTtlMin: Number(process.env.JWT_ACCESS_TTL_MIN ?? 15),
  jwtRefreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  allowSeed: process.env.ALLOW_SEED === "true",
  seedDemoEmail: process.env.SEED_DEMO_EMAIL ?? "demo@example.com",
  seedDemoPassword: process.env.SEED_DEMO_PASSWORD ?? "Demo1234!",
  seedDemoCodename: process.env.SEED_DEMO_CODENAME ?? "NEXUS",
  aiEnabled: process.env.AI_ENABLED === "true",
};

export const isProd = env.nodeEnv === "production";
