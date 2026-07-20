# Axiom — AI Engineering Operating System

Axiom converts source-grounded business intent into requirements, architecture decisions, implementation-ready work items, controlled delivery handoffs, real verification evidence, and traceable Why / Why Not / Proof answers.

The authoritative commercial product contract is [SRS.md](SRS.md). Ordered implementation work is in [IMPLEMENTATION_BACKLOG.md](IMPLEMENTATION_BACKLOG.md).

## Product direction

- Axiom owns the canonical project graph, Agent Kernel, ticket-quality workflow, traceability, approvals, and evidence.
- Customers publish approved work to Jira, Trello, both, or neither. Axiom does not provide a project-management board.
- Groq and OpenAI are the initial hosted model-provider candidates. Models must pass Axiom’s task-specific evaluations before production use.
- The commercial source of truth is PostgreSQL: Docker PostgreSQL locally and Amazon RDS for PostgreSQL in AWS.
- The application remains a TypeScript modular monolith until measured extraction triggers justify a service.
- AWS ECS Fargate is the initial production orchestrator. Kubernetes/EKS is later scope.
- Axiom does not require owned GPUs and must not be deployed to Vercel.

## Current repository state

The repository contains a working prototype whose durable capabilities include:

- workspace and project intake for bounded PDF, DOCX, Markdown, text, CSV, JSON, YAML, folder-file, and pasted-note sources;
- immutable source references, grounded project intelligence, contextual clarifications, deterministic readiness, and approval invalidation;
- requirements, SRS, NFR, HLD, ADR, OpenAPI, test-strategy, backlog, task-packet, and constitution views;
- optional wireflows compiled into an embedded Excalidraw canvas;
- architecture comparison and human-approved decisions;
- Jira plan preview and explicit publication using the current prototype adapter;
- controlled NotifyFlow code generation, fixed-command verification, evidence, traceability, Why answers, and export.

Prototype filesystem storage, Vercel infrastructure adapters, single-workspace credentials, and Groq-only configuration are migration targets. They are not the commercial architecture and must not be deployed.

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
```

`AXIOM_AI_MODE=fixture` is the deterministic offline mode. Set it to `live` with a server-only Groq key only when intentionally testing the existing live adapter. A live failure is shown honestly and does not silently fall back to fixture output.

`AXIOM_PROJECT_STORE=postgres` selects the commercial local store. `json` exists only as the prototype migration and rollback adapter. Start and migrate PostgreSQL before switching the local application. Source binary files remain local until the S3 adapter milestone; PostgreSQL owns their metadata and references.

The current Jira credentials are prototype-only. The commercial connector will use organization-scoped authorization, idempotent publication, field mapping, reconciliation, and audit. Trello will use the same normalized work-item contract.

## Architecture boundaries

- Domain and application logic lives under `src/` and must remain independent of React and route handlers.
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
