import { defineConfig } from 'drizzle-kit';

const localDatabaseUrl = 'postgresql://axiom:axiom-local-only@localhost:54329/axiom';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? localDatabaseUrl,
  },
  migrations: {
    table: '__axiom_migrations',
    schema: 'axiom_internal',
  },
  strict: true,
  verbose: true,
});
