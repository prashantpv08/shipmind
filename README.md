# Axiom — AI Engineering Operating System

Axiom converts source-grounded business intent into requirements, architecture decisions, implementation-ready work items, controlled delivery handoffs, real verification evidence, and traceable Why / Why Not / Proof answers.

The authoritative commercial product contract is [SRS.md](SRS.md). Ordered implementation work is in [IMPLEMENTATION_BACKLOG.md](IMPLEMENTATION_BACKLOG.md).

## Product direction

- Axiom owns the canonical project graph, Agent Kernel, ticket-quality workflow, traceability, approvals, and evidence.
- Customers publish approved work to Jira, Trello, both, or neither. Axiom does not provide a project-management board.
- Groq and OpenAI are the initial hosted model-provider candidates. Models must pass Axiom’s task-specific evaluations before production use.
- The commercial source of truth is PostgreSQL: Docker PostgreSQL locally and Amazon RDS for PostgreSQL in AWS.
- The commercial product uses separate web, platform, and infrastructure repositories. The Node.js TypeScript platform remains a modular monolith until measured extraction triggers justify a domain service.
- Next.js is the user interface and thin browser-specific BFF. NestJS with Fastify is the authoritative commercial API and worker platform.
- AWS ECS Fargate is the initial production orchestrator. Kubernetes/EKS is later scope.
- Axiom does not require owned GPUs and must not be deployed to Vercel.

## Current repository state

This repository contains the working migration source for the future `axiom-web` repository. It still includes prototype Next.js API routes and framework-independent domain code so the product remains runnable while bounded slices move to `axiom-platform`.

Its durable capabilities include:

- workspace and project intake for bounded PDF, DOCX, Markdown, text, CSV, JSON, YAML, folder-file, and pasted-note sources;
- immutable source references, grounded project intelligence, contextual clarifications, deterministic readiness, and approval invalidation;
- requirements, SRS, NFR, HLD, ADR, OpenAPI, test-strategy, backlog, task-packet, and constitution views;
- optional wireflows compiled into an embedded Excalidraw canvas;
- architecture comparison and human-approved decisions;
- Jira plan preview and explicit publication using the current prototype adapter;
- controlled NotifyFlow code generation, fixed-command verification, evidence, traceability, Why answers, and export.

Prototype filesystem storage, Vercel infrastructure adapters, single-workspace credentials, and Groq-only configuration are migration targets. They are not the commercial architecture and must not be deployed.

The repository split and safe migration sequence are documented in [ADR 0012](docs/decisions/0012-web-platform-infrastructure-repository-split.md) and [the repository split implementation note](docs/implementation/repository-split-foundation.md).

## Local commands

```bash
pnpm install
pnpm dev
pnpm start
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm demo:reset
pnpm sandbox:build
pnpm sandbox:test
pnpm sandbox:coverage
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm db:import:dry-run
pnpm db:import
pnpm db:verify-import
pnpm db:test
pnpm db:reset
pnpm db:down
```

After `pnpm build`, `pnpm start` serves the local production build. Keep development and verification local unless an AWS deployment is explicitly authorized.

The PostgreSQL setup and migration safety procedure are documented in [docs/implementation/postgresql-foundation.md](docs/implementation/postgresql-foundation.md). `db:reset` is intentionally restricted to local `axiom`/`axiom_test*` databases. AI evaluations, security checks, and release container commands arrive in their ordered commercial milestones.

## Current local environment

Copy `.env.example` to `.env.local` and keep credentials out of version control.

```bash
AXIOM_AI_MODE=fixture
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
AXIOM_DATA_DIR=
AXIOM_PROJECT_STORE=postgres
DATABASE_URL=postgresql://axiom:axiom-local-only@localhost:54329/axiom
DATABASE_SSL_MODE=disable
DATABASE_POOL_MAX=10
NOTION_ACCESS_TOKEN=
NOTION_PARENT_PAGE_ID=
JIRA_BASE_URL=
JIRA_EMAIL=
JIRA_API_TOKEN=
JIRA_PROJECT_KEY=
AXIOM_PLATFORM_URL=http://127.0.0.1:4100
AXIOM_LOCAL_AUTH_ENABLED=false
AXIOM_LOCAL_SESSION_TOKEN_FILE=../axiom-platform/.local/session-token
```

`AXIOM_AI_MODE=fixture` is the deterministic offline mode. Set it to `live` with a server-only Groq key only when intentionally testing the existing live adapter. A live failure is shown honestly and does not silently fall back to fixture output.

`AXIOM_PROJECT_STORE=postgres` selects the commercial local store. `json` exists only as the prototype migration and rollback adapter. Start and migrate PostgreSQL before switching the local application. Source binary files remain local until the S3 adapter milestone; PostgreSQL owns their metadata and references.

The current Jira credentials are prototype-only. The commercial connector will use organization-scoped authorization, idempotent publication, field mapping, reconciliation, and audit. Trello will use the same normalized work-item contract.

For the commercial identity slice, start the local platform on `127.0.0.1:4100`, generate its private local session fixture, and set `AXIOM_LOCAL_AUTH_ENABLED=true` only in local development. The `/account` route installs that fixture into an HTTP-only, same-site cookie and reads organization access through the Next.js BFF. Production ignores the local cookie and the local installer returns 404; a real identity-provider adapter is still required before deployment.

Authenticated organization members can continue from `/account` to the commercial project metadata view. The web validates and forwards list/detail requests through `/api/platform/organizations/:organizationId/projects`; the platform re-authorizes membership and every PostgreSQL project query requires organization scope. The legacy `/api/projects` read/write route remains only for prototype journey parity until full project-aggregate reads and writes have migrated.

## Architecture boundaries during migration

- Domain and application logic currently lives under `src/` and must remain independent of React, Next.js route handlers, and NestJS controllers until migrated into `axiom-platform`.
- New commercial business endpoints belong in `axiom-platform`; do not add new domain ownership to Next.js route handlers.
- The final `axiom-web` repository consumes the versioned OpenAPI client and keeps only presentation-specific types.
- Model-provider behavior is isolated under `src/ai` and validated with Zod.
- Project graph and intelligence behavior lives under `src/projects`.
- External integrations live under `src/integrations`.
- Controlled code generation lives under `src/codegen`.
- Fixed-command execution and evidence parsing live under `src/runner`.
- Traceability and grounded explanations live under `src/traceability`.
- Compiled artifacts and exports are views; they do not replace canonical structured data.

## Development rules

Read these files before making product changes:

1. [AGENTS.md](AGENTS.md)
2. [SRS.md](SRS.md)
3. [IMPLEMENTATION_BACKLOG.md](IMPLEMENTATION_BACKLOG.md)
4. This README

Never fabricate provider outcomes, source quotations, ticket publication, test results, scans, costs, or performance. External writes require explicit approval, and verification must preserve failed and unknown states honestly.
