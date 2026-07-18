# P0 acceptance audit

- Audit date: 2026-07-18 (Asia/Kolkata)
- Branch: `codex/p0-acceptance-audit`
- Contract: `SRS.md`, Section 16
- Scope: local fixture-mode product acceptance only; deployed-host proof is tracked separately

## Result

All 18 Section 16.1 core-flow criteria have implementation and automated local evidence. The product is **not yet ready for submission** because the Section 16.2 quality gate and Milestone 8 release work are incomplete.

Status meanings:

- **Verified locally**: exercised by a passing command during this audit and backed by a named automated test.
- **Implemented, pending release proof**: code/test evidence exists, but the required release environment or focused audit has not been completed.
- **Blocked**: the current command did not produce a passing result.

## Section 16.1 core-flow evidence

| Criterion | Visible action | Automated evidence | Status |
|---|---|---|---|
| Launch NotifyFlow | Landing → **Explore the live sample** | `e2e/day2.spec.ts`, primary journey | Verified locally |
| Structured FRs, NFRs, risks, assumptions, and gaps | **Run demo fixture instead** → grounded requirements | `tests/day2.test.ts` fixture/schema tests; primary E2E | Verified locally |
| Exact source excerpts | Select `SP-001` evidence | `tests/day2.test.ts` exact-offset and grounding tests; primary E2E | Verified locally |
| Answer three to five clarifications | Answer the four NotifyFlow questions | `tests/day2.test.ts` validates four questions; primary E2E answers all four | Verified locally |
| Deterministic readiness change | Answer blocker questions → **Ready for decision** | `tests/day2.test.ts` and `tests/projects.test.ts` readiness tests | Verified locally |
| At least three architecture options | Open weighted architecture comparison | `tests/day2.test.ts` validates three options; primary E2E opens comparison | Verified locally |
| Complete option reasoning | Inspect why, why not, assumptions, failures, and triggers | `tests/day2.test.ts` architecture schema/score test | Verified locally |
| Human option approval | **Explicitly approve selected option** | `tests/day2.test.ts` approval test; primary E2E | Verified locally |
| ADR and Engineering Constitution | Approve option → ADR; generate governed artifacts | `tests/artifacts.test.ts` constitution categories; primary E2E asserts `ADR-001` | Verified locally |
| Required enterprise artifacts | **Generate artifact pack** → nine validated tabs | `tests/artifacts.test.ts` mandatory-section and OpenAPI tests; primary E2E | Verified locally |
| Controlled code slice | **Generate implementation** | `tests/codegen.test.ts` validation/write tests; primary E2E | Verified locally |
| Inspect files and diff | Select generated file → unified diff and trace links | Primary E2E asserts five files and the selected-file diff | Verified locally |
| Real build, unit, API, and coverage commands | Approve code → **Run fixed verification** | Primary E2E executes and asserts four fixed runs; `tests/runner.test.ts` covers parsers and runner safety | Verified locally |
| Actual evidence and truth status | Inspect verification cards and raw measurements | `tests/runner.test.ts`; primary E2E asserts `TOOL_VERIFIED` results | Verified locally |
| Requirement-to-code-to-test-to-evidence trace | Select a requirement in Traceability | `tests/traceability.test.ts` traversal test; primary E2E checks graph and list fallback | Verified locally |
| Four approved Why questions | Use Why, Why Not, Proof, and Reconsider buttons | `tests/traceability.test.ts`; primary E2E asks four approved questions | Verified locally |
| Honest visible unknown | Ask `What proves NFR-COST-001?` | `tests/traceability.test.ts`; primary E2E asserts `UNKNOWN` | Verified locally |
| Artifact and traceability export | Download JSON pack and Markdown handoff | `tests/export.test.ts`; primary E2E validates downloads, hashes, and graph/evidence files | Verified locally |

## Section 16.2 quality-gate evidence

| Gate | Evidence from this audit | Status |
|---|---|---|
| `pnpm lint` | Passed | Verified locally |
| `pnpm typecheck` | Passed after restoring the frozen lockfile install | Verified locally |
| `pnpm test` | 9 files, 59 tests passed | Verified locally |
| `pnpm test:e2e` | 4 journeys passed on isolated port 3100; `test-results/.last-run.json` reported `passed` with no failed tests | Verified locally |
| `pnpm build` | Stayed at `Creating an optimized production build` for more than five minutes and was interrupted; no pass/fail result was fabricated | Blocked |
| No secrets in repository or browser bundle | `.env*` files are ignored except `.env.example`, and provider tokens are server-side by design; no focused repository/bundle secret audit has been run | Implemented, pending release proof |
| No serious automated accessibility issue, if scan is implemented | No automated axe scan is implemented; a focused keyboard/name/status review is still required by the handoff | Implemented, pending release proof |
| README setup from a clean environment | Frozen lockfile install succeeded after network access was enabled; a clean-clone README rehearsal has not been completed | Implemented, pending release proof |
| Demo reset under 30 seconds | Covered by primary E2E and reset unit tests; the handoff records a 4 ms run, but this audit did not independently time the CLI reset | Implemented, pending release proof |

## Release blockers and next work

Work should continue in this order, with a new `codex/` branch for each bounded item:

1. **Production build investigation** — determine why the current build stalls in Turbopack's optimized-build phase, including the known dynamic filesystem trace through `src/runner/execute.ts`, without weakening runner confinement.
2. **Async-state and accessibility hardening** — audit intake, extraction, analysis/revision, Notion publishing, wireframe save/export, architecture actions, artifact/code generation, verification, Why, export, and reset for idle/loading/success/empty/failure/retry, focus behavior, names, announcements, and non-color status.
3. **Secret and browser-bundle audit** — add a repeatable, non-secret-printing release check and verify provider/Notion credentials never enter client code or exported bundles.
4. **Clean-environment rehearsal** — follow README from a clean checkout, including browser installation prerequisites and a timed `pnpm demo:reset`.
5. **Deployment selection and proof** — choose a child-process-capable Node host with bounded writable storage, fixed pnpm toolchain, timeouts, and server-only secrets.
6. **Clean-browser deployed E2E** — complete the fixture journey on the host and verify the real sandbox commands and safe reset boundary.
7. **Submission package and freeze** — finish the narrative, architecture visual, screenshots/video, reset instructions, then freeze features.

ZIP export remains P1 and must not displace these P0/release items.

## Test-harness correction made during the audit

`playwright.config.ts` now accepts `AXIOM_E2E_PORT`. This prevents the suite from silently reusing an unrelated application already bound to port 3000. The normal default remains port 3000; an isolated audit can run with:

```bash
AXIOM_E2E_PORT=3100 pnpm test:e2e
```

Playwright output directories are ignored so local acceptance evidence does not pollute the worktree.
