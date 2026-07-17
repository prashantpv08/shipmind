# 0004 — Guided document-first product journey

## Status

Accepted for the hackathon experience on 2026-07-18.

## Context

The workspace dashboard exposed project storage, extracted entities, readiness, architecture options, documents, Notion, and wireframe controls in one long surface. This made the internal pipeline visible but obscured the primary product story and placed architecture approval before users could review the proposed experience.

The product owner requested a landing-first journey with a focused upload experience, detailed editable documents, HLD diagrams, direct Notion review, an optional wireflow, and a later architecture decision explaining what, why, and why not.

## Decision

The visible journey is:

1. Landing experience.
2. Upload files, folders, or a pasted transcript.
3. Generate and review Requirements, SRS, NFR, and an `AI_SUGGESTED` proposed HLD.
4. Revise individual document sections through a validated provider adapter.
5. Approve the exact document baseline by graph version and document hashes.
6. Optionally generate a requirement-linked wireflow from one of twelve curated product patterns.
7. Compare technology and architecture directions through What, Why, Why Not, failure, cost, and reconsideration views.
8. Approve one architecture option, producing the `HUMAN_APPROVED` ADR and final HLD.
9. Review the complete current artifact set in Axiom or Notion.

The proposed HLD and final HLD both contain system-context, component, deployment, and primary-sequence Mermaid diagrams. The proposed HLD is explicitly not an approved architecture decision. ARB remains the only path that creates the final approved HLD and ADR.

Document revisions create a new immutable document version with parent version, section, instruction, provider, graph version, and hash. Revision output remains `AI_SUGGESTED` until the current baseline is approved. A document-only revision does not silently change canonical requirement facts; material product decisions must still enter the graph through the clarification workflow.

Wireflow generation accepts either the current approved document baseline or a current ARB decision. It remains optional and never blocks architecture review.

## Consequences

- The default page is a focused product landing page rather than the workspace dashboard.
- Projects live in an on-demand library drawer and can be deleted with explicit confirmation.
- Notion is a first-class review destination from the project and document reader.
- Legacy projects remain readable and expose an explicit rebuild action instead of rendering generic `UNKNOWN` architecture cards as complete recommendations.
- The wireframe template registry grows from six to twelve categories, and the selected template changes screen definitions, navigation, accent, and canvas content.
- The ordering differs from the original P0 demo narrative. The distinction between proposed and approved HLD preserves the SRS requirement that architecture approval and the final ADR remain explicit.
