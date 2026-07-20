import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const localDatabaseUrl = 'postgresql://axiom:axiom-local-only@localhost:54329/axiom';

export type AxiomDatabase = NodePgDatabase<typeof schema>;

export type DatabaseHandle = {
  db: AxiomDatabase;
  pool: Pool;
};

function boundedPoolSize(value: string | undefined) {
  const parsed = Number.parseInt(value ?? '10', 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 50 ? parsed : 10;
}

export function databaseUrl() {
  return process.env.DATABASE_URL ?? localDatabaseUrl;
}

export function createDatabaseHandle(url = databaseUrl()): DatabaseHandle {
  const pool = new Pool({
    connectionString: url,
    max: boundedPoolSize(process.env.DATABASE_POOL_MAX),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: process.env.NODE_ENV === 'test',
    ...(process.env.DATABASE_SSL_MODE === 'require'
      ? { ssl: { rejectUnauthorized: true } }
      : {}),
  });
  return { pool, db: drizzle({ client: pool, schema }) };
}

const globalDatabase = globalThis as typeof globalThis & { __axiomDatabase?: DatabaseHandle };

export function getDatabaseHandle() {
  if (!globalDatabase.__axiomDatabase) globalDatabase.__axiomDatabase = createDatabaseHandle();
  return globalDatabase.__axiomDatabase;
}

export function getDatabase() {
  return getDatabaseHandle().db;
}

export async function closeDatabase() {
  const handle = globalDatabase.__axiomDatabase;
  if (!handle) return;
  delete globalDatabase.__axiomDatabase;
  await handle.pool.end();
}
