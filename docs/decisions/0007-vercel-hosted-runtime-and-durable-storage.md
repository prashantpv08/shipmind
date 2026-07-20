# ADR 0007: Vercel hosted runtime and durable storage

## Status

Superseded by `0010-commercial-platform-boundaries.md` on 2026-07-20. This file is retained only as historical context and does not authorize a Vercel deployment.

## Context

The local production build and ngrok tunnel proved the complete visible journey, but an ngrok URL depends on the developer computer, local server, and tunnel process remaining online. A hackathon submission needs a stable hosted URL that survives laptop sleep or shutdown.

Vercel Functions cannot treat their local filesystem as durable shared application state. The controlled verification runner also cannot execute its fixed TypeScript build and tests inside a Function process without weakening the existing isolation boundary.

## Decision

Keep Axiom as the existing Next.js modular monolith and deploy it on the Vercel Hobby plan. Add two environment-selected infrastructure adapters:

1. Local development continues to use `.axiom-data` plus the committed `sandbox/notification-service` workspace.
2. The hosted app uses a private Vercel Blob store for the validated project database, uploaded source files, and verification reports. Writes use Blob ETags so concurrent mutations retry instead of silently overwriting a newer graph.
3. Hosted controlled verification creates an ephemeral Vercel Sandbox with the fixed Node runtime and committed template. Only allowlisted generated files whose hashes match the approved manifest are written.
4. The Sandbox may reach the npm registry only while installing the fixed committed dependency set. Network access is changed to deny-all before the four registered build, unit, API, and coverage commands execute.
5. Notion and Jira credentials remain server-only Vercel environment variables. They are never included in deployment files or returned to the browser.
6. A missing Blob connection is a visible hosted configuration error. The application must never fall back to ephemeral Function storage and imply persistence.

## Consequences

- The submission URL remains available when the developer machine is offline.
- Project data and evidence survive independent Function invocations and new deployments.
- Verification remains real, isolated, bounded, and based on fixed commands; no hosted success result is simulated.
- Local development and tests retain their existing fast filesystem path.
- The free plan has bounded Blob, Function, and Sandbox quotas, so this is suitable for the hackathon prototype rather than an unlimited production workload.
- A later multi-tenant release should move the canonical graph to a transactional database and execute verification through a durable queued workflow, while retaining the same domain interfaces.
