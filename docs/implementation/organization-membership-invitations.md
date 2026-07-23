# Organization membership and invitation governance

Date: 2026-07-23

## Outcome

The platform now owns an organization-scoped governance slice: authorized owners and administrators can list members, list and create invitations, and revoke a pending invitation. An authenticated user whose canonical email matches an invitation can accept it. The web supplies a thin local management surface and never owns these business rules.

## Integrity and security boundaries

- Invitations cannot grant `OWNER`; ownership transfer and owner MFA remain separate work.
- The HMAC-derived acceptance token is reproducible for an idempotent retry, while PostgreSQL stores only a SHA-256 hash.
- Plaintext delivery is available only with `AXIOM_LOCAL_INVITATION_DELIVERY_ENABLED=true` and a secret of at least 32 bytes. It is labeled manual and local-only.
- Create is transactionally idempotent. Revoke uses a row-version ETag and a row lock. Acceptance locks the invitation, requires an exact authenticated-email match, and is replay-safe.
- Tenant scope and permission checks occur in the platform guard and repository. Audits contain an email hash, not the invitation token or plaintext email.
- The migration has a guarded down script and refuses rollback while invitation data exists.

## Verification evidence

- Platform lint, strict typecheck, and offline tests pass.
- All 26 local PostgreSQL integration tests pass, covering create replay, hash-only persistence, expiration, acceptance, revocation concurrency, tenant isolation, role denial, disabled delivery, audit cardinality, and migration rollback.
- Web lint, strict typecheck, and 98 unit/contract tests pass, including same-origin mutation, idempotency forwarding, and exact ETag forwarding.
- The local browser flow verifies member visibility, invitation retry-key preservation, one-time token presentation, existing project flows, and stale-write reconciliation.

## Explicit gaps

Production IdP sign-up/sign-in, verified-email lifecycle, email delivery, role changes, member removal, ownership transfer, MFA, resend/rate-limit policy, and acceptance UI for a second real account are not implemented or claimed. The full backlog item remains open until those flows and their recovery states are complete.
