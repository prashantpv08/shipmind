# ADR 0012 — Separate web, platform, and infrastructure repositories

**Status:** Accepted

**Date:** 2026-07-20

## Context

The hackathon prototype uses one Next.js repository for the user interface, HTTP route handlers, domain logic, provider adapters, persistence, and controlled execution. This minimized delivery time, but it couples commercial API ownership and worker lifecycles to the web framework.

Axiom now needs an independently owned API contract, durable background work, organization isolation, connector side effects, budget enforcement, and infrastructure controls. The current domain code is TypeScript and is already substantially isolated from React, so a bounded extraction is safer than a language rewrite.

## Decision

Axiom shall use three Git repositories:

1. `axiom-web` uses Next.js for presentation, server rendering, session integration, and thin browser-specific Backend-for-Frontend behavior.
2. `axiom-platform` uses Node.js TypeScript, NestJS, and the Fastify adapter for the authoritative `/api/v1` API and a separately runnable worker.
3. `axiom-infrastructure` owns Terraform configurations and infrastructure delivery controls.

The platform remains a modular monolith. API and worker processes can scale independently from the same versioned codebase, but domain modules are not extracted into network services without the measured triggers in SRS Section 9.5.

OpenAPI is the cross-repository HTTP contract. Zod validates runtime boundaries and domain invariants. The web shall use a generated, versioned client rather than importing platform domain or persistence code.

Next.js route handlers are permitted only for browser-specific concerns such as session exchange, OAuth callbacks, same-origin proxying, and response shaping. They shall not own domain decisions, canonical persistence, model orchestration, billing enforcement, connector publication, or long-running work.

No Terraform apply, AWS resource creation, Vercel deployment, or other external deployment is authorized by this decision.

## Why Node.js rather than Java for launch

- The verified prototype domain and validation code is already strict TypeScript.
- The launch workload is dominated by database, model-provider, object-storage, queue, and connector I/O.
- A TypeScript platform avoids an immediate rewrite and allows one validation and contract toolchain during migration.
- NestJS provides explicit modules, dependency injection, guards, interceptors, test seams, and OpenAPI integration while Fastify supplies the HTTP adapter.

Java with Spring Boot remains a valid future option when measured CPU workloads, customer requirements, team ownership, or JVM-specific integrations justify a service boundary. It is not introduced speculatively.

## Consequences

### Positive

- Web release concerns no longer define API and worker architecture.
- Long-running jobs cannot depend on a browser request remaining open.
- Terraform credentials, state access, and approval controls are isolated from application changes.
- The platform can later expose an API to non-web clients without treating the web repository as the backend.

### Costs

- Cross-repository API evolution requires contract versioning and compatibility tests.
- Local development needs coordinated web, API, worker, and PostgreSQL processes.
- Existing Next.js routes and direct frontend domain imports require incremental migration.

## Migration and rollback

1. Keep the current repository runnable and treat it as the migration source for `axiom-web`.
2. Establish the platform health, error, correlation, and OpenAPI foundation before moving business behavior.
3. Inventory each Next.js route and its domain, database, provider, and side-effect dependencies.
4. Move one vertical slice with contract and end-to-end tests.
5. Switch only that frontend caller to the platform API.
6. Remove the old route after parity and rollback checks pass.
7. Retain the previous working commit as the rollback point for every slice.

If the platform foundation cannot meet the existing local behavior, keep the affected caller on the current route and correct the platform contract; do not duplicate writes across both paths.

## References

- [Next.js Backend for Frontend guide](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Node.js introduction](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
- [NestJS first steps and supported HTTP platforms](https://docs.nestjs.com/first-steps)
- [NestJS OpenAPI integration](https://docs.nestjs.com/openapi/introduction)
- [Terraform configuration organization](https://developer.hashicorp.com/terraform/enterprise/workspaces/configurations)
