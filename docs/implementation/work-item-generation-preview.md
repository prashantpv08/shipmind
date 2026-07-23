# Work-item generation persistence and exact preview

Date: 2026-07-23

## Outcome

Axiom can now compile a bounded, non-billable Agile draft from an approved canonical graph, reject it if deterministic quality gates fail, transactionally persist stable work-item identities and immutable versions, and render the exact persisted generation for local human review.

No model provider, Jira connector, Trello connector, cloud service, or deployment is invoked by this workflow.

## Generation preconditions

The platform, not the browser, requires all of the following:

- active organization authorization with `work-item:generate`;
- the exact current graph version requested by the client;
- project status `HLD_READY`, `PUBLISHED`, or `BACKLOG_READY`;
- document approval for that graph version;
- an approved architecture decision for that graph version;
- no open blocker gap for that graph version; and
- at least one grounded or human-confirmed Requirement or NFR.

Fixture generation is bounded to 100 implementable graph entities. It never silently omits an approved requirement. Stable Epic and Story IDs are derived from project and source-entity identity, not a connector key or generation timestamp.

## Persistence model

- `work_item_generations` records the exact source graph, content hash, quality report, schema, evaluator, prompt, and workflow versions.
- `work_items` keeps the stable canonical identity and current version pointer.
- `work_item_versions` stores the immutable, hash-addressed payload for every regeneration.
- `work_item_generation_items` pins each exact generation to ordered work-item versions.
- idempotency records serialize retries, while a project row lock serializes different generation requests for the same project.
- successful generation and project transition to `BACKLOG_READY` commit with one immutable audit event in the same transaction.

The database rejects updates to `work_item_versions`. Regeneration increments the version while preserving prior content. The migration rollback is guarded while generation records remain.

## Visible review

The Next.js route is an SSR review page with a small client mutation island. It displays:

- explicit `DRAFT · unapproved` state;
- generation ID and content hash;
- schema, grounding, coverage, and item-count evidence;
- exact Epic/Story/Task/Defect content;
- user story, scope, out-of-scope, acceptance criteria and verification method;
- dependencies, risks, evidence expectations, and source entity IDs; and
- honest empty, loading, unavailable, blocked, unknown-result, and safe-retry states.

The web BFF only validates same-origin input, forwards the server-held session and idempotency key, and validates the platform response. It owns no generation or quality rules.

## Verification evidence

- Platform lint, strict typecheck, offline tests, ticket evaluation, and build pass.
- All 31 PostgreSQL integration tests pass, including concurrent idempotency, stable-ID regeneration, immutable version rejection, tenant isolation, authorization, approval blocking, exact latest preview, audit cardinality, and guarded rollback.
- Web lint, strict typecheck, 100 unit/contract tests, and the production build pass.
- All five local commercial browser tests pass, including exact preview rendering and generation retry-key preservation.
- One local approved project produced one Epic and four Stories with 100% source-reference validity and 100% approved-requirement coverage. It remains an unapproved local draft.

## Remaining scope

Human accept/edit/reject decisions, immutable approval snapshots, semantic review, budget reservation, provider-backed generation, organization templates, and Jira/Trello compilation remain open. No publication action is exposed from this page.
