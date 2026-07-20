import { createDatabaseHandle } from '../src/db/client';
import { seedLocalDatabase } from '../src/db/seed';

async function main() {
  const handle = createDatabaseHandle();
  try {
    const seeded = await seedLocalDatabase(handle.db);
    process.stdout.write(`${JSON.stringify({ status: 'seeded', ...seeded }, null, 2)}\n`);
  } finally {
    await handle.pool.end();
  }
}

void main();
