# Decision 0001: Workspace intake and design handoff

- Status: Accepted for UI/UX implementation
- Date: 2026-07-17

## Context

The product direction now begins with workspace-scoped project intake. A workspace can contain multiple projects, and each project can receive files, folders, and pasted meeting transcripts before requirement or architecture work starts.

This expands the original hackathon SRS, which intentionally excluded arbitrary repository ingestion and live meeting integrations.

## Decision

The current milestone implements a real source-to-document vertical slice:

1. Sources are persisted with bounded file sizes and extracted server-side.
2. Extracted knowledge is separated into requirements, decisions, constraints, risks, NFRs, open questions, and exact source traceability.
3. Requirements, SRS, and NFR compiled views can be published to Notion through one configured internal connection.
4. ARB review follows structured documentation and requires explicit human approval.
5. HLD generation is gated by the current approved ARB decision.
6. Axiom Wireframe Studio is the primary in-product wireframe surface after HLD; external design tools are optional export targets.

## Integrity boundary

The UI must not claim that a failed source was analyzed, that unconfigured Notion publishing ran, or that an AI-suggested wireframe represents approved product behavior. The internal Notion connection is suitable for the single-workspace hackathon demo; public OAuth and encrypted per-workspace tokens remain required before multi-tenant release. The existing validated NotifyFlow sample pipeline remains available separately as an interactive sample.
