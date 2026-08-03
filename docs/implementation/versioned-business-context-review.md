# Versioned Business Context review

## Outcome

An authorized product role can persist the exact current Business Context preview as an immutable version. An authorized decision-maker or Reviewer can then accept the exact hash, reject it with categorized feedback, or accept-with-edits by recording bounded proposed graph mutations. The latter remains `HUMAN_REVIEWED`, never `HUMAN_APPROVED`, and does not rewrite the canonical graph.

## Platform boundary

- `GET /api/v1/organizations/:organizationId/projects/:projectId/business-context/current` reads only the latest version and review for the current canonical graph.
- `POST .../business-context/generations` requires the exact graph version, preview content hash, project ETag, idempotency key, authorized organization role, and active current graph.
- Generation recompiles inside the PostgreSQL transaction and rejects a stale preview hash before inserting evidence.
- `POST .../business-context/reviews` requires the exact latest version ID, content hash, graph version, project ETag, idempotency key, and review permission.
- `ACCEPT` requires no critical gaps, Business Context unknowns, or unresolved experience-applicability decision.
- `ACCEPT_WITH_EDITS` requires at least one bounded proposed graph change. It records `PROPOSED_GRAPH_MUTATION` entries but does not mutate or approve canonical truth.
- `REJECT` preserves categorized feedback and the rejected immutable version.
- A version receives at most one review. Regeneration creates a new immutable version; a canonical graph-version change causes the current read to return no version or review for the new graph while preserving all history.

## Persistence and evidence

- Migration `0019_business_context_versions` adds tenant-scoped `business_context_versions` and `business_context_reviews` tables, graph and user foreign keys, exact content hashes, immutable JSON payloads, and unique version/review boundaries.
- Both mutations increment the project row version and return the new ETag.
- Idempotency reservations and successful replay responses are transactionally stored before returning success.
- Audit metadata includes exact version/hash, decision/category, and hashes of review text and proposed changes; audit metadata does not duplicate customer review plaintext.
- The workflow is deterministic and non-billable. It creates no AgentRun, ModelCall, connector action, external publication, or cloud resource.

## Web flow

The Business Context page loads organization access, project state, deterministic preview, and current version/review in parallel from Server Components. Same-origin route handlers validate mutation input before forwarding the server-only platform credential. The client surface exposes idle, submitting, success, known failure, unknown-result safe retry, role-restricted, blocked-approval, and reviewed states. Proposed edits are visibly labeled non-canonical.

## Verification evidence

- Platform lint, typecheck, and production TypeScript build: passed.
- Platform full non-database suite: 54 passed and 73 database-gated tests skipped.
- Business Context compiler/schema unit suite: 5 passed.
- Focused PostgreSQL versioning/review suite: 2 passed against local `axiom_test` after clean-schema migration. It covers exact generation, safe replay, Reviewer approval, read-only access, regeneration invalidation, graph-version invalidation, stale preview rejection, permission denial, critical-gap approval blocking, accept-with-edits, reject, audit integrity, and cross-tenant denial.
- Migration rollback: both Business Context tables were removed from the disposable test database by `0019_business_context_versions.down.sql`, absence was queried explicitly, and the forward migration restored all tables, constraints, and indexes.
- Web full suite: 140 passed and 5 skipped.
- Focused web Business Context loader/BFF tests: 9 passed, covering parallel current-state loading, exact mutation forwarding, same-origin enforcement, proposed-edit integrity, semantic review validation, malformed-response rejection, and not-ready behavior.
- Web lint, typecheck, and Next.js webpack production build: passed. The build manifest includes the Business Context page plus generation and review route handlers.

## Remaining gaps

- The current keyword compiler is not the dedicated business-discovery graph model or a production-approved Agent Kernel workflow.
- Proposed graph changes are preserved but are not yet routed into the clarification/graph-mutation workflow; they cannot silently take effect.
- There is no generated information architecture, user journey, wireframe set, design-quality evaluation, or approved Experience Baseline yet.
- Browser E2E, dedicated accessibility audit, bounded-payload stress, cancellation/concurrency, and budget-path tests remain open in Milestone 4.5.

The next slice is dedicated BusinessOutcome, Actor, Job, OperatingWorkflow, and SuccessMeasure graph entities with a bounded discovery workflow and evaluation corpus.
