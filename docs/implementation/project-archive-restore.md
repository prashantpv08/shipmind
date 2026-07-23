# Project archive and restore

## User outcome

An organization owner or administrator can archive a project after reviewing an inline confirmation and later restore it to its exact pre-archive lifecycle status. A stale browser cannot overwrite a newer project version, another tenant's project remains undiscoverable, and every successful transition has immutable audit evidence.

## Scope

This slice implements recoverable project archive and restore only. It does not implement permanent deletion, retention expiry, legal hold, dependency checks, organization lifecycle, or bulk actions. Archived projects remain visible with `ARCHIVED` status so recovery is explicit; Axiom is still not a project-management board.

## Data migration

Migration `0004_project_archive_lifecycle` adds:

- `ARCHIVED` to the constrained project status set;
- nullable `archived_at` and internal `archived_from_status` columns;
- a constraint requiring both archive fields only while status is `ARCHIVED`;
- a constraint preventing `ARCHIVED` from being stored as the restore target.

Existing projects remain unchanged with null archive metadata. The down migration refuses to run while any project is archived, preventing accidental loss of restore state. After all projects are restored, rollback removes the two columns and reinstates the prior status constraint. The migration was applied only to local PostgreSQL.

## Platform behavior

- `POST /api/v1/organizations/:organizationId/projects/:projectId/archive` requires `project:archive` and a strong `If-Match` project ETag.
- `POST /api/v1/organizations/:organizationId/projects/:projectId/restore` requires `project:restore` and the same precondition.
- Owners and administrators receive both permissions. Other roles remain unable to change lifecycle state.
- The repository locks the organization-scoped project row, verifies the expected row version, applies the centralized lifecycle transition, increments `row_version`, and writes `PROJECT_ARCHIVED` or `PROJECT_RESTORED` audit evidence in one transaction.
- Archive retains the exact active status internally. Restore clears archive metadata and returns to that status without changing graph version.
- Missing `If-Match` returns 428. A valid but stale ETag returns 412. Invalid state returns 409. Missing and cross-tenant project IDs share the same safe 404.
- Concurrent commands using the same ETag serialize under the row lock: one succeeds and one receives 412; only one audit event is recorded.
- Project reads and successful lifecycle responses expose `archivedAt`, `rowVersion`, and the current ETag.

## Web/BFF behavior

- The server-rendered project list exposes lifecycle controls only to owners and administrators. This is a usability boundary; the platform remains authoritative.
- Archive requires an inline confirmation naming the exact project and explaining that its data is retained and recoverable.
- Restore is available for archived projects.
- The client sends the ETag derived from the loaded stable project ID and row version.
- The thin BFF requires exact same-origin mutation, validates organization/project IDs and the ETag, uses only the server-held session, forwards the precondition, validates the successful platform response, and forwards the new ETag.
- Loading, success, denied/not-found failure, stale/conflicting state, unknown network outcome, refresh, confirmation, and cancellation states are visible. An unknown response instructs the user to refresh before retrying because the first command may have committed.
- A client-side in-flight guard prevents accidental duplicate requests; the database precondition remains the correctness boundary.

## Verification evidence — 2026-07-21

Platform:

- `pnpm check`: lint, typecheck, 8 offline tests, and production build passed.
- `pnpm test:db`: 2 files and 20 PostgreSQL integration tests passed against the disposable `axiom_test` database.
- Tests cover transition rules, exact-status restoration, row versions and ETags, audit metadata, missing and stale preconditions, competing commands, invalid state, cross-tenant no-leak behavior, viewer denial, rollback refusal with archived data, and successful rollback after restoration.

Web:

- Targeted lifecycle BFF and platform-request tests: 2 files and 10 tests passed.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed after regenerating and removing only a truncated generated `.next/dev` cache left by the temporary Playwright server.
- `pnpm test`: 15 files and 95 tests passed; 5 PostgreSQL-only prototype-migration tests were skipped without their separate database.
- `pnpm build`: passed and includes the archive and restore BFF routes.
- Local Playwright: 3 flows passed against the compiled localhost platform, including archive confirmation and stale-version reconciliation.
- Browser lifecycle mutation was intercepted, so no main local project was archived. The authoritative state changes are proven against the disposable test database.
- No Vercel, AWS, or other cloud deployment was performed.

## Remaining lifecycle work

Permanent deletion remains blocked on approved retention periods, legal-hold behavior, dependency inventory, export/backup expectations, explicit confirmation language, and recoverability policy. Those decisions should be recorded before implementing deletion.
