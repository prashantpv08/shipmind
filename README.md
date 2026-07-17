# Axiom NotifyFlow MVP

Axiom is an AI Engineering Operating System hackathon MVP. The current journey runs the visible NotifyFlow flow through real API boundaries: editable brief → grounded analysis → clarification → deterministic readiness update → architecture comparison → explicit human approval → versioned ADR → governed artifact pack.

## Current scope

- Editable NotifyFlow product brief.
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
2. Edit the brief if desired and choose **Analyze Brief**.
3. Review provider metadata, grounded findings, exact evidence offsets, inferred items, and unknowns.
4. Answer the blocker clarification questions.
5. Compare Serverless, Containerized, and Kafka options.
6. Approve the selected option to generate ADR-001.
7. Generate and inspect the nine-artifact pack, including the OpenAPI contract and engineering constitution.
8. Regenerate to produce new artifact versions with stable IDs.
9. Edit a clarification after approval to invalidate the pack and see the ADR marked stale.

## Implementation notes

- Domain logic lives under `src/domain` and does not depend on React components or route handlers.
- Model-provider code lives under `src/ai/provider.ts` and validates structured outputs with Zod before returning results.
- Generated readiness percentages are not accepted from the model.
- Artifact compilation lives under `src/artifacts`, validates every output before returning it, and never mutates the canonical graph.
- The app does not fabricate verification evidence; real runner evidence is deferred to the verification milestone.
