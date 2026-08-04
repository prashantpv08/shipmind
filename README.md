# Axiom web and migration workspace

Axiom is a governed AI Engineering Operating System that turns source-grounded business intent into approved product experiences, engineering decisions, implementation-ready work, controlled handoffs, and real evidence.

The sole product, architecture-decision, implementation-status, and roadmap authority is [SRS.md](SRS.md). Read [AGENTS.md](AGENTS.md) for repository working rules.

This repository is the working migration source for the future `axiom-web` boundary. It contains the Next.js UI and thin BFF plus legacy prototype modules that remain runnable while commercial domain ownership moves into the sibling `axiom-platform` NestJS/Fastify modular monolith. Do not add new commercial business rules to Next.js route handlers.

## Local prerequisites

- Node.js 22
- Corepack with pnpm
- Docker Desktop or a compatible Docker engine
- The sibling `../axiom-platform` repository

Keep all development local unless an AWS deployment is explicitly authorized. Never deploy this project to Vercel.

## Environment

Copy `.env.example` to `.env.local`. Keep credentials and local session tokens out of version control.

```bash
AXIOM_AI_MODE=fixture
AXIOM_PROJECT_STORE=postgres
DATABASE_URL=postgresql://axiom:axiom-local-only@127.0.0.1:54329/axiom
DATABASE_SSL_MODE=disable
DATABASE_POOL_MAX=10
AXIOM_PLATFORM_URL=http://127.0.0.1:4100
AXIOM_LOCAL_AUTH_ENABLED=true
AXIOM_LOCAL_SESSION_TOKEN_FILE=../axiom-platform/.local/session-token
```

`AXIOM_AI_MODE=fixture` is deterministic and non-billable. Hosted model candidates remain disabled until the SRS evaluation, pricing, data-policy, region, and budget gates pass.

`AXIOM_LOCAL_AUTH_ENABLED=true` is local-development-only. Production ignores the local session installer and requires a real identity-provider adapter.

## Start the commercial local flow

From `../axiom-platform`:

```bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm auth:local-session
pnpm dev
```

In another platform terminal, start the durable source-analysis worker when testing ingestion:

```bash
pnpm dev:worker
```

From this repository:

```bash
pnpm install
pnpm dev
```

Open `http://127.0.0.1:3000/account` and use the local-session action. The web runs on port `3000`, the platform on `4100`, and Docker PostgreSQL is exposed on `54329`.

## Verification commands

Web and migration workspace:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm db:test
pnpm sandbox:build
pnpm sandbox:test
pnpm sandbox:coverage
```

Platform:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:contract
pnpm test:providers
pnpm test:db
pnpm eval:tickets
pnpm build
```

`db:reset` is destructive and restricted to explicitly named local `axiom` or `axiom_test*` databases. Use a disposable test database for forward/rollback migration verification.

## Repository boundaries

- `app/`: Next.js presentation and browser-specific BFF routes.
- `src/platform/`: validated platform client contracts and BFF helpers.
- `src/projects/`, `src/artifacts/`, `src/ai/`, `src/integrations/`, `src/codegen/`, and `src/runner/`: prototype migration sources; move commercial ownership into `axiom-platform` one tested vertical slice at a time.
- `drizzle/`: legacy migration source retained until the commercial schema transition is complete. New commercial migrations belong to `axiom-platform`.
- `sample-inputs/`: bounded local product fixtures, not product documentation.

PostgreSQL and the canonical project graph remain authoritative. Markdown, wireframes, Jira/Trello items, exports, and agent packets are compiled or synchronized views. Never fabricate source grounding, provider outcomes, publication, tests, scans, performance, costs, or evidence.
