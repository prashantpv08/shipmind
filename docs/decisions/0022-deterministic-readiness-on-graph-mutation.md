# ADR 0022 — Deterministic readiness on graph mutation

**Status:** Accepted  
**Date:** 2026-07-24

## Context

ADR 0021 initially left readiness unknown after a commercial clarification answer. That was safe, but incomplete: readiness is a deterministic projection of the canonical graph, not a hosted-model generation. Deferring it would make graph `N + 1` less inspectable and could let the web show a historical score without an explicit graph-version check.

Readiness must satisfy SRS requirement `FR-REQ-007`: the result is deterministic and its calculation is exposed. It must also preserve graph history and must not imply that documents, architecture, backlog, or external tickets are current.

## Decision

The platform recalculates readiness synchronously inside the same PostgreSQL transaction that creates graph `N + 1` for a clarification answer.

The calculation:

- uses only the new graph's entities and gaps;
- has eight explicit weighted categories totaling 100 points;
- lists open gap IDs and a human-readable explanation per category;
- exposes raw score, applied blocker/security caps, open blocker IDs, and calculation time;
- is validated with Zod before persistence and response; and
- never delegates the score to a model provider.

The complete calculation is persisted on `project_graphs.readiness`. Authorized project readers can retrieve the current graph's result through `GET /api/v1/organizations/:organizationId/projects/:projectId/readiness`. The response always includes the project ID and graph version; the web rejects a mismatch instead of presenting stale readiness.

Graph versions without a persisted calculation return an explicit `null`. A readiness result does not restore or supersede prior approvals. Documents, architecture, backlog, and connector eligibility remain tied to their exact graph version and separate workflows.

## Consequences

- The user receives an immediate, explainable result after an answer without a paid model call or background job.
- Exact idempotent replays return the same persisted calculation and do not create a new score or timestamp.
- Historical graph readiness remains immutable.
- Readiness is not a confidence score and cannot be used as evidence that downstream artifacts were regenerated or approved.
- The calculation policy can evolve only through a versioned product decision and regression fixtures; changing weights silently would make comparisons misleading.
