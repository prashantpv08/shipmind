# ADR 0024 — Exact versioned architecture decision

**Status:** Accepted  
**Date:** 2026-07-24

## Context

Backlog generation previously treated any architecture decision row for the current graph as sufficient. That could not prove which options a person reviewed, which immutable option they selected, or whether regeneration had made the decision stale. It also left ADR and HLD prose disconnected from the exact approved comparison.

## Decision

The Node.js platform owns a deterministic architecture comparison compiler. After the exact current Requirements/SRS/NFR baseline is approved, an authorized user can generate three complete immutable options: Lean, Balanced, and Distributed. Every option records stable identity, graph and generation versions, SHA-256, components, flows, technology boundaries, why and why-not, assumptions, risks, failure modes and mitigations, explicit `UNKNOWN` monetary cost, reconsideration triggers, grounded entity IDs, and deterministic score rationales. All options and the recommendation remain `AI_SUGGESTED`.

Approval is a separate authorized mutation restricted to Owner, Administrator, and Architect roles. It requires the current project ETag, an idempotency key, exact generation ID and hash, exact selected-option ID and hash, and a human rationale. The transaction records an immutable `HUMAN_APPROVED` decision and deterministically compiles versioned HLD and ADR views with exact provenance. It performs no model, connector, or cloud call.

Regeneration preserves earlier generations, options, decisions, and documents but makes the older decision ineligible immediately. Backlog generation and backlog acceptance resolve only a decision that matches the latest valid architecture generation and selected option hash. Legacy decision payloads cannot open the gate.

Prototype document history that predates retained graph snapshots remains immutable. The new graph foreign key is installed `NOT VALID`, which enforces every new or changed row while preserving those legacy rows for an explicit reconciliation workflow.

## Consequences

- The canonical graph and exact approved requirement baseline remain upstream authorities.
- ADR and HLD are deterministic synchronized views, not independent sources of truth.
- No cost range is invented without measured workload and approved provider-price evidence.
- A Product Analyst may generate comparisons but cannot approve architecture.
- Jira/Trello publication and cloud deployment remain separate gated milestones.
