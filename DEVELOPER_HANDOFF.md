# Axiom Developer Handoff

**Prepared:** 2026-07-18 (Asia/Kolkata)  
**Repository:** `/Users/prashantverma/projects/shipmind`  
**Branch:** `main`  
**HEAD when this handoff was created:** `08731ff` — `Add release export and reset flow for NotifyFlow demo`  
**Remote state at handoff:** `main`, `origin/main`, and `origin/HEAD` pointed to `08731ff`  
**Worktree before adding this file:** clean  
**Work continued after this handoff was first created:** see the 2026-07-18 addendum at the end for the Notion SVG, Jira delivery, and coding-task changes now in the worktree.

## 1. Read this first

The repository contract and working order are:

1. `AGENTS.md` — repository execution rules, approved stack, safety boundaries, and definition of done.
2. `SRS.md` — authoritative product contract.
3. `IMPLEMENTATION_BACKLOG.md` — milestone order and remaining release work.
4. `DEMO_SCENARIO.md` — deterministic NotifyFlow demo inputs and expected narrative.
5. `HACKATHON_PLAN.md` — four-day implementation plan and final quality gate.
6. `README.md` — current implementation, setup, environment variable names, demo steps, and module notes.
7. `docs/decisions/` — accepted changes to the original product journey and architecture.

Do not expose, print, paste, or commit `.env.local`. Do not push, merge, or create a pull request unless the product owner explicitly requests it.

## 2. Product intent

Axiom is an **AI Engineering Operating System**, not a notification product and not a generic dashboard. It converts ambiguous project material into a governed engineering journey:

```text
Landing
-> workspace/project intake
-> files, folders, and pasted meeting transcripts
-> source-grounded requirements, SRS, NFRs, gaps, and proposed HLD
-> document review and section-level AI revision
-> exact document-baseline approval
-> optional template-driven wireflow
-> technology and architecture comparison
-> human-approved ARB decision, ADR, and final HLD
-> controlled code generation
-> fixed real verification
-> traceability and grounded Why / Why Not / Proof
-> governed export and deterministic reset
```

NotifyFlow is the preloaded, deterministic demonstration project for the controlled build/proof pipeline. It must not become the product identity.

Core product rules:

- The canonical project graph is authoritative; generated Markdown, Notion pages, exports, and wireframes are compiled views.
- Model output must pass Zod validation before persistence or rendering.
- Source-grounded facts must point to exact stored source text.
- Recommendations remain `AI_SUGGESTED` until the relevant human approval boundary.
- Missing or unverified claims remain `UNKNOWN`.
- Test, coverage, command, performance, security, and accessibility evidence must never be fabricated.
- A proof answer must cite executed evidence or return `UNKNOWN`.
- No arbitrary shell commands, model-selected packages, repository ingestion, or production email/SMS execution.

## 3. Current product experience

### 3.1 Landing and project workspace

`app/page.tsx` currently owns three top-level client states: `landing`, `workspace`, and `sample`.

- `app/_components/landing-experience.tsx` is the futuristic landing page.
- `app/_components/workspace-home.tsx` is the document-first project experience.
- A workspace can store multiple projects.
- The project library is opened on demand rather than permanently filling the sidebar.
- Projects can be reopened or deleted with explicit confirmation.
- Deleting a local project does not delete pages already published to Notion.
- The NotifyFlow controlled engineering sample remains separately accessible.

### 3.2 Source intake and project intelligence

The project intake supports bounded PDF, DOCX, Markdown, text, CSV, JSON, YAML, folder files, and pasted transcripts.

Relevant modules:

- `src/projects/extract.ts` — server-side extraction.
- `src/projects/analyze.ts` — source-to-knowledge analysis.
- `src/projects/intelligence.ts` — gaps, clarification questions, readiness, technology recommendations, and graph updates.
- `src/projects/schemas.ts` — validated project structures.
- `src/projects/store.ts` — current hackathon persistence adapter.

The intelligence pass produces structured requirements, NFRs, decisions, constraints, risks, open questions, exact source traceability, at least five ranked gaps, three to five contextual clarification questions, deterministic readiness, three architecture directions, and technology-layer recommendations.

Clarification answers:

- are stored as human-confirmed graph mutations;
- are classified into requirements, NFRs, or constraints from the originating gap instead of being stored as generic decisions;
- record question provenance;
- increment the graph version;
- recalculate readiness;
- atomically regenerate Requirements, SRS, NFR, and proposed HLD at the new graph version;
- keep document review, revision, and approval locked until every presented clarification question is answered;
- invalidate a stale architecture decision.

ARB approval is enforced server-side and cannot bypass an unresolved P0 blocker.

### 3.3 Detailed documents and diagrams

`src/projects/documents.ts` compiles detailed, versioned project views:

- Requirements Catalogue
- Software Requirements Specification
- Non-Functional Requirements
- Proposed High-Level Design
- Architecture Decision Record after approval
- Final High-Level Design after approval

The HLD contains Mermaid definitions for:

- system context;
- components;
- deployment;
- primary sequence.

In Axiom, fenced Mermaid definitions are detected and rendered as SVG by:

- `app/_components/mermaid-document-body.tsx`
- `app/_components/mermaid-diagram.tsx`
- `app/_components/architecture-diagrams.tsx`

The Mermaid source remains available as a collapsed fallback and in downloaded Markdown. Do not regress the UI to raw diagram text.

`app/_components/document-review-studio.tsx` supports section-level revision through a validated fixture/live provider. A revision records its instruction, parent version, provider, graph version, timestamp, and hash. Document approval records the exact current graph version and document hashes.

Important boundary: revising document prose does not silently mutate canonical requirement facts. Material decisions still belong in the clarification/graph workflow.

### 3.4 Notion integration

The hackathon uses one Notion internal connection, not multi-workspace OAuth.

Required environment variable names:

```text
NOTION_ACCESS_TOKEN
NOTION_PARENT_PAGE_ID
```

Implementation:

- `src/integrations/notion.ts`
- `app/api/integrations/notion/status/route.ts`
- `app/api/projects/[id]/publish/notion/route.ts`

Behavior:

- one Axiom project hub is maintained per project;
- sources are published as immutable evidence;
- detailed versioned artifacts are created beneath the hub;
- the hub includes readiness, blockers, architecture comparison, technology direction, and an artifact index;
- republishing an unchanged graph/document set is idempotent;
- later graph versions append to the existing project hub instead of creating a second project root;
- access tokens remain server-side and are never returned to the browser.

Operational requirement: the configured Notion parent page must be shared with the internal connection. The adapter accepts a full Notion page URL or a 32-character page ID and normalizes it server-side.

The Notion publisher now extracts Mermaid fences, renders deterministic SVG architecture views, uploads them with Notion File Uploads, and attaches them as image blocks. `rendererVersion: svg-v2` forces one synchronization of pages created by the earlier raw-Markdown adapter; unchanged SVG-v2 publications remain idempotent.

Do not inspect or print `.env.local` to determine whether the user's credentials are present. Use the status endpoint or the visible integration state.

### 3.5 Optional wireflow and templates

The accepted architecture is a modular monolith with an embedded Excalidraw engine, not a new C++/WASM whiteboard and not a critical dependency on Figma, Miro, or Penpot.

Relevant files:

- `src/projects/wireframe-templates.ts` — twelve curated categories.
- `src/projects/wireframes.ts` — engine-neutral, validated scene compiler.
- `app/_components/template-gallery.tsx` — template selection.
- `app/_components/wireframe-studio.tsx` — embedded editable studio and prototype preview.

The twelve patterns materially change screen definitions, navigation, accent, and canvas content. Generated scenes remain `AI_SUGGESTED`, link to requirements and gaps, show required UI states, and can be saved as bounded Draft/In Review/Approved revisions.

Users can:

- inspect a four-screen product flow;
- edit, select, pan, zoom, and use Excalidraw history;
- inspect source/requirement coverage and unresolved design gaps;
- preview the proposed interaction flow;
- save a review revision;
- download `.excalidraw` JSON;
- export SVG.

The wireflow is optional and must never block architecture review.

### 3.6 Architecture, ARB, ADR, and final HLD

Architecture directions include:

- components and data flows;
- deployment model;
- technologies;
- assumptions;
- failure modes;
- cost estimate clearly labelled as an estimate;
- What / Why / Why Not;
- score breakdown;
- reconsideration triggers.

Users can ask an architecture question through `app/api/projects/[id]/architecture/ask/route.ts`. Approval through the ARB route creates a `HUMAN_APPROVED` decision, the ADR, and final HLD. A clarification after approval makes the decision stale and requires approval again.

### 3.7 NotifyFlow controlled engineering pipeline

The preloaded sample journey implements the original P0 vertical slice:

1. Deterministic fixture or live analysis through `POST /api/analyze`.
2. Exact source spans, requirements, NFRs, gaps, risks, and readiness.
3. Four clarifications and explicit architecture approval.
4. Nine deterministic governed artifacts through `POST /api/artifacts`:
   - SRS
   - NFR catalogue
   - HLD
   - ADR
   - OpenAPI 3.1
   - test strategy
   - backlog
   - Codex task packet
   - engineering constitution
5. Controlled implementation through `POST /api/code/generate`.
6. Explicit code approval.
7. Fixed build, unit, API, and coverage commands through `POST /api/verification/run`.
8. Requirement-to-evidence traceability.
9. Grounded Why / Why Not / Proof / Reconsider answers.
10. Governed JSON/Markdown release export and deterministic reset.

The generated slice is limited to five allowlisted files under `sandbox/notification-service/workspace` and implements:

- `POST /notifications`;
- `GET /notifications/{id}`;
- trusted tenant context;
- tenant-isolated retrieval;
- idempotency;
- audit events;
- mocked provider delivery;
- retry policy;
- unit and API tests.

Generation rejects traversal, unknown paths, symlinks, duplicate paths, excessive content, malformed output, and non-allowlisted writes before an atomic workspace swap.

### 3.8 Real verification and evidence

The command registry is code-owned in `src/runner/commands.ts`. Model output cannot add or change executable commands.

The runner:

- uses `shell: false`;
- validates the generated manifest and file hashes;
- enforces workspace confinement and timeouts;
- strips secrets from the child environment;
- bounds raw output;
- records command, duration, exit code, timeout, parsed metrics, and evidence;
- preserves failed outcomes as failed;
- maps proof only through generated tests that actually ran.

Current fixed verification includes TypeScript build, unit tests, API tests, and V8 coverage. Untested cost/delivery/scale claims remain visibly `UNKNOWN`.

### 3.9 Traceability and grounded questions

Milestone 7 is implemented in:

- `src/traceability/schemas.ts`
- `src/traceability/graph.ts`
- `src/traceability/why.ts`
- `app/api/why/route.ts`
- `app/_components/traceability-section.tsx`
- `app/_components/why-explorer-section.tsx`

The graph covers source spans, requirements, gaps, clarification answers, architecture options, ADR, artifacts, constitution rules, task selection, code, tests, and evidence.

The UI provides both a visual graph and an accessible ordered table. Orphaned requirements, unlinked tests, and explicit unknown proof are surfaced. Why answers are constrained to the current graph; proof answers require executed evidence.

### 3.10 Release export and deterministic reset

Milestone 8's export/reset slice is implemented in:

- `src/export/schemas.ts`
- `src/export/compile.ts`
- `app/api/export/route.ts`
- `app/_components/release-section.tsx`
- `src/demo/reset.ts`
- `app/api/demo/reset/route.ts`
- `scripts/demo-reset.mjs`

The release export includes:

- canonical graph;
- approved decision;
- nine approved artifacts;
- generation record;
- verification report;
- traceability graph;
- optional latest grounded Why answer.

JSON and Markdown formats are available. Every included file has a SHA-256 entry. The manifest records the graph version, generation ID, verification report ID, file count, and deterministic root hash. Artifact contents must still match their approved hashes, and a supplied Why answer must cite entities from the exported graph.

The reset removes only:

- `sandbox/notification-service/workspace`;
- `.axiom-stage-*` directories;
- `workspace.backup-*` directories;
- `.axiom-data/verification`.

It preserves:

- repository code;
- fixed sandbox templates;
- environment configuration;
- `.axiom-data/projects.json` and user-created workspace projects.

The reset is serialized, safe-root checked, idempotent, exposed through the UI/API/CLI, and returns a validated result rather than fake progress.

## 4. Architecture and storage decisions

### Current deployment shape

Use a **modular monolith** for the hackathon:

- one Next.js App Router deployable;
- one canonical graph/persistence boundary;
- explicit internal modules;
- one controlled child-process runner.

Do not split into microservices for the submission. Extract a durable generation worker, collaboration service, or customer-controlled runner only when scale, isolation, or trust boundaries require it.

### Current storage

The project store is the documented hackathon equivalent implemented by `src/projects/store.ts`, backed by `.axiom-data/projects.json`. Verification reports are stored separately under `.axiom-data/verification`.

This is sufficient for the single-process hackathon demo but not a production multi-instance data store. A future database migration must preserve stable IDs, graph versions, artifact hashes, approval provenance, and reset boundaries.

### Accepted ADRs

- `docs/decisions/0001-workspace-intake-and-design-handoff.md`
- `docs/decisions/0002-wireframe-engine-and-deployment-boundary.md`
- `docs/decisions/0003-project-intelligence-and-curated-wireframe-templates.md`
- `docs/decisions/0004-guided-document-first-product-journey.md`
- `docs/decisions/0008-groq-live-ai-provider.md`

Read these before changing the visible journey, whiteboard stack, Notion ownership, HLD approval boundary, or deployment topology.

## 5. Environment and local commands

Requires Node.js 22 or newer and pnpm 10.28.1 through Corepack.

Environment variable names are documented in `.env.example`:

```text
AXIOM_AI_MODE
GROQ_API_KEY
GROQ_MODEL
AXIOM_DATA_DIR
NOTION_ACCESS_TOKEN
NOTION_PARENT_PAGE_ID
```

Fixture mode works without external credentials. Live AI uses Groq's OpenAI-compatible endpoint with strict JSON-schema output and server-side Zod validation. The default model is `openai/gpt-oss-120b` on Groq; it does not require an OpenAI API key. A live provider failure is shown honestly and does not silently substitute fixture output; the last valid analysis remains visible.

Available commands:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm demo:reset
pnpm sandbox:build
pnpm sandbox:test:unit
pnpm sandbox:test:api
pnpm sandbox:test
pnpm sandbox:coverage
```

Recommended resume sequence:

```bash
pnpm install
pnpm demo:reset
pnpm dev
```

Then open `http://localhost:3000`.

For a final gate, stop the development server before `pnpm build`. Next.js 16 uses separate build workers, and running the development compiler and production compiler concurrently can contend for `.next` state in this environment.

## 6. Last verified state

The release/reset work was verified locally on 2026-07-18:

- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm test` — **9 files, 59 tests passed**.
- `pnpm test:e2e` — **4 Playwright journeys passed**.
- `pnpm build` — passed.
- In-app browser visual inspection — landing and Release stage rendered correctly.
- Browser console inspection — no warnings or errors during the inspected journey.
- `pnpm demo:reset` — completed in **4 ms** after a full run.
- Immediate second reset — completed in **0 ms** with no targets remaining.
- Reset verification confirmed that generated workspace/evidence were absent while project data and the fixed template remained present.

The primary E2E journey currently covers:

- landing and project source intake;
- document generation and Mermaid SVG rendering;
- clarification and document approval;
- twelve template choices and editable Excalidraw studio;
- architecture question and approval;
- project library persistence;
- complete NotifyFlow analysis, ADR, artifact, code, verification, traceability, Why, export, and reset flow.

Additional E2E cases cover stale downstream invalidation and honest live-provider failure metadata with last-valid-result preservation.

### Known build warning

Production build succeeds but Turbopack reports one existing NFT trace warning. The import trace is:

```text
next.config.mjs
-> src/runner/execute.ts
-> app/api/verification/run/route.ts
```

It warns that dynamic filesystem operations may trace more of the project than intended. This is not a failed build, but it should be narrowed before production deployment if possible without weakening runner confinement.

## 7. Milestone status and backlog caveat

### Implemented

- Milestone 7: Traceability and Why Explorer — complete.
- Milestone 8 completed items:
  - JSON and Markdown export;
  - machine-readable manifest;
  - primary E2E;
  - failure/staleness E2E;
  - deterministic reset under 30 seconds.

### Still required for Milestone 8

1. Choose and deploy to a child-process-capable host; the verification runner cannot be treated as a normal short-lived edge function.
2. Test install and the deployed flow from a clean browser.
3. Finish the hackathon submission narrative.
4. Record the demo video.
5. Freeze features.

The async-state review, focused accessibility review, and Section 16 evidence map were completed on 2026-07-19. Read `docs/P0_ACCEPTANCE_AUDIT.md` before changing release status.

ZIP export is optional/P1 and should not displace the remaining P0 release work.

### Backlog checkbox drift

`IMPLEMENTATION_BACKLOG.md` still shows Milestones 0–6 as unchecked even though their main vertical slices exist and are exercised by the current tests. Do **not** assume those capabilities are absent and rebuild them. Audit each checkbox against the code, visible flow, SRS acceptance criteria, and tests; update the backlog only with evidence.

## 8. Recommended next work

The safest next sequence is:

1. **Deployment selection and proof**
   - Use a host that supports Node.js child processes, writable bounded workspace storage, execution timeouts, and the fixed pnpm toolchain.
   - Keep the modular monolith for the hackathon.
   - Verify secrets remain server-side.
2. **Clean-browser deployed E2E**
   - Run the main fixture journey end-to-end.
   - Verify real sandbox commands execute on the host.
   - Verify reset restores the sample without deleting projects.
3. **Submission package**
   - Final narrative, architecture diagram, screenshots/video, demo reset instructions, and a concise explanation of what is real versus AI-suggested.

Do not start generic whiteboard features, microservices, authentication, live meeting ingestion, arbitrary repository ingestion, multi-model routing, or cloud provisioning before these release items pass.

## 9. Useful code map

```text
app/page.tsx                                  top-level landing/workspace/sample orchestration
app/_components/workspace-home.tsx            project intake and document-first journey
app/_components/document-review-studio.tsx    detailed review and AI section revision
app/_components/mermaid-document-body.tsx     Mermaid detection and document rendering
app/_components/wireframe-studio.tsx           embedded Excalidraw editor/prototype
app/_components/traceability-section.tsx      visual and accessible graph traversal
app/_components/why-explorer-section.tsx      grounded project questions
app/_components/release-section.tsx           export and safe reset UI

src/projects/store.ts                         hackathon project persistence
src/projects/intelligence.ts                  gaps, questions, readiness, tech direction
src/projects/documents.ts                     detailed project artifact compilation
src/projects/wireframes.ts                    validated scene compiler
src/projects/wireframe-templates.ts           twelve template registry
src/integrations/notion.ts                    internal-connection Notion publisher

src/domain/day2.ts                            NotifyFlow fixture/domain transitions
src/artifacts/compile.ts                      nine governed artifacts
src/codegen/                                  controlled generated slice and safe workspace
src/runner/                                   fixed commands, execution, parsing, evidence store
src/traceability/                             graph and grounded Why resolver
src/export/                                   hashed release bundle and manifest
src/demo/reset.ts                             server reset boundary
scripts/demo-reset.mjs                        CLI reset boundary

tests/                                        Vitest unit/integration coverage
e2e/day2.spec.ts                              full Playwright product journey
sandbox/notification-service/template/        fixed generated-service template
```

## 10. Recent implementation history

```text
08731ff Add release export and reset flow for NotifyFlow demo
0d8acfe Add traceability graph and grounded why explorer
6e1e027 Add fixed verification runner and surface evidence in UI
f52aec9 Render Mermaid diagrams in document review studio
274e5f1 Implement NotifyFlow P0 vertical slice
4fc2d34 Add workspace intake flow and refresh product framing
```

Preserve unrelated user changes if the worktree becomes dirty. Use `apply_patch` for edits, keep the application runnable, run proportionate verification after each slice, and never claim a check passed unless its real command completed.

## 11. Addendum — Notion diagrams and approved delivery flow

Work continued on 2026-07-18 after the original handoff snapshot.

### Implemented in the current worktree

- Fixed new-project UX so optional automatic Notion publication cannot hide a successfully persisted/analyzed/documented local project.
- Applied the same transaction boundary to architecture approval: final HLD/ADR remain available locally even if Notion synchronization fails.
- Split every formatted Notion rich-text run at the documented 2,000-character boundary, including bold and inline-code tokens. This fixes the observed `text.content.length ... 4809` validation error.
- Added `src/integrations/notion-diagrams.ts`. Mermaid fences are extracted, rendered to deterministic SVG, uploaded through Notion File Uploads, and attached as image blocks rather than published as raw fenced text.
- Added `rendererVersion` to Notion publications. Existing `markdown-v1` publications synchronize once into `svg-v2`; unchanged SVG-v2 publications remain idempotent.
- Replaced raw Markdown `<pre>` output in the Axiom document reader with semantic paragraphs, headings, lists, links, code, quotes, and native HTML tables while keeping Mermaid rendering interactive.
- Added a server-side Jira Cloud adapter and status endpoint using `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, and `JIRA_PROJECT_KEY`. Secrets remain server-side.
- Added a deterministic delivery compiler that produces one epic and source-linked child stories from the current document approval, canonical graph, NFRs, and human-approved ARB decision.
- Added plan-hash confirmation, Epic-first Jira creation, child `parent.key` assignment, stored publication keys, and same-plan idempotency.
- Added a Delivery stage after final HLD/ADR with the Jira preview, explicit confirmation, Jira links, story selection, and a bounded Codex task packet.
- Added server enforcement that architecture approval requires the current document-baseline approval.
- Recorded the scope and repository-write boundary in `docs/decisions/0005-approved-system-to-jira-and-controlled-coding.md`.

### Important boundary

The arbitrary-project delivery path now prepares a source-linked coding task after Jira publication, but it does not yet write arbitrary generated code. A generic coding adapter still needs explicit repository selection, path allowlisting, dependency policy, atomic writes, and fixed verification. The NotifyFlow sample remains the only fully executable code-generation/verification template.

### Verification completed for this addendum

```text
pnpm lint       PASS
pnpm typecheck  PASS
pnpm test       PASS — 10 files, 64 tests
pnpm test:e2e   PASS — 4 tests
pnpm build      PASS — Next.js 16.2.10 production build
```

The local browser pass verified the approved-project Delivery screen, a four-story Jira preview, semantic document-control tables, interactive Mermaid rendering, and no console errors. No synthetic test content was sent to the configured Notion or Jira workspace during browser verification.

The production build emits one pre-existing Turbopack NFT warning because the fixed verification runner uses dynamic filesystem boundaries. Compilation, TypeScript validation, route generation, and page optimization all complete successfully.

## 12. Addendum — live Jira validation, Build Studio, and loading feedback

Work continued on 2026-07-18 after Jira credentials were added locally.

- Jira status now validates the current account plus the configured project's Epic and Story/Task create metadata using GET requests only. Credential values are never returned.
- The configured local Jira connection was verified against project `KAN`; no Jira issue was created during verification.
- Axiom Build Studio now explains and visualizes the governed coding path after a Jira story is selected: compiled contract, repository authorization, patch review, and fixed verification.
- Generic coding remains locked at repository authorization. The UI explicitly says no coding process is running and never invents progress or command output. NotifyFlow remains the executable generated-diff and verification proof.
- Async actions across project intake, documents, wireframes, architecture, Delivery, the NotifyFlow pipeline, export, and reset now use action-specific copy, visible spinners, disabled controls, and `aria-busy`.
- The product decision is recorded in `docs/decisions/0006-governed-build-studio-and-visible-action-state.md`.

Verification for this continuation:

```text
pnpm lint       PASS
pnpm typecheck  PASS
pnpm test       PASS — 10 files, 66 tests
pnpm test:e2e   PASS — 4 tests
pnpm build      PASS — Next.js production build
```

## 13. Addendum — P0 acceptance and accessibility hardening

Work continued on 2026-07-19 after commit `7220db4`.

- Added `docs/P0_ACCEPTANCE_AUDIT.md`, mapping all Section 16 core criteria to visible behavior and automated evidence.
- Added one modal-focus boundary used by the project library, document review, and Wireframe Studio: initial focus, trapped Tab navigation, Escape close, scroll lock, and opener focus restoration.
- Added skip links and a polite workspace pipeline live region.
- Added a truthful integration bootstrap state instead of briefly showing false disconnected labels.
- Added an explicit recoverable project-creation failure state that preserves the selected sources.
- Changed architecture-question failures into alerts so they cannot be presented as grounded AI answers.
- Added retry feedback inside the project-delete confirmation.

Current verification:

```text
pnpm lint       PASS
pnpm typecheck  PASS
pnpm test       PASS — 10 files, 66 tests
pnpm test:e2e   PASS — 5 tests
pnpm build      PASS — Next.js production build
pnpm demo:reset PASS — 1 ms, saved project data preserved
```

The remaining release blockers are deployment to a child-process-capable host, clean-environment and clean-browser proof, the final submission narrative, demo recording, and feature freeze. The known Turbopack NFT trace warning remains unchanged.

## 14. Addendum — permanent Vercel release

Work continued on 2026-07-19 after commit `80ff6f3`.

- Permanent production URL: `https://axiom-buildweek.vercel.app`.
- The Vercel project is `axiom-buildweek` under `prashantpv08s-projects`.
- Local filesystem adapters remain the development path. On Vercel, `src/projects/store.ts` uses a private Blob object for the validated project database with strong-ETag optimistic concurrency, and `src/projects/extract.ts` stores raw uploads as private Blob objects.
- Verification reports are private Blob objects. Hosted controlled verification creates an ephemeral Vercel Sandbox, installs only the committed fixed template dependencies, changes network policy to deny-all, and executes only the registered build/unit/API/coverage commands.
- Notion and Jira values were transferred from `.env.local` into sensitive server-only Vercel environment variables. No credential value was printed or committed.
- `docs/decisions/0007-vercel-hosted-runtime-and-durable-storage.md` records the deployment boundary and free-plan tradeoffs.
- The ngrok tunnel and local production server were stopped after the permanent deployment passed.

Verified release evidence:

```text
pnpm lint                                                       PASS
pnpm typecheck                                                  PASS
pnpm test                                                       PASS — 10 files, 66 tests
PLAYWRIGHT_BASE_URL=https://axiom-buildweek.vercel.app pnpm test:e2e
                                                                PASS — 5 tests in 1.5 minutes
Vercel production build                                         PASS
Hosted /api/projects                                            PASS — durable Blob-backed response
Hosted Notion status                                            PASS — configured
Hosted Jira status                                              PASS — connected, Epic and Story available
```

The hosted E2E exercised project creation, source persistence, analysis, documents, clarification updates, optional wireflow, architecture approval, controlled generation, real Sandbox verification evidence, traceability, exports, project deletion, and reset. The remaining work is the final demo recording, screenshots, submission narrative, and feature freeze—not implementation of the prototype link.

## 15. Addendum — clarification gating and document regeneration

Work continued on 2026-07-19 on branch `codex/clarification-document-regeneration-fixes`.

- Document review and document-baseline approval remain disabled while any clarification question is open; the approval and revision APIs enforce the same boundary.
- Clarification answers now become `HUMAN_CONFIRMED` requirements, NFRs, or constraints according to their originating gap category. This removes the incorrect fallback rows seen in the Interview project after answering functional, non-functional, and delivery questions.
- Requirements, SRS, NFR, and proposed HLD are compiled and persisted atomically for every clarification graph version. A partial regeneration can no longer leave current knowledge paired with stale documents.
- Measurable NFR choices now contain explicit load, latency, availability, recovery, and budget targets, and response-time wording is parsed into the NFR catalogue.
- Guided clarification, document-revision, and architecture-question fields share the actionable validation message `Enter only 2,000 characters.` in both the UI and API.
- Regression coverage verifies document locking, server-side approval rejection, the exact length error, answer classification, constraints, and all four regenerated document versions.
- Opening a saved project calls the idempotent migration route. Legacy clarification entities stored as generic decisions are reclassified once, the graph version advances, all four documents regenerate atomically, and stale approvals remain invalidated.

Verification for this continuation:

```text
pnpm lint       PASS
pnpm typecheck  PASS
pnpm test       PASS — 10 files, 69 tests
pnpm test:e2e   PASS — 5 tests
pnpm build      PASS — Next.js production build
```

The production build still emits the existing non-blocking Turbopack NFT trace warning for the fixed verification runner.

## 16. Addendum — wireflow action visibility and startup cleanup

Work continued on 2026-07-19 on branch `codex/wireflow-button-abort-fix`.

- The selected-template label rule is now scoped to the label itself, so it no longer overrides the white text inside the purple **Generate product flow** action.
- Workspace startup requests now use an inactive-component guard for state updates instead of aborting fetches during React development remounts. This removes the Turbopack `AbortError: signal is aborted without reason` overlay while still preventing updates after unmount.
- The primary browser journey asserts the action's computed white text color and records any AbortError emitted while the workspace mounts and unmounts.
- A 1440×1000 browser capture of the exact wireflow stage confirmed the full action label is visible and no runtime error was raised.

Verification for this continuation:

```text
pnpm lint       PASS
pnpm typecheck  PASS
pnpm test       PASS — 10 files, 69 tests
pnpm test:e2e   PASS — 5 tests
pnpm build      PASS — Next.js production build
```

The production build still emits the existing non-blocking Turbopack NFT trace warning for the fixed verification runner.
