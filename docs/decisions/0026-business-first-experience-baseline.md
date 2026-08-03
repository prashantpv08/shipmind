# ADR 0026 — Make business discovery and the Experience Baseline first-class product stages

## Status

Accepted on 2026-08-03.

## Context

Axiom's commercial contract already governs the path from source-grounded requirements to architecture, engineering plans, work items, connector publication, controlled implementation, and verification evidence. The product vision is broader: Axiom should act like an AI-native Forward Deployed Engineering team that begins with the customer's business reality and helps business, product, design, architecture, and engineering stakeholders converge before implementation.

The prototype contains a useful Wireframe Studio, twelve curated templates, an engine-neutral compiler, an embedded Excalidraw editor, clickable screen transitions, exports, and revision records. Those capabilities are optional in the prototype and are not defined by the SRS 2.1 commercial contract. Screen selection and source distribution are template-driven, wireframe business rules remain in legacy Next.js routes, and the current revision path does not satisfy the commercial platform, organization authorization, immutable approval, evaluation, or design-quality requirements.

Treating wireframes as an optional visual afterthought would allow architecture and delivery scope to be approved without proving that business outcomes, user workflows, product states, and engineering work describe the same product. Treating a canvas as canonical truth would create the opposite failure: visual edits could silently redefine approved business behavior.

## Decision

1. Axiom adds a first-class Business Discovery stage that models business outcomes, actors, jobs, operating workflows, policies, constraints, risks, and success measures with the same grounding and truth-status rules as requirements.
2. Experience-relevant projects add a governed Experience Design stage covering information architecture, user journeys, editable wireframes, screen states, interactions, responsive variants, accessibility annotations, design tokens, reusable components, and prototype transitions.
3. API-only, infrastructure-only, and other non-visual scope uses an explicit, reviewable not-applicable decision. Axiom does not invent screens merely to satisfy a workflow.
4. An authorized approval creates an immutable Experience Baseline bound to exact source, graph, requirement, token, component, and design versions. Downstream architecture, Engineering Plan, work-item, and coding-task workflows must use a compatible current baseline where experience applies.
5. The canonical project graph remains authoritative. Design artifacts are structured, versioned views with stable IDs and typed trace links. A behavior-changing design edit creates an explicit graph-change proposal and cannot silently mutate a grounded requirement, policy, architecture decision, or human confirmation.
6. The application owns design IDs, hashes, revision order, authorization, truth transitions, applicability, quality gates, approvals, invalidation, idempotency, audit, and budget limits. Models may propose design content but cannot approve it or override deterministic failures.
7. "High-quality wireframe" is an evaluated product claim, not a styling claim. Commercial gates cover business-outcome and requirement coverage, critical-flow continuity, applicable state coverage, interaction reachability, role and permission boundaries, responsive completeness, accessibility metadata, traceability, contradictions, blockers, and prohibited evidence claims.
8. The Experience Studio is a governed product-design editor, not a replacement for every general-purpose visual-design workflow. It must provide dependable core editing, reusable project components and tokens, multi-screen prototype review, an evidence inspector, immutable revisions, exact approval, bounded import/export, and a structured non-canvas review path.
9. The current engine-neutral compiler and Excalidraw browser adapter remain migration inputs. Excalidraw is an adapter rather than a domain dependency; replacement requires measured editor, accessibility, performance, format, or licensing evidence.
10. Figma import or publication is Next scope and must use a connector boundary with exact preview, authorization, stable mappings, idempotency, and reconciliation. An external design copy is never authoritative.
11. The commercial implementation lives in `axiom-platform` behind organization-scoped application services and versioned `/api/v1` contracts. Next.js owns the editor presentation and thin browser-specific BFF behavior only.

## Consequences

- SRS 2.2 adds normative business-discovery, experience-design, editor, data, evaluation, accessibility, verification, and launch requirements.
- The implementation backlog adds Milestone 4.5 as the next product-contract priority. Valid later work is preserved, but experience-relevant completion requires a compatible Experience Baseline.
- Existing prototype wireframes and revisions are not discarded, but they cannot be presented as commercial approval evidence until migrated and revalidated.
- Architecture and delivery artifacts gain a clearer business and user-experience input, reducing technically correct implementations of the wrong product.
- The launch scope increases. This is intentional because business-first product convergence is part of Axiom's differentiator rather than an optional presentation feature.
- Canvas interactions need accessible structured alternatives, and scene import/export becomes an untrusted, bounded data boundary.

## Reconsideration triggers

- Replace or supplement Excalidraw when measured editor limitations prevent required structured editing, accessibility, responsive variants, collaboration, performance, or stable interchange.
- Split experience rendering or collaboration into a separate service only when the SRS service-extraction triggers are evidenced.
- Move advanced brand-system administration, real-time multi-user presence, and threaded design collaboration into Launch only when customer validation shows they block adoption.
- Make Figma a launch dependency only when target-customer evidence outweighs the additional authorization, mapping, reconciliation, availability, and commercial risk.

## Superseded scope

This decision supersedes the optional-product-scope assumptions in ADR 0002 and ADR 0003. It preserves their engine-neutral compiler, embedded-editor, source-linking, bounded-revision, and canonical-graph boundaries unless the reconsideration triggers are met.
