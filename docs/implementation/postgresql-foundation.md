# PostgreSQL foundation runbook

## Local topology

- PostgreSQL: `127.0.0.1:54329`, database `axiom`.
- Dedicated integration database: `axiom_test`.
- Local-only credentials: `axiom` / `axiom-local-only`.
- Persistent Docker volume: `axiom-postgres-data`.
- Commercial project-store selection: `AXIOM_PROJECT_STORE=postgres`.
- Rollback adapter: `AXIOM_PROJECT_STORE=json`.

No command in this runbook deploys, provisions AWS, or contacts Vercel.

## Clean setup

```bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
```

Copy `.env.example` to `.env.local`. Keep `DATABASE_SSL_MODE=disable` only for local Docker. Future RDS configuration shall require certificate-verified TLS and secret injection rather than a committed URL.

## Prototype migration

Dry-run validates the JSON schema, customer-object references, exact grounded source spans, gap/entity links, clarification/gap links, and approval hashes without connecting to PostgreSQL:

```bash
pnpm db:import:dry-run
```

Apply only after the dry-run has zero errors and the target organization contains no projects:

```bash
pnpm db:import
pnpm db:verify-import
```

Apply mode is a single transaction. It stores the input SHA-256 and row counts in `prototype_imports`. Repeating the exact input returns the recorded result without duplicating rows. `db:verify-import` compares counts plus repository-reconstructed stable IDs, graph versions, hashes, truth states, approval payloads, publication links, and ranked aggregate order. The source JSON and uploads remain unchanged for rollback.

## Verification

```bash
pnpm db:test
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`db:test` uses only `axiom_test`, drops and recreates its schemas between tests, verifies migration down/up, cross-organization denial, composite foreign keys, importer idempotency, outbox claiming, and idempotency-key conflicts.

## Local reset

```bash
pnpm db:reset
```

The reset script refuses non-local hosts and database names other than `axiom` or `axiom_test*`. It deletes local database state, reapplies migrations, and recreates the local organization/workspace. It does not delete `.axiom-data` uploads or JSON migration sources.

## Stop services

```bash
pnpm db:down
```

`db:down` preserves the named volume. Volume deletion is intentionally not automated because it is destructive.

## Verified local result — 2026-07-20

- PostgreSQL 17 Docker container: healthy on `127.0.0.1:54329`.
- Drizzle migration history: three forward migrations applied; foundation down/forward cycle passed in `axiom_test`.
- PostgreSQL integration suite: 5/5 passed, covering migration reversibility, organization isolation, composite foreign keys, outbox/idempotency, importer replay, and ranked graph round trips.
- Prototype source SHA-256: `1792939575192807462e31f5e7aa5f9ec479428ea52e593e60e4cf375be6b8cb`.
- Import parity: valid with zero count, stable-field, or aggregate-order errors across 24 projects, 23 sources, 23 graph versions, 420 knowledge entities, 246 versioned documents, 14 approvals, 6 connector publications, and 9 wireframe revisions.
- Repository unit suite: 85 passed; PostgreSQL tests are separately run by `pnpm db:test`.
- Browser journey: 5/5 passed.
- PostgreSQL-backed API smoke: `/api/projects` returned all 24 migrated projects; a graph-backed project returned its source, six knowledge entities, four documents, and approved ARB aggregate with HTTP 200.
- Production build: passed. The pre-existing broad Turbopack file-tracing warning from the demo-reset route remains.
- Controlled sandbox: build passed; 6/6 tests passed; 97.56% line, 78.57% branch, 100% function, and 91.66% statement coverage.
- No Vercel or AWS deployment was performed.
