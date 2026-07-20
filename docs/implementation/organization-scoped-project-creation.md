# Organization-scoped project creation

## User outcome

An authorized organization member can create a draft project in one of that organization's workspaces from the local commercial web flow. A network retry cannot create a duplicate, a workspace from another tenant cannot be targeted, and the platform records immutable audit evidence in the same database transaction as the project.

## Scope and ownership

The Node.js platform owns workspace discovery, create authorization, validation, persistence, idempotency, and auditing. Next.js owns the form and a thin browser-specific BFF; it does not contain project-creation domain logic. This slice creates project metadata only. Source ingestion, project aggregates, archive/restore, and permanent deletion remain separate migrations.

No schema migration was needed. Existing PostgreSQL tables and constraints already support organization/workspace ownership, project row versions, immutable audit events, and idempotency records.

## Platform contract

- `GET /api/v1/organizations/:organizationId/workspaces` returns a bounded, cursor-paginated list after membership and `workspace:read` authorization.
- `POST /api/v1/organizations/:organizationId/projects` accepts a strict `{ workspaceId, name }` body and a required `Idempotency-Key` header.
- Owners, administrators, product analysts, and architects receive `project:create`; developers, reviewers, and viewers remain read-only.
- The repository validates the workspace with one predicate containing both organization ID and workspace ID. Missing and cross-tenant workspaces produce the same safe 404.
- A single PostgreSQL transaction reserves the idempotency key, creates the `DRAFT` project, writes `PROJECT_CREATED` audit evidence, and stores the completed response.
- Repeating the same key and canonical request returns the original project. Reusing that key for different input fails with 409. A failed workspace lookup rolls back the reservation and all other writes.
- Responses include `rowVersion: 1` and an ETag derived from the stable project ID and row version. These seed optimistic concurrency for later project mutations; creation itself has no prior project version to match.
- Audit metadata contains stable identifiers and request context, not the project name or other mutable content.

The adapter currently stores a 24-hour idempotency expiry timestamp, but expiry cleanup and expired-key reuse are not yet enforced. Until that lifecycle is implemented, a completed key continues to replay. This is safe against duplicate creation but must be completed before production retention policy is finalized.

## Web behavior

- The server-rendered project page loads project metadata, organization role, and available workspaces in parallel.
- The create form appears only for roles that may create. This is a usability restriction; the platform permission guard remains authoritative.
- Every input change starts a new idempotency attempt. A network failure preserves the current key and user input so an uncertain request can be retried safely.
- The form exposes idle, loading, success, unavailable-workspace, read-only, and failure states.
- The mutation BFF requires an exact same-origin request, validates the body and idempotency key, forwards only the server-held session, and validates the platform response before returning it.

## Verification evidence — 2026-07-21

Platform:

- `pnpm check`: passed lint, typecheck, six offline tests, and the production build.
- `pnpm test:db`: 2 files and 15 PostgreSQL integration tests passed.
- The database tests prove scoped workspace discovery, authorized creation, viewer denial, cross-tenant and missing-workspace rejection, full rollback, single audit creation, audit immutability, same-request replay, different-request conflict, and stable ETag/row-version output.

Web:

- Targeted platform/session contract tests: 7 passed.
- `pnpm lint`, `pnpm typecheck`, and `pnpm build`: passed.
- `pnpm test`: 14 files and 92 tests passed; 5 PostgreSQL-only prototype-migration tests were skipped without their explicit test database.
- The local Playwright commercial flow: 2 passed against the compiled local platform. It proves the real authenticated project-read boundary and that a create retry after a simulated network failure reuses the exact idempotency key.
- The browser creation request was intentionally intercepted, so this verification did not write a project to the main local database. Authoritative project writes are covered against the disposable PostgreSQL test database.
- No Vercel or cloud deployment was performed.

## Next slice

Implement project archive and restore as explicit lifecycle commands using `If-Match` with the existing ETag/row version, scoped permissions, immutable audit events, and integration tests for stale writes and recovery. Permanent deletion remains deferred until retention and dependency rules are approved.
