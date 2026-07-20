# Organization-scoped project metadata reads

## User outcome

An authenticated organization member can open a bounded list of that organization's projects through the web and platform repositories without receiving another tenant's project existence, name, or metadata.

## Scope

This slice migrates project metadata reads only: stable project ID, workspace ID, name, lifecycle status, graph version, and timestamps. It does not claim that sources, graph entities, documents, approvals, publications, project creation, or project deletion have migrated. The legacy Next.js project route remains available solely for prototype journey parity until those larger contracts have replacement evidence.

No database migration was needed. The existing PostgreSQL `projects` table already has organization ownership, the `(organization_id, id)` unique key, the organization/workspace foreign key, lifecycle constraints, graph version, and timestamps.

## Platform boundary

- Added the `projects` modular-monolith module with Zod request/response contracts.
- Added `project:read` to the centralized role policy; every current organization role, including viewer, receives read access.
- Added `GET /api/v1/organizations/:organizationId/projects` with a maximum page size of 100 and opaque cursor pagination ordered by `(updated_at, id)` descending.
- Added `GET /api/v1/organizations/:organizationId/projects/:projectId`.
- Both endpoints declare the project-read permission and inherit the global deny-by-default guard.
- The repository interface cannot list or find a project without an explicit organization scope.
- Project detail queries combine organization ID and project ID in one database predicate. An existing project in another tenant therefore produces the same safe 404 as a missing project.
- Successful responses use `Cache-Control: no-store` and preserve request correlation.

## Web/BFF boundary

- Added same-origin list and detail BFF routes under `/api/platform/organizations/:organizationId/projects`.
- The BFF validates route parameters and pagination, forwards only the server-held opaque session, disables caching, and validates every successful platform payload before returning it.
- Added the server-rendered organization project page reachable from `/account`.
- The page includes loading, unauthenticated, denied, not-found, empty, upstream-failure, retry, populated, and next-page states without exposing the session token to browser JavaScript.
- Corrected the web organization-role contract to match the reviewed platform roles instead of the earlier incomplete `ADMIN`/`MEMBER` placeholders.

## Verification evidence — 2026-07-21

Platform:

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- offline `pnpm test`: 6 tests passed and 10 PostgreSQL tests skipped without the explicit test database.
- `pnpm test:db`: 2 files and 10 PostgreSQL integration tests passed sequentially.
- `pnpm build`: passed with Node.js 22.21.1.

The PostgreSQL tests prove repository-scoped filtering, cursor pagination, viewer access, anonymous rejection, cross-organization path denial, safe detail access, a no-leak 404 for another tenant's real project ID, and invalid-cursor rejection.

Web:

- targeted platform contract tests: 6 passed.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 14 files and 91 tests passed; 5 PostgreSQL-only tests in the web migration source were skipped without its explicit test database.
- `pnpm build`: passed, including the dynamic organization-project page and both BFF project routes.
- the expanded Playwright commercial flow passed against the compiled local API and migrated local PostgreSQL data: session installation, organization bootstrap, visible project list, bounded BFF list, scoped BFF detail, cross-organization denial, and sign-out.

## Next slice

Project creation has now migrated with evidence in `docs/implementation/organization-scoped-project-creation.md`. The next project-lifecycle slice is archive and restore with `If-Match` preconditions, immutable audit evidence, retention rules, and recoverability. Permanent deletion remains separate because it also requires dependency checks and explicit confirmation.
