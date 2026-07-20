# Identity, organization, and audit foundation

## User outcome

The dedicated platform API can authenticate a revocable server-side session, authorize it against an active organization membership, deny cross-tenant access, and record immutable audit evidence in PostgreSQL.

## Implemented slice

- Copied the verified `0000`–`0002` PostgreSQL migration history into `axiom-platform` without changing its contents.
- Added migration `0003_identity_guardian` for users, memberships, sessions, and audit events.
- Added foreign keys, canonical-email and status checks, role checks, token-hash checks, lookup indexes, and an audit immutability trigger.
- Added the provider-neutral authentication adapter and PostgreSQL opaque-session implementation.
- Added permission metadata and one global deny-by-default NestJS guard.
- Added role-to-permission policy for the SRS launch roles.
- Added authenticated `GET /api/v1/organizations/:organizationId` with `Cache-Control: no-store`.
- Added authenticated `GET /api/v1/me/organizations` for the web bootstrap, returning only active memberships and auditing each returned organization.
- Added local-only session bootstrap that never prints or stores the raw token outside ignored owner-only files.

## Verification evidence — 2026-07-21

Platform verification:

- `pnpm lint`: passed;
- `pnpm typecheck`: passed;
- offline `pnpm test`: 2 files passed, 1 database file skipped without an explicit test database; 6 tests passed and 5 database tests skipped;
- `pnpm test:db`: 1 file and 5 PostgreSQL integration tests passed;
- `pnpm build`: passed.

The PostgreSQL tests execute migration `0003` from a clean `axiom_test` database and verify:

- an active member receives only their organization;
- another valid tenant's organization returns HTTP 403 without its name in the response;
- missing, revoked, and expired sessions return HTTP 401;
- authorized access writes the expected audit event;
- the current-user endpoint returns only the caller's active organization memberships and writes corresponding audit evidence;
- PostgreSQL rejects both update and deletion of that audit event;
- the identity down migration removes the new tables from the disposable test database.

The migration was then applied to the local `axiom` database. Verification showed one existing organization, all 24 existing projects, and the four new identity tables. No existing project data was changed or removed.

A real compiled-process smoke test returned:

- HTTP 200 with role `OWNER` for `ORG-LOCAL-DEVELOPMENT` using the local ignored session credential;
- HTTP 401 with stable code `UNAUTHENTICATED` when the same endpoint was called without a credential.

The local database recorded `LOCAL_SESSION_CREATED` and `ORGANIZATION_VIEWED` audit events. The raw session token was not printed, queried, or included in audit evidence.

## Incomplete work

This foundation does not yet claim full Milestone 2 completion. Remaining work includes:

- selecting and implementing the real email/OIDC authentication adapter;
- production identity verification, cookie issuance, rotation, recovery, server-side logout/revocation, and session cleanup; the local-only BFF bridge is documented separately;
- invitation and membership-management APIs;
- MFA for organization owners;
- permission coverage for every migrated project and administrative API;
- archive, restore, retention, deletion, audit search/export, and exhaustive tenant-isolation tests.

The next vertical slice is the web/BFF session flow and current-user organization bootstrap, followed by organization-scoped project reads.
