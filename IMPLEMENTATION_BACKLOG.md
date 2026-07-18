# Axiom MVP Implementation Backlog

This backlog is ordered. Do not start a later milestone while required checks for the current milestone fail.

## Milestone 0: Repository and Walking Skeleton

### Goal

A runnable monorepo with the project shell, database, sample reset, and automated quality commands.

- [ ] Create pnpm workspace and Next.js application.
- [ ] Enable TypeScript strict mode.
- [ ] Configure lint, format, Vitest, Playwright, and build commands.
- [ ] Add database schema and migration.
- [ ] Create packages: `domain`, `ai`, `artifacts`, `runner`, and optional shared `ui`.
- [ ] Add lifecycle navigation with disabled future stages based on project status.
- [ ] Add NotifyFlow fixture and reset script.
- [ ] Add request ID and structured server logging.
- [ ] Add `.env.example`.
- [ ] Add README setup instructions.
- [ ] Verify `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

### Exit Criteria

- Application launches.
- NotifyFlow sample can be seeded and loaded.
- Quality commands pass.

---

## Milestone 1: Canonical Graph and Requirement Analysis

### Goal

Submit the product brief and render validated, source-grounded requirements and gaps.

- [ ] Implement Project, SourceArtifact, SourceSpan, Requirement, NFRDetail, Gap, and TraceLink schemas.
- [ ] Implement stable ID generation.
- [ ] Implement truth-status enum and transition helper.
- [ ] Implement source span indexing.
- [ ] Implement model provider interface.
- [ ] Implement requirement-analysis structured schema.
- [ ] Implement live provider plus fixture provider for tests and demo fallback.
- [ ] Validate source span references.
- [ ] Persist valid analysis atomically.
- [ ] Reject malformed or ungrounded output safely.
- [ ] Implement deterministic readiness scoring.
- [ ] Build Requirements UI with filters and source evidence drawer.
- [ ] Build gaps list with severity and affected IDs.
- [ ] Add unit tests for score, IDs, source validation, and invalid responses.

### Exit Criteria

- NotifyFlow produces FRs, NFRs, risks, assumptions, and at least five gaps.
- Source-grounded items link to exact excerpts.
- A failed model response cannot corrupt the graph.

---

## Milestone 2: Clarification Loop

### Goal

Answer three to five high-impact questions and update the canonical graph.

- [ ] Implement ClarificationQuestion schema.
- [ ] Rank blockers before lower-impact questions.
- [ ] Render why-it-matters and affected IDs.
- [ ] Support option and custom answers.
- [ ] Apply an answer through a validated graph update.
- [ ] Record answer provenance and trace links.
- [ ] Recalculate readiness.
- [ ] Block architecture approval when blocker gaps remain.
- [ ] Add tests for answer update, score change, and blocker behavior.

### Exit Criteria

- The readiness score increases after valid answers.
- The answer creates or updates requirements, NFRs, rules, or assumptions.
- Blocking gaps cannot be bypassed silently.

---

## Milestone 3: Architecture Decision Lab

### Goal

Compare three options and approve one versioned decision.

- [ ] Implement ArchitectureOption and ArchitectureDecision schemas.
- [ ] Implement structured architecture prompt.
- [ ] Require why, why-not, assumptions, failure modes, cost estimate, and triggers.
- [ ] Build comparison matrix.
- [ ] Build option detail drawer.
- [ ] Mark recommendation `AI_SUGGESTED`.
- [ ] Implement human approval.
- [ ] Create ADR on approval.
- [ ] Create trace links from requirements and NFRs to decision.
- [ ] Add tests for missing why-not and invalid trigger output.

### Exit Criteria

- Three distinct options render.
- One option can be approved.
- ADR includes rejected alternatives and reconsideration triggers.

---

## Milestone 4: Constitution and Enterprise Artifacts

### Goal

Compile the approved graph into an enterprise artifact pack.

- [ ] Implement ConstitutionRule schema and generator.
- [ ] Generate approved constitution after decision approval.
- [ ] Implement deterministic Markdown compilers for SRS, NFR, HLD, ADR, test strategy, backlog, and Codex task.
- [ ] Generate and validate OpenAPI.
- [ ] Store artifact version, graph version, and hash.
- [ ] Build artifact tabs and preview.
- [ ] Add copy and individual download actions.
- [ ] Preserve stable entity IDs after regeneration.
- [ ] Add tests for mandatory sections and stable IDs.

### Exit Criteria

- All P0 artifacts can be generated from one graph.
- OpenAPI parses successfully.
- Artifact metadata and versions are visible.

---

## Milestone 5: Controlled Code Generation

### Goal

Generate one vertical API slice inside the approved sandbox.

- [ ] Create fixed notification-service starter workspace.
- [ ] Fix dependencies and commands.
- [ ] Define allowlisted paths.
- [ ] Implement CodeGenerationOutput schema.
- [ ] Generate complete file operations or validated patches.
- [ ] Reject path traversal, unsupported paths, and excessive file sizes.
- [ ] Write valid files atomically.
- [ ] Create code-to-requirement and code-to-rule trace links.
- [ ] Build file tree and unified diff UI.
- [ ] Require user approval before verification.
- [ ] Add tests for invalid paths and malformed output.

### Exit Criteria

- Generated code implements create and get notification endpoints.
- Generated tests reference requirement IDs.
- User can inspect the diff.

---

## Milestone 6: Real Verification and Evidence

### Goal

Execute real tools and show exact evidence.

- [ ] Implement fixed command registry.
- [ ] Implement workspace confinement and timeout.
- [ ] Run build/typecheck.
- [ ] Run unit tests.
- [ ] Run API tests.
- [ ] Run coverage.
- [ ] Parse outputs into VerificationRun and Evidence.
- [ ] Compare metrics to constitution thresholds.
- [ ] Map tests and evidence to requirements.
- [ ] Display command, duration, exit code, metrics, and bounded raw output.
- [ ] Mark untested requirements `UNKNOWN`.
- [ ] Add parser fixtures for pass, fail, timeout, and malformed output.

### Exit Criteria

- Evidence values come from actual commands.
- Failed commands remain failed.
- Requirement coverage matrix is visible.

---

## Milestone 7: Traceability and Why Explorer

### Goal

Explain the project through graph traversal.

- [x] Implement graph query service.
- [x] Build graph visualization.
- [x] Build accessible list/tree fallback.
- [x] Show orphans and unknowns.
- [x] Implement suggested Why questions.
- [x] Implement free-text grounded Why endpoint.
- [x] Require entity citations in answers.
- [x] Distinguish Why, Why Not, Proof, and Reconsider When.
- [x] Add tests preventing proof claims without Evidence.

### Exit Criteria

- User can navigate requirement -> decision -> code -> test -> evidence.
- Four approved sample Why questions return grounded answers.

---

## Milestone 8: Export, Hardening, and Submission

### Goal

Deliver a polished, resettable, reliable demo.

- [x] Export Markdown and JSON artifacts.
- [x] Generate manifest.
- [ ] Add ZIP export if time.
- [x] Complete main E2E test.
- [x] Complete failure E2E test.
- [ ] Add all loading, empty, failure, and retry states.
- [ ] Run accessibility review.
- [ ] Deploy on child-process-capable host.
- [ ] Test deployment from a clean browser.
- [ ] Record demo video.
- [ ] Finalize README and submission narrative.
- [ ] Freeze features.

### Exit Criteria

- All SRS Section 16 P0 acceptance criteria pass.
- Demo resets in under 30 seconds.
- Hosted flow completes without manual database or code edits.

---

# P1 Stretch Backlog

Only start after Milestones 0 through 8 are stable.

- [ ] Mermaid architecture diagram.
- [ ] Dependency/security scan.
- [ ] Autocannon performance run.
- [ ] axe accessibility run for a generated admin screen.
- [ ] Local AWS cost estimate using a dated price snapshot.
- [ ] Verification rerun and evidence comparison.
- [ ] ZIP export.
- [ ] Animated but truthful lifecycle transitions.
