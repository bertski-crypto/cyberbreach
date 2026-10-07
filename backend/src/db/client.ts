import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { newDb } from "pg-mem";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface Db {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  connect(): Promise<PoolClient>;
}

let pool: Pool | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mem: any = null;

async function memDb(): Promise<Db> {
  if (!mem) {
    const db = newDb({ autoCreateForeignKeyIndices: true });
    const pg = db.adapters.createPg();
    mem = new pg.Pool();
  }
  return mem as Db;
}

export async function db(): Promise<Db> {
  // Read at call time so test harnesses can force the emulator
  // regardless of module evaluation order.
  if (process.env.TEST_DB_MEM === "1" || env.testDbMem) return memDb();
  if (!pool) {
    if (!env.databaseUrl) throw new Error("DATABASE_URL is not set");
    pool = new Pool({ connectionString: env.databaseUrl });
    pool.on("error", (err) => logger.error("pg pool error", { message: String(err) }));
  }
  return pool;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
  mem = null;
}

export async function withTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const database = await db();
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback errors */
    }
    throw err;
  } finally {
    client.release();
  }
}
