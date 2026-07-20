# ADR 0013 — Opaque sessions, deny-by-default authorization, and immutable audit

**Status:** Accepted

**Date:** 2026-07-21

## Context

The commercial PostgreSQL foundation had organization ownership but no users, memberships, sessions, or security audit log. The new platform API must reject anonymous and cross-organization access before project, billing, AI, or connector endpoints move out of Next.js.

The external login provider has not been selected. Coupling authorization to a vendor SDK now would make the tenant boundary depend on a commercial choice that has not yet been evaluated.

## Decision

Axiom uses an authentication-adapter boundary and server-side opaque sessions:

- session tokens contain 256 bits from Node.js `randomBytes` and carry no identity or authorization claims;
- PostgreSQL stores only SHA-256 token hashes, internal session IDs, user ownership, status, expiry, and revocation state;
- the platform accepts a validated bearer credential for server/local clients and a `__Host-axiom` cookie for the web/BFF path;
- the future web/BFF issuance flow shall use a host-only `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/` cookie and shall not expose the credential to browser storage;
- disabling a user, revoking a membership, suspending an organization, revoking a session, or reaching expiry takes effect through the authoritative database lookup.

NestJS registers one global access guard. Endpoints are denied unless they are explicitly marked public or declare a permission. Organization-scoped permissions require an active user session, active membership, active organization, and a role-to-permission grant.

Security-sensitive actions append organization-scoped audit events. PostgreSQL rejects `UPDATE` and `DELETE` of audit rows through a row-level trigger. Audit metadata may contain internal correlation IDs but never raw session tokens, credentials, source content, or unrelated customer data.

The login initiation, email/OIDC verification, MFA, session rotation, logout, invitation, and account-recovery flows remain pending behind the authentication adapter. This ADR does not claim those flows are complete.

## Local development

The platform provides a localhost-restricted bootstrap command for the existing local organization. It creates or restores one local owner membership, revokes the previous local session, creates a new expiring session, audits the action, and writes the raw token only to a gitignored file with owner-only permissions. It refuses non-local database hosts.

## Consequences

### Positive

- Authorization changes and revocation do not wait for a signed-token expiry.
- The external identity provider can change without changing organization permission policy.
- Every platform controller inherits deny-by-default protection.
- Tenant-isolation behavior is testable against real PostgreSQL.
- Database enforcement prevents application code from silently rewriting audit history.

### Costs and open work

- Each authenticated request currently requires a session lookup and an organization membership lookup.
- Session cleanup, bounded last-seen updates, rotation, logout, concurrent-session policy, MFA, and recovery are not implemented yet.
- Cookie-authenticated mutation endpoints will require explicit CSRF/origin protections in addition to `SameSite`.
- Audit retention, export, legal hold, partitioning, and privileged search remain later Milestone 2/8 work.

## References

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [NestJS authentication and global guards](https://docs.nestjs.com/security/authentication)
- [NestJS claims-based authorization](https://docs.nestjs.com/security/authorization)
- [PostgreSQL trigger behavior](https://www.postgresql.org/docs/current/trigger-definition.html)
