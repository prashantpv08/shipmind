# Work-item human review

## User outcome

Authorized reviewers can make one attributable final decision on the latest exact Agile backlog generation:

- accept the generated versions exactly;
- accept with bounded, validated edits that create new immutable WorkItem versions; or
- reject the generation with a categorized reason.

The review does not publish to Jira or Trello. Connector compilation and publication remain separate workflows with their own exact preview and explicit external-write approval.

## Platform boundary

The authoritative endpoint is:

```text
POST /api/v1/organizations/:organizationId/projects/:projectId/work-item-generations/:generationId/reviews
```

It requires:

- an authenticated organization membership with `work-item:review` permission;
- the generation's exact `If-Match` value;
- an idempotency key;
- `ACCEPT`, `ACCEPT_WITH_EDITS`, or `REJECT`;
- a permitted reason category and an explanation of 10–2,000 characters.

Owners, administrators, product analysts, architects, and reviewers can submit reviews. Developers and viewers remain read-only. Every platform and repository query is organization-scoped.

## Immutable data model

Migrations `0007_work_item_human_review` and `0008_work_item_review_tenant_scope` add:

- `work_item_reviews`, containing the final decision, category, explanation, reviewer, original generation hash, reviewed content hash, quality report, and timestamp;
- `work_item_review_items`, containing the exact ordered WorkItem-version selection covered by the decision;
- composite organization/project/generation integrity for review ownership;
- database triggers preventing updates to review records, review selections, generation selections, generation content, and existing WorkItem versions.

Retention workflows may delete records in dependency order, but ordinary application code cannot rewrite review evidence. Rollback refuses to remove review tables while review records exist.

## Decision rules

Acceptance requires the generation to remain the latest draft, the canonical graph version to remain current, document and architecture approvals to remain valid, no blocker gaps to be open, and the reviewed result to pass deterministic ticket-quality gates.

Accept-with-edits currently permits bounded changes to title, priority, estimate, outcome, context, scope, and out-of-scope. Source links, hierarchy, acceptance criteria, dependencies, risks, open questions, and evidence expectations remain protected in this slice. Only materially changed items receive a new immutable version.

Rejection remains available when the graph has changed so that a reviewer can record why a stale draft is unusable. It still requires the exact generation hash and a categorized explanation.

Submitting the same decision again with the same idempotency key returns the stored result. A different request or stale hash fails closed. Each successful decision creates one immutable audit event without copying the review explanation into audit metadata.

Regeneration supersedes only an unreviewed draft. Previously approved or rejected generations and their selected versions remain preserved.

## Web behavior

The backlog page server-loads the exact preview. A small client decision form provides:

- accept, accept-with-edits, and reject modes;
- structured categories and explanations;
- bounded structured editing instead of arbitrary JSON;
- honest loading, success, blocked, stale, error, and unknown-result states;
- retry-key preservation when the outcome is unknown;
- visible reviewed hashes, reviewer identity, timestamp, decision, and reason.

The browser never receives the platform session credential. The Next.js route validates origin, route identifiers, `If-Match`, idempotency, and the review body before forwarding to the platform.

## Verification evidence

Local verification covers:

- strict TypeScript, lint, platform unit/contract tests, ticket evaluation, and platform build;
- 36 PostgreSQL integration tests, including immutable updates, tenant isolation, authorization, exact-hash concurrency, idempotent replay, graph invalidation, accepted edited versions, categorized rejection, audit records, forward migration, and guarded rollback;
- 102 web unit tests, including BFF same-origin and exact forwarding behavior;
- five commercial Playwright journeys, including unknown-result retry of the same review decision;
- the Next.js production build.

No paid model, Jira/Trello write, AWS resource, Vercel deployment, or other external side effect is used by this slice.

## Remaining work

- full structured editing of acceptance criteria and other protected fields with specialized validation;
- reviewed-dataset curation and acceptance/material-rewrite reporting;
- optional independent semantic review behind organization policy;
- connector-specific immutable publication previews and explicit publication authorization.
