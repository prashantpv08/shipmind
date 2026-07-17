# Decision 0002: Wireframe engine and deployment boundary

- Status: Accepted
- Date: 2026-07-18

## Context

Axiom must generate wireframes that remain visible and editable inside the product. Figma MCP quotas, Miro OAuth, and Penpot deployment/API maturity introduce external dependencies that can break the hackathon journey. A hand-built DOM/SVG editor or a new C++/WASM rendering engine would require selection, text editing, input-method support, clipboard, accessibility, history, serialization, export, and viewport behavior before it demonstrates any Axiom-specific value.

The product also needs a deployment shape that is reliable for a live hackathon while preserving future enterprise boundaries.

## Decision

1. The hackathon product is a **modular monolith in the existing pnpm monorepo**: one deployable application, one canonical project graph, and explicit domain/module interfaces.
2. The Wireframe module embeds the MIT-licensed `@excalidraw/excalidraw` canvas engine. Next.js supplies the product shell and route handler; Excalidraw owns interactive canvas rendering, editing, pan/zoom, history, and export.
3. `src/projects/wireframes.ts` is an engine-neutral compiler. It converts the current graph, human-approved ARB decision, and current HLD into validated scene nodes with stable IDs and truth/evidence metadata.
4. The browser adapter maps those validated nodes to Excalidraw elements. Editable scene data is a compiled design view, never the canonical requirements source.
5. Every generated screen remains `AI_SUGGESTED`. Source-grounded nodes retain graph entity IDs; unresolved behavior remains `UNKNOWN`.
6. Scene JSON and SVG can be exported for optional work in Figma, Miro, Penpot, or other tools without making those services part of the critical demo path.

## Why not microservices now

Separate services would add deployment coordination, cross-service contracts, observability, network failure modes, and authentication without improving the P0 demo. Module boundaries are kept extractable. A separate generation worker becomes justified when jobs require durable queues or independent scaling; a collaboration service becomes justified when multi-user synchronization is implemented; a customer-controlled runner remains a future trust boundary already anticipated by the SRS.

## Why not C++/WASM now

WASM can improve rendering or geometry hot paths at very large scene sizes, but it does not remove the browser integration work for text, accessibility, input, clipboard, and persistence. If profiling later proves the embedded engine insufficient, the engine-neutral node contract allows a Rust/WASM or CanvasKit/WebGPU adapter to replace it without changing project truth or API gating.

## Consequences

- The live demo has no wireframe SaaS credential or quota dependency.
- Users see and edit generated scenes inside Axiom.
- Excalidraw compatibility with the repository's React version is a build and browser verification gate.
- Real-time collaboration and server-persisted user edits remain out of the current P0 unless separately prioritized.
