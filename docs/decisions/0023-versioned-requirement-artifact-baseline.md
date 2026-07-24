# ADR 0023 — Versioned requirement artifact baseline

**Status:** Accepted  
**Date:** 2026-07-24

## Context

The commercial graph can change after a human clarification, while imported hackathon documents may have incomplete provenance. Backlog eligibility therefore cannot rely on a project-level “documents approved” flag or an approval that merely shares the graph version. A user must review the exact Requirements, SRS, and NFR content that later work consumes.

## Decision

The Node.js platform deterministically compiles three current-graph views: `requirements`, `srs`, and `nfr`. Each generation creates immutable document versions with SHA-256 content hashes, graph version, compiler version, source/entity provenance, and `AI_SUGGESTED` truth status. Compilation uses only canonical graph, gap, clarification, readiness, and source records; it does not call a model or fabricate acceptance, test, security, performance, or cost evidence.

Approval is a separate authorized mutation. It requires the current project ETag, an idempotency key, a human rationale, and all three exact latest hashes. Approval is blocked while a critical open gap remains and is recorded as immutable `HUMAN_APPROVED` evidence. Regeneration never deletes an earlier approval, but immediately makes it ineligible because its hashes no longer match the latest versions.

The commercial read excludes imported document rows that do not satisfy the new provenance schema. Those rows remain preserved as migration history. The web is a thin BFF and renders the complete content, hashes, provenance, version, and approval before any decision.

Backlog generation and acceptance now require an exact current-artifact approval as well as the separate current architecture decision. Requirement approval alone never opens the architecture, backlog, or connector gate.

## Consequences

- Stable graph truth remains authoritative; compiled Markdown is a reviewable view.
- Repeated generation is deterministic for identical inputs except for immutable IDs, version numbers, and generation time.
- Unknown network results reuse the same idempotency key for the unchanged operation.
- The migration removes the legacy one-approval-per-project uniqueness constraint so approval history survives regeneration. Its rollback is intentionally guarded: it cannot recreate that constraint if multiple historical approvals exist, and it will not delete evidence to force a rollback.
- Architecture options, ADR/HLD compilation, and exact architecture approval are implemented by ADR 0024.
