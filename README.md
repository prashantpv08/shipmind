# Axiom — AI Engineering Operating System

Axiom turns scattered project knowledge into grounded requirements, approved architecture, governed engineering artifacts, product wireframes, controlled implementation, and verification evidence. The visible intake journey is **Sources → Structured knowledge → ARB → HLD → Wireframes**, followed by build and verification. NotifyFlow remains one preloaded sample project used to demonstrate the existing engineering pipeline; it is not the product identity.

## Current scope

- A workspace-first project intake UI supports multiple projects, local file/folder selection, pasted meeting transcripts, source review, and an explicit project-draft state.
- The interface separates future extracted knowledge into requirements, decisions, constraints, risks, open questions, and source traceability.
- Notion is the proposed knowledge system of record and Figma is the proposed wireframe handoff. Their connection states are explicit; the application does not claim that OAuth, publishing, or wireframe creation already ran.
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
```

Set `AXIOM_AI_MODE=live` and provide `OPENAI_API_KEY` to exercise live AI. If live analysis fails, the UI shows the failure and preserves the last valid analysis; it does not silently fall back to fixture data. Use **Run demo fixture instead** to knowingly switch to fixture output.

## Demo flow

1. Run `pnpm dev`.
2. Create a project draft by naming the project and adding files, a folder, or a meeting transcript.
3. Review the planned segregation into requirements, decisions, constraints, risks, open questions, and source trace.
4. Review the Notion → ARB → HLD → Figma delivery path and explicit integration states.
5. Open the sample project, then edit the brief if desired and choose **Analyze intent**.
6. Review provider metadata, grounded findings, exact evidence offsets, inferred items, and unknowns.
7. Answer blocker clarifications, compare architecture options, and explicitly approve the ADR.
8. Generate and inspect the governed artifact pack.
9. Generate the controlled implementation, inspect its diff, and approve it for verification.

## Implementation notes

- Domain logic lives under `src/domain` and does not depend on React components or route handlers.
- Model-provider code lives under `src/ai/provider.ts` and validates structured outputs with Zod before returning results.
- Generated readiness percentages are not accepted from the model.
- Artifact compilation lives under `src/artifacts`, validates every output before returning it, and never mutates the canonical graph.
- Controlled generation lives under `src/codegen`; the committed sandbox template fixes dependencies and build/test commands while the runtime workspace remains generated data.
- The app does not fabricate verification evidence; real runner evidence is deferred to the verification milestone.
