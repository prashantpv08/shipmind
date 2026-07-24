# ADR 0021 — Versioned human clarification mutations

**Status:** Accepted  
**Date:** 2026-07-24

## Context

Ticket generation correctly stops on a critical unknown, but the commercial platform previously had no authorized path to resolve the stored question. The prototype mutation lived in a Next.js route and updated filesystem state. Reusing it would make the web server a business-logic owner and would not provide PostgreSQL transactionality, tenant isolation, stale-write protection, or commercial audit evidence.

A clarification answer is a material product decision. It must not silently rewrite the graph version that already supports document, architecture, backlog, or connector evidence.

## Decision

The Node.js platform owns clarification answers. Owners, administrators, product analysts, and architects may answer an open stored question through an organization-scoped endpoint. The request requires the current project ETag and an idempotency key.

One PostgreSQL transaction:

1. locks the organization-scoped project and verifies its row version;
2. verifies that the question and linked gap are open on the current graph;
3. creates graph version `N + 1` while retaining all stable entity, gap, and question IDs;
4. marks the selected question and gap `ANSWERED` and `HUMAN_CONFIRMED` only in the new graph;
5. creates a deterministic human-answer knowledge entity linked to the question;
6. recalculates and persists deterministic readiness for graph `N + 1` and sets the project to `ANALYZED` or `NEEDS_CLARIFICATION` according to remaining critical gaps;
7. increments the project row version and records an immutable audit event; and
8. completes the idempotency record with the exact response.

The answer text is canonical graph content but is not copied into the API response or audit metadata. The audit event stores its SHA-256 hash. Historical graph rows, approvals, architecture decisions, and work-item generations remain immutable. Because they reference graph `N`, they are ineligible for graph `N + 1` review or publication.

The readiness part of this decision is detailed by [ADR 0022](0022-deterministic-readiness-on-graph-mutation.md). This slice still does not claim regenerated documents or architecture. Those outputs must be produced by their commercial workflows from graph `N + 1`; until then, the UI reports them as requiring regeneration and reapproval.

## Consequences

- A human answer cannot be mistaken for model-generated or source-grounded content.
- Exact retries do not create multiple graph versions; changed reuse of an idempotency key fails.
- Stale browser tabs cannot overwrite a newer project decision.
- Answering one question may leave the project in `NEEDS_CLARIFICATION` when another critical gap remains open.
- Previous approvals and backlog drafts remain inspectable evidence but are clearly historical and cannot be reviewed as current.
- Jira, Trello, hosted-model, billing, and cloud side effects are outside this transaction.
