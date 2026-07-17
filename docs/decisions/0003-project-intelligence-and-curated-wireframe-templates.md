# ADR 0003 — Project intelligence and curated wireframe templates

- Status: Accepted for the hackathon MVP
- Date: 2026-07-18
- Scope: Project intake, clarification, artifact compilation, Notion publication, and Axiom Wireframe Studio

## Context

The source-intake flow previously classified sentences into a small set of knowledge categories, produced generic architecture summaries, generated abbreviated documents, and allowed ARB approval without resolving architecture-blocking unknowns. Wireframe Studio offered an editable canvas but no governed template selection, screen-flow preview, requirement coverage, design-gap overlay, or persisted review revision.

The authoritative SRS requires structured gaps, three to five contextual clarification questions, deterministic readiness, blocker enforcement, complete architecture trade-offs, detailed SRS/NFR/HLD/ADR artifacts, and provenance-preserving graph updates.

## Decision

1. Extend the canonical project graph with validated Gap, ClarificationQuestion, ProjectReadiness, TechStackRecommendation, and enriched ArchitectureOption structures.
2. Treat clarification answers as HUMAN_CONFIRMED graph mutations. Each accepted answer increments the graph version, records its question ID as provenance, recalculates readiness, invalidates a stale ARB decision, and regenerates compiled requirement documents.
3. Enforce P0 blocker resolution in the ARB route rather than relying on a UI warning.
4. Compile detailed SRS, NFR, HLD, and ADR views from the graph. The HUMAN_APPROVED decision is represented by the ADR; other generated content remains AI_SUGGESTED or UNKNOWN where evidence is absent.
5. Maintain one Notion project hub per Axiom project. Later graph publications append a versioned summary and new artifact pages under that hub instead of creating a second project root.
6. Offer six fixed curated Wireframe Studio templates. Template output remains AI_SUGGESTED, source-linked, gap-aware, and architecture-gated.
7. Persist bounded Excalidraw scene revisions in the existing project store with Draft, In Review, or Approved status. The canvas remains an adapter and never becomes the canonical requirements source.

## Why

- It implements the P0 reasoning loop before adding generic whiteboard breadth.
- It gives every document, architecture recommendation, and screen a graph version and review boundary.
- It differentiates Axiom through source-to-screen traceability, explicit unknowns, and approval governance rather than attempting to replace Figma or Miro.
- Fixed templates improve the demo without implementing enterprise template customization, which the SRS classifies as P2.

## Why not

### Fully configurable enterprise template designer

Rejected for the MVP because it is P2, expands the storage and permission model, and does not close a missing P0 acceptance criterion.

### Separate wireframe microservice or WASM renderer now

Rejected because current canvas generation, scene editing, and bounded revision persistence do not require independent scaling or an isolation boundary. The existing modular-monolith boundary remains replaceable.

### Treat generated documents or Notion pages as authoritative

Rejected because direct edits would split truth, break stable traceability, and make readiness and approval behavior nondeterministic.

## Consequences

- Existing graph-v1 records are parsed with schema defaults, while newly analyzed projects use the v2 structures.
- ARB may remain unavailable until the user answers blocker questions.
- Answering a clarification after ARB approval creates a newer graph version and requires a new architecture approval.
- Wireframe screen approval records design review only; it does not convert AI-suggested product behavior into source-grounded requirements.

## Reconsideration triggers

- Extract project intelligence into a service if model workload, queueing, or isolation needs cannot be met inside the deployable.
- Replace JSON scene revision persistence when concurrent editing, real-time presence, or scene history volume requires a dedicated collaborative store.
- Add enterprise template customization only after all P0 acceptance criteria pass and the template governance model is specified.
