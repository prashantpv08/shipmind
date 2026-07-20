# Repository split foundation

## User outcome

Axiom can evolve from the working full-stack prototype into separately owned web, Node.js platform, and Terraform repositories without breaking local development or deploying cloud resources.

## Repository responsibilities

| Repository | Owns | Must not own |
|---|---|---|
| `axiom-web` | Next.js UI, accessibility, browser state, SSR, session integration, thin BFF behavior, generated API client | Canonical persistence, domain policy, model routing, billing decisions, connector publication, long-running jobs |
| `axiom-platform` | `/api/v1`, domain/application modules, PostgreSQL access, Agent Kernel, providers, connectors, usage enforcement, worker | React UI, Terraform state, infrastructure credentials |
| `axiom-infrastructure` | Terraform modules, environment composition, plan/apply policy, state-access documentation | Product business logic, application secrets, committed state or secret-bearing plans |

## Current migration boundary

The existing `shipmind` repository is the working source for `axiom-web`, but it still contains business routes under `app/api` and framework-independent modules under `src`. Those files remain until their callers have moved to a tested platform contract.

Direct imports from `app/_components` into `src` show that web presentation types and platform domain types are currently coupled. They shall be replaced incrementally by a generated OpenAPI client and presentation-only view models; they shall not be bulk-deleted before each visible flow has parity evidence.

## Migration order

1. Platform bootstrap: health endpoint, request correlation, stable errors, OpenAPI, tests, build, and local Docker process.
2. Identity and organization boundary: session verification, authorization policy, audit context, and tenant-isolation tests.
3. Project read boundary: list/get with organization scope and cursor pagination.
4. Project mutation and source ingestion boundary.
5. Analysis and Agent Kernel workflows returning durable run IDs.
6. Ticket Quality Engine and immutable review previews.
7. Jira and Trello connector publication through outbox-backed workers.
8. Verification execution and evidence APIs.
9. Remove remaining business routes and platform-domain imports from the web repository.

## Per-slice acceptance and rollback

Before switching a web caller, the platform replacement must have:

- a reviewed OpenAPI operation and runtime validation;
- organization authorization where customer data is involved;
- unit and contract coverage including safe failures;
- database integration coverage where persistence changes;
- visible loading, empty, failure, and retry behavior in the web flow;
- parity evidence for stable IDs, truth status, audit, usage, and side effects;
- a single-writer switch with no dual publication or duplicated canonical mutation.

Rollback changes the web caller back to the last verified route and disables the new endpoint or worker consumer. Database changes require a compatible forward fix or the tested migration rollback procedure; application rollback must never discard accepted customer data.

## Local-only constraint

This foundation creates no AWS, Vercel, managed database, model-provider, Jira, Trello, or other billable resource. Terraform remains configuration-only until the user explicitly authorizes an AWS environment.

## Foundation evidence — 2026-07-20

Created independent local Git repositories at:

- `/Users/prashantverma/projects/axiom-platform`
- `/Users/prashantverma/projects/axiom-infrastructure`

The platform foundation passed:

- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`: 1 file and 3 contract tests passed;
- `pnpm build`.

The contract tests verify `/api/v1/health`, OpenAPI 3.1 publication, safe request-ID propagation, and the stable 404 error envelope. No external network listener or cloud resource was required by the tests.

A real local-process smoke test also started the compiled service on `127.0.0.1:4100` and received HTTP 200 from `/api/v1/health` with the supplied `x-request-id: smoke-test-001`. The process was stopped after the check.

The infrastructure repository policy check passed. Terraform formatting and validation were not executed because the Terraform CLI is not installed locally; they remain unverified rather than being reported as successful. No provider, backend, credentials, environment, plan, or resource configuration was created.
