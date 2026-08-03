# Business Context preview

## Outcome

An authorized organization member can inspect the exact current canonical graph as a structured Business Context before Axiom proposes an experience or implementation. The view separates grounded or human-confirmed business outcomes, actors, operating workflows, success measures, unknowns, critical gaps, and experience applicability. It does not use a model or claim that an Experience Baseline has been generated or approved.

## Scope delivered

- Added the platform `experience` module and organization-scoped `GET /api/v1/organizations/:organizationId/projects/:projectId/business-context/preview` endpoint.
- Added a provider-independent deterministic compiler with stable item IDs, a content hash, graph-version binding, exact source entity and source IDs, truth statuses, classification coverage, explicit unknowns, and centralized critical-gap reuse.
- Added a fail-closed applicability policy:
  - `APPLICABLE` requires an explicit user-experience signal in the current graph.
  - `NOT_APPLICABLE` requires an explicit non-visual statement such as API-only or no user interface.
  - `NEEDS_DECISION` is returned when the graph is silent; Axiom does not invent screens or silently skip experience design.
- Added a PostgreSQL query boundary that requires organization and project scope and reads only `SOURCE_GROUNDED` or `HUMAN_CONFIRMED` current-graph entities.
- Added the commercial web route `/account/organizations/:organizationId/projects/:projectId/business-context` with source, Engineering Plan, and backlog navigation.
- Added structured non-graph sections for outcomes, actors, workflows, measures, unknowns, unclassified entities, applicability rationale, coverage, blockers, and provenance.
- Added honest loading, not-ready, unauthenticated, forbidden, not-found, unavailable, empty, and retry states.

## Integrity boundaries

- The preview is read-only and creates no graph mutation, approval, audit event, usage record, model call, connector action, or cloud side effect.
- Classifications retain the complete supporting statement rather than inventing a persona name, business value, workflow, or metric.
- A single entity may support more than one business-context category; coverage counts unique classified source entities.
- Unclassified entities remain visible and canonical instead of being forced into a category.
- PostgreSQL timestamps are normalized at the repository boundary before response validation.
- The existing centralized critical-gap policy determines blocker IDs.

## Verification evidence

- Platform lint: passed.
- Platform typecheck: passed.
- Platform unit suite: 53 passed, 71 skipped because PostgreSQL integration tests require the explicit test database environment.
- Focused deterministic compiler tests: 4 passed.
- Focused PostgreSQL integration tests: 2 passed against local `axiom_test`, covering authenticated access, anonymous denial, cross-tenant denial, unanalyzed-project conflict, blocker visibility, and absence of audit evidence.
- Platform production TypeScript build: passed.
- Web lint: passed.
- Web typecheck: passed after the production build regenerated Next route types.
- Web suite: 131 passed, 5 skipped before the new focused contract file; the new Business Context platform-contract tests add 4 passing cases.
- Web production build: passed with Next.js webpack after two Turbopack builds remained stuck in the compile phase and were stopped gracefully. The resulting route manifest includes the dynamic Business Context page.

## Subsequent versioning slice

The preview is now the exact input to an immutable generation and human-review workflow. The added workflow does not change how this deterministic preview is compiled; it verifies the preview hash again inside the transaction before persistence. See [versioned Business Context review](versioned-business-context-review.md).

## Known gaps

- The deterministic compiler remains bounded fixture logic; persistence and human review do not make it qualified production business intelligence or an Experience Baseline.
- Keyword classification is bounded fixture logic and is not qualified production business intelligence.
- The current analyzer does not yet model dedicated BusinessOutcome, Actor, OperatingWorkflow, or SuccessMeasure graph entities.
- No Agent Kernel business-discovery workflow or human-reviewed business-context evaluation corpus exists yet.
- No information architecture, user journey, commercial wireframe generation, design-quality evaluation, or Experience Studio approval is implemented by this slice.

The next product slice is dedicated business graph entities and the bounded Agent Kernel discovery workflow, followed by governed journey and wireframe generation.
