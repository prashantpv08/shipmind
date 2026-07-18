# Axiom — AI Engineering Operating System

Axiom turns scattered project knowledge into grounded requirements, governed engineering artifacts, product wireflows, approved architecture, controlled implementation, and verification evidence. The visible journey is **Landing → Sources → Document review → Optional wireflow → Architecture decision → Approved HLD and ADR**, followed by build and verification. NotifyFlow remains one preloaded sample project used to demonstrate the existing engineering pipeline; it is not the product identity.

## Current scope

- A workspace-first project pipeline persists multiple projects and accepts bounded PDF, DOCX, Markdown, text, CSV, JSON, YAML, folder-file, and pasted-transcript sources.
- Source text is extracted server-side and deterministically separated into exact source-grounded requirements, NFRs, decisions, constraints, risks, and open questions. The v2 project-intelligence pass also creates at least five ranked gaps, three to five contextual clarification questions, a deterministic readiness breakdown, and seven reviewable technology-layer recommendations.
- Suggested or custom clarification answers are stored as `HUMAN_CONFIRMED` graph mutations with question provenance. Each answer increments the graph version, recalculates readiness, regenerates the current requirements/SRS/NFR views, and invalidates a stale architecture approval.
- Requirements, SRS, NFR, and a proposed HLD are detailed versioned compiled views. The HLD includes system-context, component, deployment, and sequence diagrams; fenced Mermaid definitions render as SVG in the review studio while the source remains available in a collapsed fallback and in downloaded Markdown. Users can revise one section through a validated fixture/live provider; each revision records its instruction, parent version, provider, graph version, and hash. Document approval records exact current hashes. Three architecture directions include components, data flows, deployment model, technologies, assumptions, failure modes, cost estimate, score breakdown, and reconsideration triggers. ARB approval is blocked while a P0 gap remains and creates the final `HUMAN_APPROVED` ADR plus HLD.
- The internal Notion adapter maintains one project knowledge hub under a configured parent page. It publishes a source catalogue, native Notion tables, detailed graph-versioned artifact pages, architecture comparison, readiness, blockers, technology direction, and a linked project index. It is idempotent for an unchanged graph/document set and never returns its access token to the client.
- After document approval, Axiom offers twelve visual product templates and compiles four source-linked, gap-aware wireframe scenes in the embedded Excalidraw canvas. The selected pattern changes screen definitions, navigation, accent, and canvas content. Users can edit, pan, zoom, preview the proposed screen flow, inspect requirement coverage and required UI states, persist bounded Draft/In Review/Approved revisions, download `.excalidraw`, or export SVG without leaving the product. The wireflow remains optional.
- Editable business-intent brief, preloaded with the NotifyFlow sample.
- `POST /api/analyze` validates request bodies with Zod and keeps model credentials server-side.
- Shared `AnalysisResult` schema validates fixture results, live results, API responses, and client parsing.
- Fixture mode is explicit, works without an API key, and is labelled `Demo fixture` / `notifyflow-day2-fixture`.
- Live mode uses the server-side OpenAI Responses provider, structured outputs, Zod validation, and no silent fixture substitution on failure.
- Source-grounded live findings must include exact quotes; the server verifies quotes verbatim and derives offsets itself.
- Deterministic readiness scoring stays in application code and recalculates after clarification answers.
- Architecture approval is explicit; the ADR is `HUMAN_APPROVED` and becomes stale if clarifications change.
- `POST /api/artifacts` deterministically compiles the canonical graph and current ADR into a versioned engineering constitution and nine validated artifacts.
- The artifact pack includes SRS, NFR catalogue, HLD, ADR, OpenAPI 3.1, test strategy, implementation backlog, Codex task packet, and constitution views with stable IDs and SHA-256 content hashes.
- Artifact previews and downloads are compiled views. The canonical graph remains authoritative, and stale ADRs cannot generate artifacts.
- `POST /api/code/generate` uses the approved graph, ADR, OpenAPI, backlog, task packet, and constitution as recorded provenance for a fixed NotifyFlow code fixture.
- Generated files are limited to five allowlisted paths under `sandbox/notification-service/workspace`; traversal, unknown paths, symlinks, duplicate paths, malformed output, and bounded-size violations are rejected before an atomic workspace swap.
- The generated slice implements create/get notification handling, trusted tenant isolation, idempotency, audit events, a mocked provider, retry policy, unit tests, and API tests.
- Code files, hashes, trace links, and exact create-file diffs are visible before explicit approval for verification. Approval authorizes later verification but does not claim that checks ran.
- `POST /api/verification/run` accepts only the matching human-approved generation and manifest, revalidates every workspace file hash, rejects symlinks, strips secrets from child-process environments, and executes four fixed commands without a shell.
- Build, unit, API, and V8 coverage results are stored as validated verification runs with command, duration, exit code, timeout state, parsed metrics, and bounded raw output. Requirement proof is linked only through executed generated tests; untested requirements remain `UNKNOWN`.

## Commands

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
pnpm sandbox:test
pnpm sandbox:coverage
```

> E2E remains a local/release command. CI runs install, lint, typecheck, unit tests, and production build only.

## Environment

```bash
AXIOM_AI_MODE=fixture
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-sol
AXIOM_DATA_DIR=
NOTION_ACCESS_TOKEN=
NOTION_PARENT_PAGE_ID=
```

Set `AXIOM_AI_MODE=live` and provide `OPENAI_API_KEY` to exercise live AI. If live analysis fails, the UI shows the failure and preserves the last valid analysis; it does not silently fall back to fixture data. Use **Run demo fixture instead** to knowingly switch to fixture output.

For the hackathon Notion connection, create an internal Notion integration, set `NOTION_ACCESS_TOKEN` in `.env.local`, share one parent page with that integration, and set its page ID as `NOTION_PARENT_PAGE_ID`. Tokens remain server-side. Multi-workspace OAuth is a post-hackathon hardening step; the current adapter intentionally supports one configured Notion workspace.

## Demo flow

1. Run `pnpm dev`.
2. Create a project by naming it and adding files, a folder, or a meeting transcript.
3. The server persists and extracts the sources, builds the grounded graph, and generates Requirements, SRS, and NFR documents.
4. Review ranked gaps and the deterministic readiness breakdown. Answer blocker questions using a suggested option or precise custom text; each answer updates the canonical graph and regenerates affected documents.
5. Open any document in the review studio, inspect HLD diagrams, request a section-level AI revision, and jump to the current project hub in Notion.
6. Approve the document baseline, then optionally choose one of twelve curated product patterns, inspect its generated flow, edit scenes, save a review revision, and export SVG or `.excalidraw` JSON.
7. Compare the contextual architecture and technology recommendations, ask grounded questions, and explicitly approve an option only after blockers are resolved. Axiom then generates the final ADR and HLD and republishes the complete document set to Notion when configured.
8. Open the sample project, then edit the brief if desired and choose **Analyze intent**.
9. Review provider metadata, grounded findings, exact evidence offsets, inferred items, and unknowns.
10. Answer blocker clarifications, compare architecture options, and explicitly approve the ADR.
11. Generate and inspect the governed artifact pack.
12. Generate the controlled implementation, inspect its diff, and approve it for verification.
13. Run fixed verification and inspect the exact build, unit, API, coverage, and requirement-matrix evidence.

## Implementation notes

- Domain logic lives under `src/domain` and does not depend on React components or route handlers.
- Model-provider code lives under `src/ai/provider.ts` and validates structured outputs with Zod before returning results.
- Generated readiness percentages are not accepted from the model.
- Artifact compilation lives under `src/artifacts`, validates every output before returning it, and never mutates the canonical graph.
- Controlled generation lives under `src/codegen`; the committed sandbox template fixes dependencies and build/test commands while the runtime workspace remains generated data.
- Controlled verification lives under `src/runner`; its registry owns every executable and argument, the runner uses `shell: false`, strips secrets, enforces timeouts and bounded output, parses V8/Vitest measurements, and never rewrites a failed result.
- Project-intelligence mutation and readiness logic lives under `src/projects/intelligence.ts`; route handlers and React components do not calculate truth transitions or scores.
- Wireframe compilation lives under `src/projects/wireframes.ts`, with its fixed registry in `src/projects/wireframe-templates.ts`. It consumes only the current graph, human-approved ARB decision, and current HLD; the embedded Excalidraw editor and bounded revision store are replaceable adapters, not sources of product truth.
- The hackathon deployable is a modular monolith in the pnpm workspace. Module interfaces are explicit so model execution, collaborative scene storage, or a future Rust/WASM renderer can be extracted only when scale or isolation requires it.
- The app does not fabricate verification evidence. A proof claim is available only after its fixed command actually executes and produces validated evidence.
