# Axiom Hackathon Plan

## Planning Principles

- Build P0 only until every P0 acceptance check passes.
- Optimize for one reliable three-minute NotifyFlow journey, not enterprise breadth.
- Keep one Next.js App Router application plus internal modules unless a package boundary materially reduces risk.
- Treat the canonical project graph as the source of truth; generated Markdown and JSON artifacts are compiled views.
- Validate every fixture or live model output with Zod before persistence.
- Implement the fixture provider first; keep the full demo usable without an API key and label fixture output as `Demo Data`.
- Never fabricate evidence, source quotes, command output, coverage, security findings, or performance metrics.
- Execute only fixed verification commands defined in code.

## 1. Day 1 to Day 4 Implementation Plan in Strict Dependency Order

### Day 1: Walking Skeleton, Canonical Graph, Requirement Intelligence

**Goal:** End the day with a locally runnable app where NotifyFlow can be reset, submitted, analyzed through fixture output, source-grounded excerpts can be opened, readiness is deterministic, malformed analysis is rejected atomically, and lint/typecheck/unit/build pass.

1. Create the smallest runnable repository skeleton.
   - `pnpm` workspace root.
   - `apps/web` Next.js App Router app.
   - TypeScript strict mode.
   - Tailwind CSS.
   - Vitest.
   - Playwright config present but primary E2E can be expanded later.
   - SQLite persistence through Prisma unless a setup blocker is documented immediately.
2. Add local development and quality scripts.
   - `pnpm dev`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm build`
   - `pnpm demo:reset`
3. Add the Day 1 canonical graph core.
   - Project
   - SourceArtifact
   - SourceSpan
   - Requirement
   - NFRDetail
   - Gap
   - ClarificationQuestion
   - Assumption
   - Risk
   - TraceLink
   - GraphVersion metadata
4. Add Zod schemas and domain services.
   - Stable ID generator.
   - Truth status enum and centralized transition helper.
   - Source span indexing and validation.
   - Trace-link validation.
   - Requirement analysis output validation.
   - Atomic graph update service that rejects invalid output without mutating stored graph data.
5. Implement persistence and reset.
   - Store project graph in SQLite as normalized tables or typed JSON graph snapshots with indexed entities; choose the fastest maintainable approach during implementation.
   - Seed `NotifyFlow` from `sample-inputs/notifyflow-brief.md`.
   - Reset should restore the sample to the pre-analysis state in under 30 seconds.
6. Implement model provider interface and fixture provider first.
   - `FixtureModelProvider` returns deterministic NotifyFlow analysis labelled `Demo Data`.
   - `LiveModelProvider` is defined behind the same interface but is not required for Day 1 acceptance.
   - Provider selection defaults to fixture when no API key exists.
7. Implement Day 1 UI vertical slice.
   - Landing / project start with `Try NotifyFlow Sample`.
   - Intent screen with brief preview/editor, character count, submit, loading, empty, validation, failure, and success states.
   - Requirements screen with readiness score, FR/NFR/assumption/risk/gap filters, source evidence drawer, and clarification panel.
   - Lifecycle status uses text labels and not color alone.
8. Add Day 1 tests.
   - Readiness scoring, including blocker cap.
   - Stable IDs.
   - Source span exact quote validation.
   - Requirement analysis Zod validation.
   - Invalid span / malformed fixture rejection with no graph corruption.
   - Truth status transition helper.
9. Run and fix Day 1 checks.
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm build`

### Day 2: Clarification Loop, Architecture Lab, Artifact Compiler

**Dependency:** Day 1 graph, persistence, source spans, fixture provider, readiness score, and quality checks pass.

1. Complete clarification graph updates.
   - Apply three to five demo answers through validated graph mutations.
   - Record answer provenance and trace links.
   - Recalculate readiness deterministically.
   - Keep at least one honest `UNKNOWN` visible.
2. Add architecture schemas and fixture/live provider method wiring.
   - Three options: serverless event-driven, containerized modular service, Kafka microservices.
   - Require why, why not, assumptions, failure modes, cost estimate labelled as estimate, and reconsideration triggers.
   - Reject missing why-not or invalid trigger output.
3. Build architecture UI.
   - Comparison matrix.
   - Option detail drawer.
   - Recommendation badge as `AI_SUGGESTED`.
   - Architecture approval action.
   - Approval creates `ArchitectureDecision` with `HUMAN_APPROVED` truth status.
4. Generate Engineering Constitution from the approved graph.
   - Include architecture, quality, security, accessibility, performance, cloud/cost, and delivery rules.
   - Unknown or deferred items remain explicit.
5. Compile deterministic enterprise artifacts from the graph.
   - SRS
   - NFR specification
   - HLD
   - ADR
   - OpenAPI for `POST /notifications` and `GET /notifications/{id}`
   - Test strategy
   - Backlog
   - Codex task packet
   - Constitution
6. Add artifact UI.
   - Tabs/list, preview, copy/download, version/hash/graph version metadata.
7. Add tests.
   - Architecture output validation.
   - Approval creates ADR and trace links.
   - Artifact mandatory sections.
   - Stable IDs after regeneration.
   - OpenAPI parses successfully.
8. Run and fix quality checks.

### Day 3: Controlled Build and Real Verification

**Dependency:** Approved architecture, constitution, OpenAPI, backlog, and Codex task packet exist.

1. Create fixed `notification-service` sandbox template.
   - Fixed dependencies.
   - No package installation from model output.
   - Mock external email/SMS delivery.
   - Local API test harness.
2. Implement code generation schema and fixture provider output.
   - Prefer complete allowlisted file operations for demo reliability.
   - Reject path traversal, disallowed paths, symlink escapes, unsupported file sizes, malformed code output.
3. Implement safe workspace writer.
   - Write only under `sandbox/notification-service/workspace`.
   - Atomic write strategy.
   - Store generated file hashes and trace links.
4. Build code inspection UI.
   - Selected vertical slice.
   - Codex task packet.
   - Generated file tree.
   - Unified diff.
   - Generation loading/failure/empty/success states.
   - User approval before verification.
5. Implement fixed runner command registry.
   - Build/typecheck command.
   - Unit test command.
   - API test command.
   - Coverage command.
   - Timeouts, bounded output, secret-stripped environment, duration, exit code.
6. Normalize verification output into `VerificationRun` and `Evidence`.
   - Parsed pass/fail counts.
   - Parsed coverage values.
   - Failed commands create `FAILED` evidence.
   - Thresholds compare against constitution rules without altering measured values.
7. Build Verify UI.
   - Cards for build, unit, API, coverage.
   - Security/performance/accessibility appear only as P1 if implemented; otherwise no fake cards claiming results.
   - Requirement coverage matrix.
   - Bounded raw output viewer.
8. Add tests.
   - Path allowlist.
   - Runner timeout/failure parsing.
   - Coverage parser fixtures.
   - Evidence truth status.
   - No proof without executed evidence.
9. Run and fix quality checks, including sandbox commands.

### Day 4: Traceability, Why Explorer, Export, Hardening, Demo Freeze

**Dependency:** Generated code and real verification evidence work from the UI.

1. Implement graph query service.
   - Requirement -> decision -> artifact -> code -> test -> evidence traversal.
   - Orphans and unknowns surfaced.
2. Build Traceability UI.
   - Simple visual graph if time allows.
   - Mandatory accessible list/tree fallback.
   - Entity detail drawer.
3. Implement Why / Why Not / Proof resolver.
   - Suggested buttons for the six approved NotifyFlow questions.
   - Free-text endpoint constrained to graph-backed answers.
   - Answers cite graph entity IDs.
   - Proof questions cite executed Evidence or return `UNKNOWN`.
4. Implement export.
   - Individual Markdown/JSON artifact export.
   - Manifest with IDs, versions, hashes, graph version, generated time.
   - Traceability JSON export.
5. Complete E2E tests.
   - Primary end-to-end sample flow.
   - Failure flow showing honest failed tool/model output.
6. Hardening pass.
   - Loading/empty/failure/retry states for every async action.
   - Keyboard labels and accessible status text.
   - No fake progress.
   - README setup and demo commands.
   - `demo:reset` under 30 seconds.
7. Optional only after P0 is stable.
   - Mermaid architecture diagram.
   - ZIP export.
   - Security/performance/a11y scans.
8. Final quality gate.
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm test:e2e`
   - `pnpm build`
   - `pnpm demo:reset`
   - `pnpm sandbox:build`
   - `pnpm sandbox:test`
   - `pnpm sandbox:coverage`

## 2. Smallest Repository Structure Needed

```text
/workspace/shipmind/
├── AGENTS.md
├── SRS.md
├── IMPLEMENTATION_BACKLOG.md
├── DEMO_SCENARIO.md
├── HACKATHON_PLAN.md
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.config.ts
├── playwright.config.ts
├── .env.example
├── sample-inputs/
│   └── notifyflow-brief.md
├── apps/
│   └── web/
│       ├── app/
│       │   ├── page.tsx
│       │   ├── projects/[projectId]/page.tsx
│       │   └── api/
│       │       ├── demo/reset/route.ts
│       │       └── projects/[projectId]/...
│       ├── components/
│       │   ├── lifecycle/
│       │   ├── requirements/
│       │   ├── architecture/
│       │   ├── artifacts/
│       │   ├── build/
│       │   ├── verify/
│       │   ├── traceability/
│       │   └── why/
│       ├── lib/
│       │   ├── api-envelope.ts
│       │   ├── db.ts
│       │   └── server-actions.ts
│       └── tests/
├── src/
│   ├── domain/
│   │   ├── schemas.ts
│   │   ├── ids.ts
│   │   ├── graph.ts
│   │   ├── source-spans.ts
│   │   ├── truth-status.ts
│   │   ├── readiness.ts
│   │   └── trace-links.ts
│   ├── ai/
│   │   ├── provider.ts
│   │   ├── fixture-provider.ts
│   │   ├── live-provider.ts
│   │   ├── prompts/
│   │   └── fixtures/
│   │       ├── notifyflow-analysis.json
│   │       ├── notifyflow-architecture.json
│   │       ├── notifyflow-codegen.json
│   │       └── malformed-analysis.json
│   ├── artifacts/
│   │   ├── compile.ts
│   │   ├── openapi.ts
│   │   └── templates.ts
│   ├── runner/
│   │   ├── commands.ts
│   │   ├── execute.ts
│   │   ├── parsers.ts
│   │   └── safety.ts
│   └── persistence/
│       ├── graph-store.ts
│       └── reset-demo.ts
├── prisma/
│   └── schema.prisma
├── sandbox/
│   └── notification-service/
│       ├── template/
│       └── workspace/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── scripts/
    ├── demo-reset.ts
    └── sandbox-command.ts
```

This keeps one application and internal modules. Separate packages can be introduced later only if workspace boundaries become essential, but Day 1 should not spend time on unnecessary package plumbing.

## 3. Canonical Graph Entities and Zod Schemas

### Shared Enums

```ts
const TruthStatusSchema = z.enum([
  "AI_SUGGESTED",
  "HUMAN_APPROVED",
  "TOOL_EXECUTED",
  "TOOL_VERIFIED",
  "RUNTIME_OBSERVED",
  "UNKNOWN",
  "CONTRADICTED",
  "FAILED",
]);

const LifecycleStatusSchema = z.enum([
  "Draft",
  "Analyzing",
  "Needs Clarification",
  "Architecture Review",
  "Ready to Build",
  "Verifying",
  "Complete",
  "Failed",
]);

const TraceRelationSchema = z.enum([
  "derives",
  "clarifies",
  "constrains",
  "selects",
  "rejects",
  "implements",
  "tests",
  "verifies",
  "contradicts",
  "supersedes",
  "compiled_into",
  "governs",
]);
```

### Day 1 Required Schemas

```ts
const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  domain: z.string().min(1),
  status: LifecycleStatusSchema,
  graphVersion: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

const SourceArtifactSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  type: z.enum(["brief", "transcript", "document"]),
  content: z.string().min(50).max(15000),
  hash: z.string().min(1),
  createdAt: z.string().datetime(),
}).strict();

const SourceSpanSchema = z.object({
  id: z.string().min(1),
  sourceArtifactId: z.string().min(1),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().positive(),
  quote: z.string().min(1),
}).strict().refine((span) => span.endOffset > span.startOffset);

const RequirementSchema = z.object({
  id: z.string().regex(/^(FR|NFR|BR|CON)-\d{3}$/),
  projectId: z.string().min(1),
  type: z.enum(["functional", "non-functional", "business-rule", "constraint"]),
  title: z.string().min(1),
  statement: z.string().min(1),
  priority: z.enum(["must", "should", "could"]),
  readiness: z.enum(["ready", "needs-clarification", "blocked"]),
  truthStatus: TruthStatusSchema,
  confidence: z.number().min(0).max(1),
  sourceSpanIds: z.array(z.string().min(1)),
  acceptanceCriteria: z.array(z.string().min(1)),
  version: z.number().int().positive(),
}).strict();

const NFRDetailSchema = z.object({
  requirementId: z.string().regex(/^NFR-\d{3}$/),
  category: z.enum([
    "performance",
    "availability",
    "security",
    "accessibility",
    "privacy",
    "cost",
    "maintainability",
    "scalability",
    "observability",
  ]),
  metric: z.string().min(1),
  target: z.union([z.string().min(1), z.number(), z.literal("UNKNOWN")]),
  unit: z.string().min(1),
  verificationMethod: z.string().min(1),
}).strict();

const GapSchema = z.object({
  id: z.string().regex(/^GAP-\d{3}$/),
  type: z.enum(["missing", "ambiguous", "conflicting", "untestable"]),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["blocker", "high", "medium", "low"]),
  impactAreas: z.array(z.string().min(1)),
  affectedEntityIds: z.array(z.string().min(1)),
  status: z.enum(["open", "answered", "accepted-risk", "deferred"]),
  sourceSpanIds: z.array(z.string().min(1)).default([]),
}).strict();

const ClarificationQuestionSchema = z.object({
  id: z.string().regex(/^CQ-\d{3}$/),
  gapId: z.string().regex(/^GAP-\d{3}$/),
  question: z.string().min(1),
  whyItMatters: z.string().min(1),
  options: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) }).strict()).min(1),
  answer: z.string().min(1).nullable(),
  answeredAt: z.string().datetime().nullable(),
}).strict();

const TraceLinkSchema = z.object({
  id: z.string().min(1),
  fromType: z.string().min(1),
  fromId: z.string().min(1),
  relation: TraceRelationSchema,
  toType: z.string().min(1),
  toId: z.string().min(1),
  metadata: z.record(z.unknown()).default({}),
}).strict();
```

### Day 2 Schemas

```ts
const ArchitectureOptionSchema = z.object({
  id: z.string().regex(/^ARCH-OPT-\d{3}$/),
  name: z.string().min(1),
  summary: z.string().min(1),
  components: z.array(z.object({ name: z.string(), responsibility: z.string() }).strict()).min(1),
  dataFlows: z.array(z.object({ from: z.string(), to: z.string(), description: z.string() }).strict()).min(1),
  technologies: z.array(z.string().min(1)).min(1),
  why: z.array(z.string().min(1)).min(1),
  whyNot: z.array(z.string().min(1)).min(1),
  assumptions: z.array(z.string().min(1)).min(1),
  failureModes: z.array(z.object({ failure: z.string(), mitigation: z.string() }).strict()).min(2),
  reconsiderationTriggers: z.array(z.object({ metric: z.string(), threshold: z.string(), action: z.string() }).strict()).min(1),
  scoreBreakdown: z.record(z.number()),
  estimatedCost: z.object({ range: z.string(), basis: z.string(), truthStatus: z.literal("AI_SUGGESTED") }).strict(),
  truthStatus: TruthStatusSchema,
}).strict();

const ArchitectureDecisionSchema = z.object({
  id: z.string().regex(/^ADR-\d{3}$/),
  question: z.string().min(1),
  selectedOptionId: z.string().min(1),
  rejectedOptionIds: z.array(z.string().min(1)),
  rationale: z.array(z.string().min(1)),
  rejectedRationale: z.record(z.array(z.string().min(1))),
  assumptions: z.array(z.string().min(1)),
  risks: z.array(z.string().min(1)),
  reconsiderationTriggers: z.array(z.object({ metric: z.string(), threshold: z.string(), action: z.string() }).strict()),
  status: z.enum(["proposed", "approved", "superseded"]),
  truthStatus: TruthStatusSchema,
  approvedAt: z.string().datetime().nullable(),
}).strict();

const ConstitutionRuleSchema = z.object({
  id: z.string().regex(/^(ARCH|QUAL|SEC|PERF|A11Y|COST|DEL)-\d{3}$/),
  category: z.enum(["architecture", "quality", "security", "accessibility", "performance", "cloud", "delivery"]),
  statement: z.string().min(1),
  severity: z.enum(["blocker", "high", "medium", "low"]),
  rationale: z.string().min(1),
  verificationMethod: z.string().min(1),
  threshold: z.record(z.unknown()).nullable(),
  status: z.enum(["proposed", "approved", "disabled"]),
}).strict();

const ArtifactSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["srs", "nfr", "hld", "adr", "openapi", "test-strategy", "backlog", "constitution", "codex-task"]),
  version: z.number().int().positive(),
  content: z.union([z.string(), z.record(z.unknown())]),
  sourceGraphVersion: z.number().int().nonnegative(),
  hash: z.string().min(1),
  truthStatus: TruthStatusSchema,
  generatedAt: z.string().datetime(),
}).strict();
```

### Day 3 and Day 4 Schemas

```ts
const WorkItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["epic", "story", "task"]),
  title: z.string().min(1),
  description: z.string().min(1),
  acceptanceCriteria: z.array(z.string().min(1)),
  priority: z.enum(["must", "should", "could"]),
  dependencyIds: z.array(z.string().min(1)),
  linkedRequirementIds: z.array(z.string().min(1)),
  selectedForBuild: z.boolean(),
}).strict();

const CodeFileSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  content: z.string(),
  hash: z.string().min(1),
  linkedEntityIds: z.array(z.string().min(1)),
  generationId: z.string().min(1),
}).strict();

const VerificationRunSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["build", "unit", "api", "coverage", "security", "performance", "accessibility"]),
  command: z.string().min(1),
  startedAt: z.string().datetime(),
  durationMs: z.number().int().nonnegative(),
  exitCode: z.number().int().nullable(),
  status: z.enum(["queued", "running", "passed", "failed", "error"]),
  rawOutputExcerpt: z.string(),
  metrics: z.record(z.unknown()),
}).strict();

const EvidenceSchema = z.object({
  id: z.string().min(1),
  verificationRunId: z.string().min(1).nullable(),
  type: z.string().min(1),
  truthStatus: TruthStatusSchema,
  claim: z.string().min(1),
  measurements: z.record(z.unknown()),
  linkedEntityIds: z.array(z.string().min(1)),
  createdAt: z.string().datetime(),
}).strict();

const WhyAnswerSchema = z.object({
  question: z.string().min(1),
  answerType: z.enum(["why", "why-not", "proof", "reconsider", "unknown"]),
  sections: z.object({
    why: z.array(z.string()).default([]),
    whyNot: z.array(z.string()).default([]),
    proof: z.array(z.string()).default([]),
    reconsiderWhen: z.array(z.string()).default([]),
    unknowns: z.array(z.string()).default([]),
  }).strict(),
  citedEntityIds: z.array(z.string().min(1)),
  evidenceIds: z.array(z.string().min(1)).default([]),
}).strict();
```

## 4. Exact Visible Demo Flow and Screen States

### Three-Minute Visible Flow

1. **Landing**
   - Click `Try NotifyFlow Sample`.
   - Shows value proposition, privacy note, no login.
2. **Intent**
   - Shows NotifyFlow brief from `sample-inputs/notifyflow-brief.md`.
   - User clicks `Start Analysis`.
   - UI displays real loading state, then `Demo Data` label if fixture provider was used.
3. **Requirements**
   - Shows functional requirements, NFRs, assumptions, risks, at least five gaps, and readiness score.
   - User opens a requirement source drawer and sees the exact source excerpt from stored offsets.
   - User answers three to five clarification questions.
   - Readiness score updates deterministically; at least one item remains `UNKNOWN`.
4. **Architecture**
   - User clicks `Generate Architecture Options`.
   - Three options render: serverless event-driven, containerized modular service, Kafka microservices.
   - User opens Kafka `Why Not` detail.
   - User approves serverless event-driven.
   - ADR preview appears with `HUMAN_APPROVED` status.
5. **Artifacts**
   - User clicks `Generate Artifact Pack`.
   - Shows SRS, NFR, HLD, ADR, OpenAPI, test strategy, backlog, Codex task, and constitution as compiled graph views.
   - User opens OpenAPI and test strategy tabs.
6. **Build**
   - User clicks `Generate API Slice`.
   - Generated files appear in a file tree and unified diff.
   - User approves code for verification.
7. **Verify**
   - User clicks `Run Verification`.
   - App runs fixed build, unit, API, and coverage commands.
   - Cards show command, duration, exit code, metrics, truth status, and bounded raw output.
   - Failed commands, if any, remain failed and visible.
8. **Traceability**
   - User opens requirement-to-code-to-test-to-evidence path.
   - Graph/list fallback shows unknowns and orphans.
9. **Why**
   - User clicks approved sample questions:
     - Why did we choose a queue-based design?
     - Why did we not choose Kafka?
     - Which requirement caused tenant isolation logic?
     - What proves idempotency behavior works?
     - What is still unverified?
     - When should we reconsider the selected architecture?
   - Answers cite graph entity IDs and evidence IDs where proof exists.

### Required State Coverage Per Async Screen

| Screen | Idle | Loading | Success | Empty | Validation Failure | Tool/Model Failure |
|---|---|---|---|---|---|---|
| Landing | No project selected | Creating sample | Sample loaded | No samples available | N/A | Reset/load failed |
| Intent | Editable/preview brief | Analyzing | Source artifact persisted | No brief submitted | Brief too short/long/empty | Provider or validation failure |
| Requirements | Awaiting analysis | Loading graph | Requirements/gaps shown | No extracted items | Malformed analysis rejected | Last valid graph preserved |
| Clarifications | Questions visible | Saving answer | Score updated | No questions | Missing answer | Graph update rejected |
| Architecture | Awaiting generation | Generating options | Options shown | No options | Invalid option output | Previous graph preserved |
| Artifacts | Awaiting approved ADR | Compiling | Artifact tabs shown | No artifacts | Missing required graph data | Compiler failure shown |
| Build | Awaiting artifact pack | Generating code | File tree/diff shown | No generated files | Unsafe path/output rejected | No files written |
| Verify | Awaiting code approval | Running fixed commands | Evidence shown | No runs yet | Verification not approved | FAILED evidence created |
| Traceability | Awaiting graph | Loading | Graph/list shown | No links | Invalid filter | Query failure shown |
| Why | Suggested prompts | Resolving | Grounded answer shown | No answer found | Empty question | Unknown/proof unavailable stated |

## 5. Commands

### Development

```bash
pnpm install
pnpm dev
```

### Product App Quality

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

### Demo Reset

```bash
pnpm demo:reset
```

### Sandbox Verification

```bash
pnpm sandbox:build
pnpm sandbox:test
pnpm sandbox:coverage
```

### Command Mapping

- `pnpm dev`: start `apps/web` locally.
- `pnpm lint`: lint all app and internal module files.
- `pnpm typecheck`: strict TypeScript check across app, domain, AI, artifact, runner, and sandbox command wrappers.
- `pnpm test`: Vitest unit/integration tests.
- `pnpm test:e2e`: Playwright primary and failure flows.
- `pnpm build`: production Next.js build.
- `pnpm demo:reset`: reset SQLite graph and sandbox workspace to deterministic NotifyFlow initial state.
- `pnpm sandbox:build`: fixed command for generated notification service build/typecheck.
- `pnpm sandbox:test`: fixed command for generated notification service unit and API tests.
- `pnpm sandbox:coverage`: fixed command for generated notification service coverage.

## 6. Five Highest Technical Risks and Fallbacks

| Risk | Why It Matters | Fallback |
|---|---|---|
| Model output instability or API outage | Demo must work reliably and no API key can be required. | Use fixture provider as default; label fixture output `Demo Data`; keep live adapter behind same interface and only enable when configured. |
| Generated code fails too late in the demo | A broken sandbox can block evidence and Why/Proof flow. | Use a fixed notification-service template plus complete allowlisted file operations; if generation fails validation, keep previously valid generated workspace and show failure honestly. |
| Runner/deployment child-process limitations | Real evidence requires command execution. | Verify Node child-process support early; if hosted environment blocks it, run demo locally or in a single Node-compatible container; never replace with fake evidence. |
| Source grounding bugs create false trust | Exact source excerpts are a core differentiator and Day 1 acceptance criterion. | Store offsets first, compute quotes from immutable source content, reject invalid spans atomically, and include source-span unit tests before UI polish. |
| Scope explosion across artifacts, graph, P1 scans, and UI | Four days is short; unfinished breadth hurts the three-minute story. | Cut P1 scans, graph visualization polish, custom project creation polish, ZIP export, animations, and live model polish before cutting the P0 linear NotifyFlow journey. |

## 7. Cut List if Time Slips

Cut in this order, preserving the end-to-end P0 journey:

1. P1 security scan.
2. P1 performance benchmark.
3. P1 automated accessibility scan, while preserving P0 accessibility basics.
4. Mermaid architecture diagram.
5. ZIP export; keep individual Markdown/JSON export and manifest.
6. Free-text Why query; keep six suggested graph-backed questions.
7. Visual trace graph; keep accessible list/tree fallback.
8. Custom project creation polish; keep NotifyFlow sample and pasted brief validation.
9. Live model adapter polish; keep interface plus fixture provider and a minimal documented live-provider stub only if necessary.
10. Artifact styling/templates beyond mandatory sections.
11. Unified diff visual polish; keep file tree and text diff.
12. Secondary E2E coverage beyond primary flow and honest failure flow.

Must not cut:

- Source-grounded requirements.
- Zod validation before persistence.
- Atomic rejection of malformed model output.
- Deterministic readiness score.
- Architecture why/why-not with human approval.
- Controlled sandbox and fixed commands.
- Real verification evidence.
- At least four grounded Why / Why Not / Proof answers.

## 8. Acceptance Checks for Each Day

### Day 1 Acceptance Checks

- App starts locally with `pnpm dev`.
- NotifyFlow sample can be seeded and reset with `pnpm demo:reset`.
- User can submit the NotifyFlow sample brief.
- Fixture provider returns validated FRs, NFRs, assumptions, risks, and at least five meaningful gaps.
- Every source-grounded item opens the exact supporting source excerpt from stored source spans.
- Readiness score is deterministic and exposes category calculation.
- Malformed, ungrounded, or invalid-span analysis is rejected without corrupting stored data.
- Loading, empty, validation failure, model failure, and success states exist for Day 1 screens.
- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm test` passes for Day 1 unit/integration tests.
- `pnpm build` passes.

### Day 2 Acceptance Checks

- Three to five clarification answers update graph data and readiness.
- Architecture view renders at least three options.
- Every option includes why, why not, assumptions, failure modes, cost estimate labelled as estimate, and reconsideration triggers.
- Architecture recommendation is `AI_SUGGESTED` until approved.
- User approval changes selected decision to `HUMAN_APPROVED` and creates ADR.
- Engineering Constitution is generated from the approved graph.
- SRS, NFR, HLD, ADR, OpenAPI, test strategy, backlog, Codex task, and constitution artifacts generate from the graph.
- OpenAPI parses successfully.
- Artifact versions, hashes, and graph version metadata are visible.
- Relevant tests plus lint/typecheck/build pass.

### Day 3 Acceptance Checks

- Controlled notification-service workspace exists and reset is deterministic.
- Generated API vertical slice implements `POST /notifications` and `GET /notifications/{id}` with validation, trusted tenant context, idempotency, audit event, and tenant-isolated retrieval.
- Generated tests reference requirement or test IDs.
- Generated files are limited to allowlisted sandbox paths.
- Unsafe paths, malformed output, symlink escapes, and oversized files are rejected without writing.
- User can inspect file tree and diff before verification.
- Verification cannot start before user approval.
- Fixed build, unit/API, and coverage commands execute and capture duration, exit code, metrics, and bounded raw output.
- Failed commands produce `FAILED` evidence.
- Requirement coverage matrix shows verified and `UNKNOWN` items.
- Relevant tests plus lint/typecheck/build/sandbox commands pass or fail honestly with diagnostics.

### Day 4 Acceptance Checks

- Primary Playwright E2E covers launch sample through Why answer.
- Failure E2E covers an honest model/tool failure state.
- Traceability view supports requirement -> decision -> code -> test -> evidence navigation.
- Accessible list/tree fallback exists even if visual graph is minimal.
- Why explorer answers at least four approved sample questions with graph entity citations.
- Proof answers reference executed Evidence or explicitly state `UNKNOWN`.
- At least one unknown remains visible and is not mislabeled as passed.
- Artifacts and traceability export as Markdown/JSON with manifest.
- `pnpm demo:reset` completes in under 30 seconds.
- Final commands pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm demo:reset`, `pnpm sandbox:build`, `pnpm sandbox:test`, `pnpm sandbox:coverage`.

## Blocking Decision Needed

The only blocking implementation decision to resolve before or during Day 1 is the persistence choice:

- **Recommended:** Prisma + SQLite because it matches the SRS-approved stack and supports resettable local persistence.
- **Fallback:** A documented typed SQLite equivalent or a single JSON graph snapshot table if Prisma setup costs threaten Day 1 completion.

A second deployment decision is needed by Day 3, not before Day 1 implementation:

- choose a Node-compatible host/container environment that permits controlled child processes, or plan the final demo as a local/container demo.
