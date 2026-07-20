import { createDatabaseHandle, databaseUrl } from '../src/db/client';
import { migrateDatabase } from '../src/db/migrate';
import { seedLocalDatabase } from '../src/db/seed';

function assertLocalResetTarget(url: string) {
  const parsed = new URL(url);
  if (!['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
    throw new Error('db:reset is restricted to a local PostgreSQL host');
  }
  if (parsed.pathname !== '/axiom' && !parsed.pathname.startsWith('/axiom_test')) {
    throw new Error('db:reset is restricted to the axiom or axiom_test databases');
  }
}

async function main() {
  const url = databaseUrl();
  assertLocalResetTarget(url);
  const handle = createDatabaseHandle(url);
  try {
    await handle.pool.query('drop schema if exists public cascade');
    await handle.pool.query('drop schema if exists axiom_internal cascade');
    await handle.pool.query('create schema public');
    await migrateDatabase(handle.db);
    const seeded = await seedLocalDatabase(handle.db);
    process.stdout.write(`${JSON.stringify({ status: 'reset', ...seeded }, null, 2)}\n`);
  } finally {
    await handle.pool.end();
  }
}

void main();
