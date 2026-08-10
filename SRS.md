# Axiom — Commercial Software Requirements Specification

**Document ID:** AX-SRS-COM-001

**Version:** 4.0

**Date:** 2026-08-09

**Status:** Approved product contract

**Classification:** Internal / Commercial product

**Supersedes:** Axiom Commercial SRS 3.2 dated 2026-08-09

## 1. Document control

| Field | Decision |
|---|---|
| Product | Axiom, an AI Engineering Operating System |
| Product thesis | Convert business intent into grounded product experience, engineering decisions, high-quality delivery work, controlled execution, and verifiable evidence |
| Initial customers | SMEs, product teams, engineering organizations, and enterprise pilots |
| Source of truth | The canonical project graph in PostgreSQL |
| Delivery architecture | Separate Next.js web, Node.js TypeScript platform, and Terraform repositories; the platform remains a modular monolith with independently extractable modules |
| Axiom service production cloud | AWS |
| Local development | Docker Compose; no cloud deployment required |
| Delivery management | Axiom-native, graph-backed Delivery Workspace for governed software-delivery work items; no Jira or Trello dependency and no general-purpose project-management scope |
| Customer workload placement | Provider-neutral, evidence-based recommendation and human decision; Axiom's own AWS hosting is not an implicit customer default |
| AI strategy | Axiom-owned agent workflows using hosted model providers; no Axiom-trained foundation model or owned GPU fleet at launch |
| Change control | Material product, scope, architecture, or roadmap decisions shall update this SRS, its decision register, and its change log in the same change; repository product ADRs and implementation-status documents are not authoritative |

### 1.1 Priority convention

- **Launch:** required before accepting general commercial customers.
- **Next:** planned after the launch gates are stable.
- **Later:** explicitly outside the first commercial release.

### 1.2 Requirement language

“Shall” is mandatory. “Should” is a recommendation. Measured claims are not satisfied by generated prose; they require stored evidence.

## 2. Product definition

### 2.1 Purpose

Axiom is a governed AI-native Forward Deployed Engineering capability: it works from the customer's business reality through product design, architecture, delivery, and proof while preserving human authority over consequential decisions and side effects.

Axiom helps teams convert source material such as product briefs, documents, decisions, and meeting notes into:

- a source-grounded model of business outcomes, actors, operating workflows, policies, constraints, risks, and success measures;
- grounded requirements and non-functional requirements;
- explicit gaps and clarification questions;
- reviewable user journeys, information architecture, editable wireframes, interaction flows, and an approved Experience Baseline;
- architecture alternatives and approved decisions;
- full-lifecycle engineering guidance covering technology choices, UX/accessibility, data, APIs, testing, security, delivery, deployment, cloud infrastructure, reliability, observability, cost, and operations;
- implementation-ready work items managed through Axiom's native Delivery Workspace;
- governed code-generation decisions, component contracts, and controlled task packets for Axiom or external coding agents;
- versioned test strategies and real UI, functional, API, database, security, authorized penetration, and performance evidence;
- evidence-based cloud-placement recommendations, controlled deployment support, and runtime monitoring plans and evidence;
- traceable Why, Why Not, Proof, and Reconsider answers.

### 2.2 Differentiator

Axiom is not a generic chatbot or a general-purpose project-management suite. Its differentiator is a governed reasoning, delivery, and evidence layer:

```text
Source evidence
  -> business outcomes and operating context
  -> canonical requirements
  -> clarified decisions
  -> reviewed user journeys and editable experience design
  -> compared architecture and workload-placement options
  -> compatible approved architecture and placement decision
  -> reviewed engineering and observability plan
  -> verified work items
  -> Axiom Delivery Workspace
  -> governed code generation and component contracts
  -> complete test strategy and real verification
  -> approved Deployment Baseline and controlled deployment where applicable
  -> runtime monitoring, feedback, and traceability
```

### 2.3 Launch goals

1. Produce materially better engineering work items than a single free-form prompt.
2. Prevent unsupported assumptions and fabricated evidence.
3. Make every important work item traceable to approved source material.
4. Let each organization control models, budgets, delivery policies, integrations, repositories, environments, and approvals.
5. Support economical hosted inference without purchasing or operating GPUs.
6. Provide a secure multi-tenant SaaS foundation that can grow without an immediate microservice rewrite.
7. Measure quality, cost, latency, and human acceptance for every AI workflow version.
8. Help users understand what is recommended, what is not recommended, why, the trade-offs, the missing evidence, and when a decision should be reconsidered across the complete software delivery lifecycle.
9. Let business, product, design, and engineering stakeholders review the same source-linked user journeys and wireframes before implementation scope is approved.

### 2.4 Non-goals for launch

Axiom shall not:

- become a general-purpose project-management suite for unrelated company work; arbitrary issue schemas and workflows, sprint capacity and burndown, time tracking, portfolio planning, team chat/wiki, and marketplace-style automation are outside launch scope;
- replace a general-purpose visual-design suite for unrelated design work;
- train a proprietary foundation model;
- operate a GPU cluster;
- promise autonomous end-to-end software delivery without review;
- silently approve, assign, start, complete, or bulk-transition work; create code changes; run penetration or production performance tests; deploy; provision resources; or make purchases;
- execute arbitrary model-generated shell commands;
- support arbitrary third-party models before they pass Axiom evaluations;
- deploy on Vercel;
- require Kubernetes for the first commercial release;
- claim legal, regulatory, security, or accessibility certification from automated checks alone.

## 3. Users, organizations, and access

### 3.1 Roles

| Role | Primary permissions |
|---|---|
| Organization Owner | Billing, retention, providers, delivery policy, integrations, organization deletion |
| Administrator | Members, roles, model policies, budgets, integrations, environment policies |
| Product/Business Analyst | Sources, requirements, clarifications, work-item review |
| Product/Experience Designer | Business workflows, user journeys, wireframe editing, design review |
| Architect/Engineering Lead | Architecture review, approval, engineering policies |
| Developer | Approved native work items, coding-profile decisions, coding-agent handoff, implementation evidence |
| QA/Reviewer | Test-strategy review, evaluation, verification, security/performance evidence review |
| Release/Operations Engineer | Approved environment configuration, deployment and rollback review, runtime monitoring, incident and runbook evidence; production rights remain separately scoped |
| Viewer/Auditor | Read-only approved artifacts, history, traceability, evidence |

### 3.2 Tenancy requirements

| ID | Requirement | Priority |
|---|---|---:|
| FR-TEN-001 | Every persisted customer object shall belong to exactly one organization. | Launch |
| FR-TEN-002 | Authorization shall be enforced server-side on every organization-scoped operation. | Launch |
| FR-TEN-003 | Database queries shall require organization scope through shared repository boundaries. | Launch |
| FR-TEN-004 | Organization roles shall follow least privilege and deny by default. | Launch |
| FR-TEN-005 | Enterprise customers shall be able to configure retention and model-provider policies. | Next |
| FR-TEN-006 | SSO/SAML and SCIM shall be supported for eligible enterprise plans. | Next |

### 3.3 Authentication

Launch authentication shall support secure email-based or standards-based login through an isolated authentication adapter. Session cookies shall be secure, HTTP-only, same-site protected, rotated where appropriate, and revocable. Multi-factor authentication is required for organization owners before general enterprise availability.

## 4. Product principles and truth model

### 4.1 Canonical graph

PostgreSQL-backed structured entities are authoritative. Native `WorkItem` and `WorkItemVersion` entities, their assignments, dependencies, lifecycle events, approvals, and evidence links are part of that canonical graph. Markdown, diagrams, external artifact copies, exports, and agent task packets are compiled or synchronized views. Stable entity IDs shall survive regeneration, revision, export, and approved integration.

For governed implementation, the canonical graph expresses approved product and engineering intent; a versioned Coding Profile and Component Contract express approved implementation conventions and component intent; the exact repository revision expresses actual code state; and immutable Verification Evidence expresses what approved tools executed and proved. Per-component Markdown is a checked-in human-readable projection of a Component Contract, not independent authority. If these layers conflict, Axiom shall expose `CONTRADICTED` or `UNKNOWN` and request resolution rather than silently choosing one.

### 4.2 Truth statuses

| Status | Meaning |
|---|---|
| `SOURCE_GROUNDED` | Supported by immutable stored source spans |
| `HUMAN_CONFIRMED` | Confirmed by an authorized user |
| `AI_SUGGESTED` | Generated but not independently confirmed |
| `TOOL_EXECUTED` | A real tool ran and returned a result |
| `TOOL_VERIFIED` | Executed evidence met a deterministic assertion |
| `RUNTIME_OBSERVED` | Supported by production telemetry |
| `UNKNOWN` | Evidence is missing or insufficient |
| `CONTRADICTED` | Available evidence conflicts with the claim |
| `FAILED` | The operation failed; no success claim is allowed |

Truth transitions shall be centralized domain logic and shall record actor, time, reason, and previous state.

### 4.3 Non-fabrication rules

The system shall never fabricate source quotations, work-item generation, assignment, lifecycle or completion, test results, coverage, scan findings, cost measurements, performance metrics, deployment status, runtime observations, or coding-agent outcomes. A model may summarize immutable measurements but may not alter them.

### 4.4 Multi-agent disagreement and recommendation model

Axiom shall use a single logical-agent workflow by default. Multiple agents may participate in a bounded workflow only when task-specific evaluation demonstrates that distinct expertise, independent critique, context isolation, parallel execution, or dynamic decomposition materially improves quality or latency enough to justify the additional cost and failure modes.

The application-owned Agent Kernel, not a supervisor model, shall control workflow state, routing bounds, context access, authorization, truth transitions, budgets, retries, approvals, side effects, and evidence. Participating agents may analyze, critique, synthesize, and recommend, but they may not approve one another, silently discard dissent, or mutate canonical truth directly.

A disagreement is material when resolving it could change an approved outcome, requirement, product behavior, experience, architecture, security or privacy control, cost or operational commitment, work-item acceptance criteria, implementation boundary, verification expectation, or external side effect. Non-material wording or formatting differences may be normalized deterministically without creating a human decision gate.

When a material disagreement exists, Axiom shall:

1. preserve each distinct position and its exact workflow, prompt, model, input, output, and provenance;
2. identify the affected canonical entities, approved versions, evidence, unknowns, and downstream decisions;
3. present the authorized human reviewer with alternatives ranked as `RECOMMENDED`, `VIABLE`, `CONDITIONAL`, or `NOT_PREFERRED` under the current approved evidence;
4. explain why the first option is preferred, why each lower-ranked option is not preferred now, and the benefits, trade-offs, risks, assumptions, evidence strength, missing evidence, and reconsideration triggers for every option;
5. allow the reviewer to accept the recommendation, select another option, edit or combine options, request more evidence, defer the decision, or reject all options;
6. revalidate any human-edited or combined option before confirmation;
7. keep affected downstream work blocked while the decision is deferred, rejected without replacement, or otherwise unresolved; and
8. record the exact reviewed alternatives, ranking, recommendation, dissent, human selection, rationale, actor, time, content hashes, graph version, affected entities, and invalidated downstream artifacts.

The ranking is contextual guidance, not an assertion of universal correctness. An authorized reviewer may choose a lower-ranked option; Axiom shall preserve that choice and rationale as `HUMAN_CONFIRMED` without rewriting the historical recommendation.

## 5. Primary commercial journeys

### 5.1 Source to approved delivery work

1. User creates or opens an organization project.
2. User uploads supported sources or pastes business intent.
3. Axiom stores immutable source versions and extracts addressable spans.
4. The agent workflow extracts requirements, NFRs, risks, constraints, and gaps.
5. Deterministic validation rejects invalid references and incomplete output.
6. Axiom asks prioritized clarification questions instead of inventing critical facts.
7. Authorized users confirm answers and approve the requirement baseline.
8. Where the scope includes a user experience, Axiom generates and an authorized user approves the exact Experience Baseline.
9. Axiom generates compatible architecture and workload-placement options where those decisions are applicable, explicitly records not-applicable or blocked scope, and compares dated service, risk, portability, and cost evidence.
10. An authorized user approves a mutually compatible architecture and placement decision; either decision changing later invalidates incompatible downstream work.
11. Axiom generates implementation-ready work items from the compatible approved baselines.
12. Quality gates score coverage, grounding, testability, duplication, design alignment, and completeness.
13. A human reviews the exact immutable `WorkItemVersion` set and delivery-activation preview.
14. Approval activates the exact versions in Axiom's native Delivery Workspace with dependency, ownership-readiness, lifecycle, and audit policy; an item may remain visibly unassigned until execution is requested.

### 5.2 Business intent to approved Experience Baseline

1. Axiom selects the exact current source, requirement, clarification, and business-context versions.
2. The bounded workflow identifies business outcomes, actors, jobs, operating workflows, policies, constraints, success measures, and unresolved product decisions.
3. Axiom proposes information architecture, user journeys, screens, states, and interactions only where the approved product scope requires a user experience.
4. Every generated design claim is linked to canonical entities or marked as a design hypothesis with `AI_SUGGESTED` or `UNKNOWN` truth status.
5. Deterministic validation checks requirement coverage, critical-flow continuity, required asynchronous and failure states, role and permission boundaries, accessibility expectations, contradictions, and invalid entity references.
6. Authorized users edit the generated wireframes and interaction flows in the governed Experience Studio without silently changing canonical requirements.
7. A proposed design change that alters business behavior creates an explicit graph-change proposal and requires the normal clarification or approval workflow.
8. Authorized reviewers inspect the exact immutable design version, source coverage, open gaps, and interaction preview before approval.
9. Approval creates a versioned Experience Baseline bound to the current graph; material graph changes make it historical and block stale downstream use.

### 5.3 Approved work to governed implementation evidence

1. Axiom selects the exact approved business, requirement, applicable Experience Baseline or approved not-applicable decision, architecture, workload-placement, Engineering Plan, and work-item versions.
2. The user authorizes the repository revision, workspace, branch policy, and allowed paths.
3. Axiom safely inspects the repository's current conventions and proposes an effective Coding Profile without reading excluded files or secrets.
4. Material unknowns or conflicts become bounded coding-profile questions with project-specific options ranked from `RECOMMENDED` to `NOT_PREFERRED`; an authorized human decides, edits, requests evidence, or defers them.
5. Axiom presents an immutable Code Generation Plan containing intended components and files, dependencies, migrations, infrastructure changes, tests, component documentation, commands, risks, cost bounds, and write boundaries.
6. Explicit approval authorizes bounded generation in an isolated staging workspace using Axiom Native, Codex, GitHub Copilot, Devin, or export-only when that adapter is enabled.
7. Generation persists proposed Component Contracts and stages code with companion Markdown projections in one reviewable repository change set; contracts become current only after the approved repository effect is reconciled to the resulting revision.
8. Deterministic validation checks paths, architecture boundaries, profile compliance, dependencies, licenses, secrets, component-contract completeness, documentation freshness, traceability, and prohibited changes.
9. A versioned Test Strategy gives UI, functional, API, database, security, authorized penetration, and performance testing an explicit applicable disposition and verification obligation.
10. Only repository-defined, reviewed, allowlisted commands run in the controlled runner; penetration and production-impacting tests require their additional scope authorization.
11. Axiom presents the exact diff, component documentation, passed, failed, blocked, and unexecuted checks, security findings, performance results, and immutable evidence.
12. Branch, commit, push, pull-request, environment, or deployment effects require their own current exact preview and explicit authorization.
13. Approved code and real evidence remain traceable to originating intent, decisions, work items, repository revision, component versions, test obligations, and any later deployment release candidate.

### 5.4 Approved intent to full-lifecycle engineering plan

1. Axiom selects the exact approved requirement, applicable Experience Baseline or approved not-applicable decision, compatible architecture, and workload-placement versions.
2. A versioned Agent Kernel workflow proposes engineering guidance across every required lifecycle domain.
3. Every recommendation states its disposition, rationale, benefits, trade-offs, risks, alternatives, why alternatives are not preferred now, reconsideration triggers, implementation actions, verification expectations, source entities, and applicable controlled reference IDs.
4. Missing business or engineering evidence becomes an explicit unknown or decision gate rather than an invented recommendation.
5. Deterministic validation rejects missing lifecycle domains, invalid source links, prohibited evidence claims, unsupported reference IDs, and incomplete why/why-not analysis.
6. The exact immutable plan remains `AI_SUGGESTED` until reviewed; it cannot approve architecture, approve or activate native work, modify infrastructure, deploy, or claim verification.
7. Material source, requirement, workload-placement, or architecture changes make earlier plans historical and require regeneration.

### 5.5 Material agent disagreement to human decision

1. A bounded workflow detects materially incompatible agent findings or recommendations.
2. Axiom preserves the original positions and deterministically identifies the affected entities, evidence, unknowns, and blocked downstream scope.
3. A bounded synthesis step may normalize comparable options but may not erase substantive dissent or override a deterministic failure.
4. Axiom ranks the options from `RECOMMENDED` through `NOT_PREFERRED` using the exact approved project context and exposes the rationale, why-not-now analysis, trade-offs, risks, assumptions, missing evidence, and reconsideration triggers.
5. An authorized human reviews the exact immutable decision packet and may accept, choose another option, edit or combine options, request more evidence, defer, or reject all options.
6. Requests for more evidence re-enter a budgeted, revision-limited analysis path; repeated equivalent outcomes trigger a visible stall instead of an unbounded retry loop.
7. Edited or combined options return through schema, grounding, policy, contradiction, and compatibility validation.
8. A confirmed selection becomes a versioned `HUMAN_CONFIRMED` graph decision with provenance and audit; incompatible downstream approvals become historical.
9. A deferred or unresolved disagreement remains visible and blocks only the affected downstream paths until resolved.

### 5.6 Approved release to deployed and monitored workload

1. Axiom separates its own AWS hosting profile from the customer project's workload-placement decision and gathers approved residency, security, availability, recovery, latency, scale, integration, skill, cost, portability, and operating-model constraints.
2. Axiom compares credible public-cloud, private/on-premises, hybrid, managed-service, and no-migration options as applicable; it ranks the viable paths, explains why and why not now, marks unknowns, and records any customer-mandated provider as a constraint rather than an independent recommendation.
3. Human approval creates a versioned workload-placement decision bound to the exact approved graph, applicable Experience Baseline or approved not-applicable decision, compatible architecture-option set, and dated service and cost evidence. A change re-enters the architecture compatibility gate.
4. Only when the approved path has an actual deployable target, an authorized user binds that target as a separate Deployment Baseline; SaaS, no-migration, or other non-deployment decisions may correctly have no Deployment Baseline.
5. Axiom compiles a release candidate from immutable source, build, artifact, SBOM, infrastructure, configuration, migration, requirement, work-item, and verification versions.
6. Before each environment mutation, Axiom shows the exact target, artifact and configuration digests, infrastructure and migration diff, replacements or deletions, permissions, cost change, blast radius, downtime, verification, and rollback or forward-recovery plan without exposing secret values.
7. An authorized human approves that exact release candidate for that exact environment; changed inputs or expired authority invalidate the approval, and approval in one environment never implies approval in another.
8. An approved least-privilege deployment adapter executes, reconciles provider results, runs the applicable post-deployment verification profile, and distinguishes deployment completion from verification and observation-window completion.
9. Axiom records real deployment and rollback evidence and links immutable release markers to logs, metrics, traces, SLIs, SLOs, alerts, dashboards, runbooks, incidents, and follow-up native work items.
10. Missing or contradictory telemetry remains `UNKNOWN` or `CONTRADICTED`; Axiom recommends investigation, rollback, or forward recovery according to policy, but does not perform an unapproved production mutation.

## 6. Functional requirements

### 6.1 Projects and source ingestion

| ID | Requirement | Priority |
|---|---|---:|
| FR-PROJ-001 | Users shall create, archive, restore, and explicitly delete organization-scoped projects. | Launch |
| FR-PROJ-002 | A project shall expose lifecycle status, current graph version, approvals, native delivery state, enabled integration state, and budget usage. | Launch |
| FR-SRC-001 | The system shall accept bounded text, Markdown, PDF, DOCX, CSV, JSON, YAML, and pasted notes. | Launch |
| FR-SRC-002 | Each source version shall store type, hash, size, uploader, extraction status, and immutable content reference. | Launch |
| FR-SRC-003 | Grounded claims shall reference valid stored source spans. | Launch |
| FR-SRC-004 | Failed extraction shall remain visible and shall not be analyzed as successful content. | Launch |
| FR-SRC-005 | Uploaded content shall be scanned and validated before downstream processing. | Launch |
| FR-SRC-006 | Source deletion shall respect retention, legal-hold, traceability, and audit policies. | Next |

### 6.2 Requirement intelligence

| ID | Requirement | Priority |
|---|---|---:|
| FR-REQ-001 | Axiom shall extract goals, actors, functional requirements, NFRs, rules, constraints, dependencies, assumptions, and risks. | Launch |
| FR-REQ-002 | Each grounded requirement shall cite one or more exact source spans. | Launch |
| FR-REQ-003 | Unsupported inference shall be represented as `AI_SUGGESTED` or `UNKNOWN`, never as source-grounded. | Launch |
| FR-REQ-004 | Axiom shall detect missing, ambiguous, conflicting, duplicate, and untestable statements. | Launch |
| FR-REQ-005 | Clarification questions shall state why they matter and which entities they affect. | Launch |
| FR-REQ-006 | Human answers shall create versioned graph mutations and provenance links. | Launch |
| FR-REQ-007 | Readiness shall be deterministic and shall expose its calculation. | Launch |
| FR-REQ-008 | Material source or clarification changes shall invalidate stale downstream approvals. | Launch |

### 6.3 Business discovery and experience design

| ID | Requirement | Priority |
|---|---|---:|
| FR-DISC-001 | Axiom shall model source-grounded business outcomes, actors, jobs, operating workflows, policies, constraints, risks, and measurable success criteria before proposing implementation scope. | Launch |
| FR-DISC-002 | Business-model, market, process, or user assumptions without source or human confirmation shall remain `AI_SUGGESTED` or `UNKNOWN` and shall expose the decision required. | Launch |
| FR-DISC-003 | Axiom shall preserve typed trace links from business outcomes and operating workflows to requirements, user journeys, design artifacts, architecture decisions, work items, and evidence. | Launch |
| FR-DISC-004 | Axiom shall identify business outcomes or critical workflows that are unsupported, contradictory, unmeasurable, or not covered by the proposed product experience. | Launch |
| FR-DISC-005 | Axiom shall model applicable customer segments, jobs-to-be-done, pains, gains, value propositions, stakeholder decision rights, and adoption or change impacts as structured, versioned business-context entities rather than ungoverned prose. | Launch |
| FR-DISC-006 | Axiom shall model applicable revenue or funding assumptions, pricing, cost drivers, unit-economics measures, market conditions, and competitor or alternative-solution assumptions; unsupported values shall remain `AI_SUGGESTED` or `UNKNOWN`. | Launch |
| FR-DISC-007 | Business discovery shall use bounded project-type and industry profiles so irrelevant questions are explicitly not applicable and "gather everything" cannot become an unbounded model prompt. | Launch |
| FR-DISC-008 | Every measurable business outcome shall identify an owner, metric definition, baseline or explicit unknown, target or explicit unknown, timeframe, and source or human-confirmation status before it can gate downstream scope. | Launch |
| FR-UX-001 | Where the approved scope includes a user experience, Axiom shall generate versioned information architecture, user journeys, editable wireframe sets, and interaction flows from the exact current graph. | Launch |
| FR-UX-002 | Each screen shall state its purpose, authorized actors, mapped requirements and outcomes, design hypotheses, interactions, data needs, permission boundaries, and applicable default, loading, queued, empty, partial-failure, failure, validation, cancellation, recovery, and success states. | Launch |
| FR-UX-003 | Generated screens, nodes, interactions, and examples shall carry stable IDs, truth status, source or graph links, generation provenance, and explicit unresolved gaps. | Launch |
| FR-UX-004 | The Experience Studio shall support dependable selection, multi-selection, text editing, grouping, ordering, alignment, duplication, copy/paste, undo/redo, keyboard operation, pan/zoom, reusable components, and bounded scene import/export. | Launch |
| FR-UX-005 | The Experience Studio shall support connected multi-screen prototype preview, explicit transitions, and review of alternate, permission, error, and recovery paths without treating simulated behavior as executed evidence. | Launch |
| FR-UX-006 | Axiom shall support project-controlled design tokens, reusable component definitions, responsive viewport variants, and accessible semantic annotations while keeping the canonical graph authoritative. | Launch |
| FR-UX-007 | Deterministic design-quality gates shall check schema validity, entity references, outcome and requirement coverage, critical-flow continuity, required-state coverage, interaction reachability, responsive completeness, accessibility metadata, prohibited claims, and unresolved blockers. | Launch |
| FR-UX-008 | An optional independent experience-review model may critique hierarchy, consistency, usability risks, and omissions but shall not override deterministic failures or approve a design. | Launch |
| FR-UX-009 | Design editing shall create bounded immutable revisions; review shall record accept, accept-with-edits, reject, categorized feedback, reviewer, time, exact content hash, and graph version. | Launch |
| FR-UX-010 | Approval shall create an immutable Experience Baseline, and material source, requirement, clarification, architecture, token, component, or interaction changes shall invalidate incompatible downstream approvals. | Launch |
| FR-UX-011 | A design edit that changes product behavior shall create an explicit proposed graph mutation and shall never silently redefine a requirement, policy, architecture decision, or source-grounded claim. | Launch |
| FR-UX-012 | Users shall export reviewed design artifacts and a versioned engineering handoff manifest without making an external design copy authoritative. | Launch |
| FR-UX-013 | Optional Figma publication or import shall use an approved connector with exact preview, explicit authorization, stable mapping, idempotency, and reconciliation. | Next |
| FR-UX-014 | Multi-user presence, threaded comments, and advanced brand or design-system administration may be added after the single-reviewer commercial gates are stable. | Next |

### 6.4 Work-item generation

| ID | Requirement | Priority |
|---|---|---:|
| FR-WORK-001 | Axiom shall generate a normalized hierarchy of initiative/epic, story, task, and defect work items as applicable. | Launch |
| FR-WORK-002 | Every implementable work item shall contain outcome, context, scope, out-of-scope, testable acceptance criteria, dependencies, risks, open questions, evidence expectations, and source links. | Launch |
| FR-WORK-003 | Work items shall use stable IDs independent of their presentation, export format, or execution adapter. | Launch |
| FR-WORK-004 | Axiom shall reject approval and delivery activation when required fields, grounding, or testability gates fail. | Launch |
| FR-WORK-005 | Axiom shall detect duplicate or materially overlapping work items before approval. | Launch |
| FR-WORK-006 | Axiom shall identify uncovered approved requirements and unjustified work items. | Launch |
| FR-WORK-007 | Work-item generation shall ask for clarification when a critical implementation decision is unknown. | Launch |
| FR-WORK-008 | Users shall review an exact, immutable generation and delivery-activation preview and explicitly approve it. | Launch |
| FR-WORK-009 | Regeneration shall create a new version and preserve previously approved versions, decisions, and lifecycle history. | Launch |
| FR-WORK-010 | Organization templates may add only allowlisted extension fields and stricter policies; they shall not add arbitrary issue types, lifecycle states or transitions, redefine canonical fields, or bypass core authorization and quality gates. | Next |

### 6.5 Work-item quality verification

| ID | Requirement | Priority |
|---|---|---:|
| FR-QUAL-001 | Deterministic validation shall check schema, required fields, valid entity IDs, grounding, length bounds, and prohibited claims. | Launch |
| FR-QUAL-002 | Coverage validation shall compare approved requirements against generated work items. | Launch |
| FR-QUAL-003 | Acceptance-criteria validation shall flag subjective or non-verifiable outcomes. | Launch |
| FR-QUAL-004 | A separate review stage may use a different approved model but shall not override deterministic failures. | Launch |
| FR-QUAL-005 | Human reviewers shall record accept, accept-with-edits, reject, and categorized reasons. | Launch |
| FR-QUAL-006 | Every prompt, schema, model, policy, and evaluator version shall be stored with the generation. | Launch |
| FR-QUAL-007 | Axiom shall maintain a versioned evaluation dataset containing representative good, bad, contradictory, incomplete, and adversarial examples. | Launch |
| FR-QUAL-008 | Model promotion shall require evaluation evidence against the current dataset. | Launch |

### 6.6 Architecture and artifacts

| ID | Requirement | Priority |
|---|---|---:|
| FR-ARC-001 | When architecture decisions are required, Axiom shall compare credible options with why, why-not, assumptions, risks, failure modes, cost range, and reconsideration triggers. | Launch |
| FR-ARC-002 | Architecture recommendations shall remain `AI_SUGGESTED` until an authorized user approves one. | Launch |
| FR-ARC-003 | Approval shall create a versioned ADR and invalidate incompatible downstream outputs. | Launch |
| FR-ARC-004 | Architecture and applicable workload-placement options shall be evaluated for mutual compatibility before either final approval; a blocked or changed placement decision shall block or stale incompatible architecture and downstream scope. | Launch |
| FR-DOC-001 | Axiom shall compile SRS, NFR, HLD, ADR, test strategy, API contract, delivery work-item plan, and task-packet views from the graph. | Launch |
| FR-DOC-002 | Generated artifacts shall include graph version, content hash, generation provenance, and truth status. | Launch |
| FR-DOC-003 | Axiom may publish documents to Notion or Confluence through optional connectors; those copies are not authoritative. | Next |
| FR-DOC-004 | Axiom shall compile business-context, user-journey, Experience Baseline, design-handoff, and experience-coverage views from canonical graph and design versions. | Launch |
| FR-PLAN-001 | Axiom shall generate a versioned Engineering Plan for product scope, UX/accessibility, architecture/technology, data, APIs/integrations, testing/quality, security/privacy, CI/CD, deployment/cloud infrastructure, reliability/observability, cost/FinOps, and operations/support. | Launch |
| FR-PLAN-002 | Every recommendation shall state recommended, conditional, not-recommended, or needs-decision; why; benefits; trade-offs; risks; alternatives and why-not-now; reconsideration triggers; implementation actions; verification expectations; source links; and controlled reference IDs. | Launch |
| FR-PLAN-003 | Technology, testing, security, deployment, and cloud guidance shall be bound to the exact approved requirement, applicable Experience Baseline or approved `NOT_APPLICABLE` decision, compatible architecture, and workload-placement versions and remain `AI_SUGGESTED` until human review. | Launch |
| FR-PLAN-004 | Axiom shall not claim certification, compliance, test success, security findings, performance, availability, or cost measurements without immutable executed evidence. | Launch |
| FR-PLAN-005 | Axiom shall expose unknowns and next decision gates when evidence is insufficient and shall preserve earlier plans as immutable history after regeneration. | Launch |
| FR-PLAN-006 | Engineering guidance shall use a versioned application-controlled catalog of assessed primary standards and vendor references; model-generated URLs shall not be trusted as references. | Launch |

### 6.7 Axiom-native Delivery Workspace

| ID | Requirement | Priority |
|---|---|---:|
| FR-DLV-001 | Axiom shall manage governed software-delivery work items linked to canonical outcomes, requirements, and decisions in an organization-scoped native Delivery Workspace backed by canonical `WorkItem` and `WorkItemVersion` graph entities; only compatible approved versions may be activated, and Jira, Trello, or another external work-management provider shall not be required. | Launch |
| FR-DLV-002 | Work-item content review state, delivery state, and truth/evidence status shall be separate centrally governed state machines; each state-and-transition policy shall be versioned and testable, and changing delivery state shall not imply approval, verification, or completion evidence. | Launch |
| FR-DLV-003 | Every work-item transition shall enforce authorization, the exact current item version, allowed predecessor states, dependency and approval preconditions, optimistic concurrency, actor, time, reason, and audit; retries shall be idempotent. | Launch |
| FR-DLV-004 | An approved ready work item may remain visibly unassigned, but entry into `IN_PROGRESS` or any execution state shall require exactly one accountable authorized human owner; Axiom may separately record an assigned contributor, team, or coding-agent execution run without treating an agent as the accountable owner or approver. | Launch |
| FR-DLV-005 | Axiom shall model typed dependencies and blockers between stable work-item IDs, detect cycles and stale links, derive blocked state honestly, and prevent execution or completion when a mandatory predecessor remains unresolved. | Launch |
| FR-DLV-006 | The Delivery Workspace shall provide accessible list, detail, search, filter, grouping, and bounded status-lane views with a non-board alternative; status and priority shall not be communicated by color alone. | Launch |
| FR-DLV-007 | Users shall be able to create governed defects, change items, and follow-up tasks from immutable verification evidence or an immutable versioned human report recorded as `HUMAN_CONFIRMED`; AI-added claims shall remain `AI_SUGGESTED` or `UNKNOWN`, and every item shall record origin, rationale, author or tool, trace links, and truth status and pass the same applicable authorization, traceability, grounding, and testability gates as generated work. | Launch |
| FR-DLV-008 | Material edits to an approved work item shall create a new immutable version, re-run compatibility and quality checks, invalidate incompatible execution or verification approvals, and preserve the complete prior history. | Launch |
| FR-DLV-009 | A work item may enter completion only when its applicable acceptance criteria and required verification expectations have linked evidence or an authorized human records an explicit exception with rationale, scope, risk, and audit; an agent claim alone shall never complete work. | Launch |
| FR-DLV-010 | Axiom shall expose immutable activity history for generation, review, edits, assignment, transitions, blockers, execution, verification, exceptions, and cancellation; comments or discussion shall not silently mutate canonical work-item content. | Launch |
| FR-DLV-011 | Project progress summaries shall be derived from current canonical work-item and evidence state, expose blocked, unknown, failed, cancelled, and partially verified work, and shall not show model-invented percentages or completion claims. | Launch |
| FR-DLV-012 | Authorized users shall be able to export native work items, versions, dependencies, lifecycle events, evidence links, and audit references in a documented portable format with a manifest and hashes. | Launch |
| FR-DLV-013 | Launch scope shall remain a governed engineering-delivery workspace, not a general-purpose project-management suite; arbitrary issue schemas and workflows, sprint capacity and burndown, time tracking, portfolio planning, team chat/wiki, and marketplace-style automation are outside launch scope. | Launch |
| FR-DLV-014 | Any future external work-management interoperability shall require a later SRS decision and shall remain optional, bounded, explicitly approved, and subordinate to Axiom's canonical native work-item state. | Later |

### 6.8 Axiom Agent Kernel and model catalog

| ID | Requirement | Priority |
|---|---|---:|
| FR-AI-001 | Logical agents shall be versioned workflows sharing one Agent Kernel, not separate autonomous services by default. | Launch |
| FR-AI-002 | The kernel shall provide context assembly, policy enforcement, model routing, tool permissions, structured validation, budget checks, tracing, and evidence writing. | Launch |
| FR-AI-003 | Model-provider SDKs shall remain behind provider-neutral interfaces. | Launch |
| FR-AI-004 | Launch providers shall include Groq and OpenAI after each configured model passes the current evaluation suite. | Launch |
| FR-AI-005 | The catalog shall record provider, immutable model ID, lifecycle status, capabilities, price metadata, context limits, data policy, allowed regions, and evaluation scores. | Launch |
| FR-AI-006 | End users shall choose Economy, Balanced, or Best; raw model selection shall be an administrator capability. | Launch |
| FR-AI-007 | Routing shall consider task type, evaluation score, sensitivity, tenant policy, latency, and remaining budget. | Launch |
| FR-AI-008 | Low-cost models shall be tried first only where evaluations show they meet the task threshold. | Launch |
| FR-AI-009 | Expensive fallback shall be bounded, auditable, and disabled when a budget cap is reached. | Launch |
| FR-AI-010 | Preview or deprecated models shall not be enabled for production tenants without an explicit policy and replacement plan. | Launch |
| FR-AI-011 | Customer-provided model keys shall be supported for eligible plans through encrypted secret storage. | Next |
| FR-AI-012 | Additional providers such as AWS Bedrock, Google, Anthropic, Azure OpenAI, or compatible private endpoints shall use the same qualification process. | Next |
| FR-AI-013 | Axiom shall not require owned GPUs or a self-hosted foundation model for launch. | Launch |
| FR-AI-014 | Axiom shall default to one logical-agent workflow and shall introduce multiple agents only when a task-specific evaluation demonstrates a justified quality, context-isolation, or latency benefit relative to the simpler baseline. | Launch |
| FR-AI-015 | Multi-agent workflows shall exchange minimum-necessary typed context and schema-validated outputs through the application-owned Agent Kernel; agents shall not use unrestricted shared transcripts as canonical state. | Launch |
| FR-AI-016 | Each multi-agent workflow shall define maximum model calls, revision rounds, wall-clock duration, concurrency, output size, budget, and repeated-outcome stall behavior independently from transient provider retries. | Launch |
| FR-AI-017 | Axiom shall detect material disagreements, preserve every substantive position and its provenance, and prevent a supervisor or synthesis model from silently converting disagreement into consensus. | Launch |
| FR-AI-018 | For every material disagreement, Axiom shall present an exact human-review packet with alternatives ranked `RECOMMENDED`, `VIABLE`, `CONDITIONAL`, and `NOT_PREFERRED` as applicable, including why, why-not-now, benefits, trade-offs, risks, assumptions, evidence, unknowns, and reconsideration triggers. | Launch |
| FR-AI-019 | An authorized reviewer shall be able to accept the recommendation, select another option, edit or combine options, request more evidence, defer, or reject all options; edits and combinations shall be revalidated before confirmation. | Launch |
| FR-AI-020 | Unresolved material disagreement shall block affected downstream work, and resolution shall record the exact alternatives, ranking, recommendation, dissent, human choice and rationale, actor, time, hashes, graph version, affected entities, invalidations, and audit event. | Launch |

### 6.9 Coding-agent adapters and controlled execution

| ID | Requirement | Priority |
|---|---|---:|
| FR-AGENT-001 | Axiom shall define an adapter contract for native execution, Codex, GitHub Copilot, Devin, and export-only handoff. | Next |
| FR-AGENT-002 | External agents shall use customer-owned accounts or separately priced entitlements by default. | Next |
| FR-AGENT-003 | Task packets shall contain only approved scope, constraints, acceptance criteria, trace links, and verification expectations. | Launch |
| FR-AGENT-004 | Repository writes shall require explicit repository authorization and path boundaries. | Next |
| FR-AGENT-005 | External-agent output shall remain unverified until approved commands produce evidence. | Launch |
| FR-AGENT-006 | Axiom shall not expose provider secrets or unrelated organization context to an agent. | Launch |
| FR-CODE-001 | Axiom shall maintain versioned organization, project, and repository Coding Profiles covering approved language, runtime, framework and package-manager versions; repository and module layout; component boundaries; naming, imports, formatting and linting; API, validation and error conventions; persistence and migration rules; security, tenant, secret and logging policy; dependencies and licenses; testing and evidence; component documentation; branch and release policy; generated-file paths; and forbidden patterns. | Next |
| FR-CODE-002 | Coding-profile inheritance and conflicts shall be resolved deterministically; an AI may suggest a rule change, but only an authorized human may approve the effective profile. | Next |
| FR-CODE-003 | Every coding task shall bind the exact approved work-item versions, architecture decision, coding-profile version, base repository revision, allowed paths, and verification commands. | Next |
| FR-CODE-004 | Native or external code generation shall first produce a staged reviewable patch or change set and shall not create a branch, commit, push, pull request, or protected-branch write before exact diff and evidence approval. | Next |
| FR-CODE-005 | Generated code, commits, pull requests, review comments, and verification evidence shall retain typed trace links to the originating decisions and work items. | Next |
| FR-CODE-006 | Before generation, Axiom shall safely inspect the exact authorized repository revision for existing conventions without reading excluded files, credentials, or secrets. | Next |
| FR-CODE-007 | Existing approved repository conventions shall take precedence over generic model preferences unless they conflict with an approved requirement, architecture decision, organization policy, or security control. | Next |
| FR-CODE-008 | Every material unknown or policy conflict shall create a bounded Coding Profile Decision with ranked options, a project-specific recommendation, rationale, benefits, trade-offs, risks, migration impact, reversibility, and why lower-ranked options are less suitable now. | Next |
| FR-CODE-009 | Authorized users shall be able to accept the recommendation, choose another option, edit it, request more evidence, or defer it; Axiom shall record the choice and rationale and block affected generation while a material decision is unresolved. | Next |
| FR-CODE-010 | Axiom shall maintain an application-controlled, versioned engineering-practice catalog based on assessed primary standards, installed framework guidance, and approved repository policy; a model shall not invent or silently upgrade a "best practice." | Next |
| FR-CODE-011 | The effective Coding Profile shall resolve ordinary applicable rules in this precedence order: approved product and architecture constraints, organization policy, project policy, repository convention, then assessed practice-catalog recommendation. | Next |
| FR-CODE-012 | A versioned questionnaire profile shall ask only applicable unresolved choices, provide the best current suggestion first, explain lower-ranked choices, and not repeat a compatible approved answer. | Next |
| FR-CODE-013 | A material Coding Profile change shall create a new version, identify affected components, make incompatible generation plans stale, and require revalidation. | Next |
| FR-CODE-014 | Before execution, Axiom shall show an immutable Code Generation Plan with exact input versions; selected native or external adapter, installation or account, execution location, granted tools, and model-routing policy; call, time and resource limits; intended files and components; permitted paths; dependencies, migrations, infrastructure changes, tests, component documentation, commands, cost bounds, risks, and expected side effects. | Next |
| FR-CODE-015 | Code generation shall occur in an isolated staging workspace and produce an atomic reviewable change set; failure shall not leave a partially promoted repository state. | Next |
| FR-CODE-016 | Dependency additions, license exceptions, destructive migrations, public API breaks, authorization changes, and infrastructure mutations shall require separately visible human approval. | Next |
| FR-CODE-017 | Before branch creation or repository application, Axiom shall verify that the authorized target ref still matches the approved base revision; drift shall invalidate approval, and automatic rebase or merge shall require a revalidated plan and new exact approval. | Next |
| FR-CODE-018 | Axiom shall compare the produced change set with the approved Code Generation Plan; unexpected files, paths, dependencies, migrations, public APIs, permissions, or infrastructure changes shall enter `PLAN_AMENDMENT_REQUIRED` and shall not proceed without a revised plan and new approval. | Next |
| FR-CODE-019 | The generation workspace shall enforce canonical-path and symlink containment, allowlisted writes, deny-by-default network egress, ephemeral minimum-necessary secrets, CPU, memory and process limits, timeout, cancellation, bounded output, and verified workspace destruction. | Next |
| FR-CODE-020 | A scoped exception may override only a Coding Profile rule explicitly marked waivable and only after authorized risk acceptance with rationale, expiry, compensating control, and remediation work; it shall never override non-waivable product, architecture, tenant-isolation, security, or data-protection constraints. | Next |
| FR-CODE-021 | Before promotion, every staged change shall run the compatible Coding Profile's formatting and linting, type or schema validation, build or compile check, dependency and license policy, secret scan, and smallest relevant regression set; a failed non-waivable check shall block promotion. | Next |
| FR-COMP-001 | Every generated or materially modified governed component shall have a stable `ComponentId`, a versioned Component Contract, and complete file-ownership mapping. A governed component is the smallest independently reviewable UI, API, domain, worker, data, integration, or infrastructure unit; generated support files shall map to an owner and shall not be orphaned. | Next |
| FR-COMP-002 | A Component Contract shall identify purpose, responsibilities, non-responsibilities, originating requirements and work items, public interfaces, inputs and outputs, dependencies, data ownership, authorization boundary, invariants, failure and recovery behavior, security and privacy obligations, required tests, operational signals, known limitations, unknowns, and modification constraints. | Next |
| FR-COMP-003 | Every governed component shall have a concise companion Markdown projection with schema-validated front matter containing stable component ID, contract and schema versions, source graph version, base repository revision, `CodeChangeSetId`, owned paths and component-content hashes, and trace links; the resulting repository revision shall be recorded in PostgreSQL only after the repository write succeeds. | Next |
| FR-COMP-004 | The Coding Profile shall select one consistent repository convention, such as adjacent `ComponentName.axiom.md` files or `.axiom/components/<component-id>.md`, and shall bound length and allowed sections; the Markdown shall describe purpose and boundaries, interfaces and dependencies, data and permissions, invariants, failure and recovery, required test obligations and operational signals, limitations, and safe-change guidance. | Next |
| FR-COMP-005 | Code and its Markdown projection shall be committed together in one repository change set; component deletion shall remove the active projection while preserving the canonical historical contract and audit. | Next |
| FR-COMP-006 | Deterministic validation shall reject missing contracts, orphan files, duplicate ownership, invalid trace links, forbidden content, or a Markdown projection stale against the proposed component version. | Next |
| FR-COMP-007 | Every later agent shall assemble the minimum-necessary affected slice of the exact approved graph, Coding Profile, Component Contracts, current repository files, and applicable evidence; it shall not load unrelated tenant context or rely on Markdown or prior agent transcripts alone. | Next |
| FR-COMP-008 | A human Markdown edit that changes behavior or constraints shall create a proposed Component Contract or graph mutation and shall not silently redefine canonical truth. | Next |
| FR-COMP-009 | Component documentation shall not contain secrets, hidden prompts, private model reasoning, copied source code, fabricated behavior, or mutable current test status; test outcomes shall remain in Axiom's evidence surface, and only immutable revision- and time-bound evidence references may be linked. | Next |
| FR-COMP-010 | A proposed Component Contract shall be persisted before the repository effect; after code and Markdown are committed together, Axiom shall record the resulting provider revision and activate the contract only after reconciliation. Failure shall leave it `PROPOSED` or `RECONCILIATION_REQUIRED`, never silently current. | Next |
| FR-COMP-011 | Reconciliation shall prove that the resulting repository tree and component-content digests exactly match the approved and tested `CodeChangeSet`; any difference caused by hooks, normalization, provider behavior, merge, or another write shall set `RECONCILIATION_REQUIRED`, keep contracts proposed, invalidate affected evidence, and require revalidation. | Next |
| FR-COMP-012 | A changed or deleted interface, invariant, data contract, permission boundary, dependency, or failure behavior shall propagate impact to dependent Component Contracts, Coding and Test Strategies, approvals, evidence applicability, and release candidates; incompatible dependents shall become stale and block promotion until resolved. | Next |
| FR-COMP-013 | The Markdown front matter and body shall be deterministically compiled from the exact structured Component Contract using recorded compiler and schema versions and a projection hash; a human edit shall create a contract-change proposal and regenerated projection, and independently authored Markdown shall never become current. | Next |
| FR-GH-001 | GitHub connectivity shall use a GitHub App or approved enterprise OAuth installation with least-privilege repository selection; personal access tokens are not the commercial default. | Next |
| FR-GH-002 | Before creating a branch, commit, pull request, review, or check, Axiom shall show the exact side-effect preview and require explicit approval. | Next |
| FR-GH-003 | GitHub writes shall be idempotent, auditable, branch-policy aware, and reconciled using recorded provider IDs and authenticated deduplicated webhooks. | Next |
| FR-SEC-001 | Axiom shall maintain a versioned secure-engineering rule catalog that can map applicable requirements to OWASP ASVS 5.0.0, OWASP API Security Top 10 2023, OWASP AISVS 1.0, and NIST SSDF 1.1. | Launch |
| FR-SEC-002 | Axiom shall explain rule applicability, implementation guidance, verification method, exceptions, and missing evidence; catalog mappings shall never be presented as certification or compliance proof. | Launch |

### 6.10 Customer-project testing, verification, traceability, and explanation

| ID | Requirement | Priority |
|---|---|---:|
| FR-TEST-001 | Axiom shall create a versioned Test Strategy bound to the exact approved graph, work items, Coding Profile, component versions, repository revision, and proposed change set. | Next |
| FR-TEST-002 | The strategy shall map requirements, risks, acceptance criteria, and components to UI, functional, API, database, security, authorized penetration, and performance testing. | Next |
| FR-TEST-003 | Every testing family shall have an explicit `REQUIRED`, `CONDITIONAL`, `NOT_APPLICABLE`, or `BLOCKED` disposition with rationale, owner, environment, data needs, approved command or tool, success threshold, and required evidence; `CONDITIONAL` shall define an evaluated activation condition, `BLOCKED` shall block affected promotion when mandatory, and `NOT_APPLICABLE` for a material risk shall require human approval. | Next |
| FR-TEST-004 | UI testing shall cover applicable component behavior, asynchronous and failure states, interactions, keyboard and accessibility behavior, responsive variants, supported browsers, and visual regressions; visual-baseline changes shall require explicit review. | Next |
| FR-TEST-005 | Functional testing shall cover applicable domain rules through unit, integration, system, and end-to-end scenarios, including positive, negative, boundary, permission, failure, retry, cancellation, and recovery paths. | Next |
| FR-TEST-006 | API testing shall cover applicable OpenAPI and contract conformance, schema validation, authentication, authorization, tenant isolation, positive and negative cases, idempotency, concurrency, pagination, rate limits, compatibility, and safe error behavior. | Next |
| FR-TEST-007 | Database testing shall cover applicable forward migration and rollback or forward recovery, constraints, transactions, concurrency and locking, organization isolation, data lifecycle, compatibility, and backup and restore behavior using production-like volume where required. | Next |
| FR-TEST-008 | Security testing shall cover applicable static analysis, dependency and license analysis, secret scanning, container and infrastructure analysis, dynamic checks, authorization controls, input abuse, and mapped threat and control tests; automated checks shall not be described as certification. | Next |
| FR-TEST-009 | Penetration testing shall require an active Rules of Engagement record with recorded target-owner authorization or authorized customer attestation, exact targets and exclusions, environment, time window, approved tools or provider, rate limits, data-handling rules, prohibited actions, revocation and emergency stop, contacts, and evidence-retention policy. | Next |
| FR-TEST-010 | Axiom shall revalidate authorization and scope at execution time and fail closed on redirects, discovered targets, scope expansion, revocation, or emergency stop; it shall not test production, third-party systems, or billable infrastructure without their additional explicit authorization, non-destructive non-production testing is the default, and absence of findings shall not be represented as proof of security. | Next |
| FR-TEST-011 | Performance testing shall define the exact build, environment, dataset, workload model, warm-up, concurrency, duration, thresholds, resource limits, cost cap, teardown, and repeatability criteria before execution; production load testing shall require separate authorization. | Next |
| FR-TEST-012 | Generated test code and expected results shall remain `AI_SUGGESTED`; immutable output from an approved runner or provider may create at most `TOOL_EXECUTED`, while `TOOL_VERIFIED` additionally requires a versioned deterministic parser and assertion against the exact revision and approved threshold. | Launch |
| FR-TEST-013 | Local and Axiom-controlled runner execution shall use repository-defined, reviewed, allowlisted commands; an agent shall not create or loosen an allowlist entry and execute it in the same approval step. | Launch |
| FR-TEST-014 | Test execution shall distinguish planned, blocked, not run, queued, running, passed, failed, cancelled, inconclusive, and quarantined states without changing truth-status semantics. | Next |
| FR-TEST-015 | Failures, timeouts, parser errors, missing environments, and unexecuted tests shall remain visible and shall not be converted into a pass by model summary. | Launch |
| FR-TEST-016 | Test data shall be bounded, organization-isolated, reproducible where practical, and free of production secrets or uncontrolled personal data. | Next |
| FR-TEST-017 | Policy shall identify non-waivable checks. A permitted waiver shall be scoped, time-bound, risk-accepted by an authorized human, audited, and record rationale, compensating control, and remediation work; it shall never change `FAILED`, `UNKNOWN`, `BLOCKED`, or unexecuted evidence into a pass. | Next |
| FR-TEST-018 | Impact analysis shall derive regression obligations from changed requirements, components, interfaces, data, permissions, infrastructure, and prior defects; mandatory checks shall not be silently omitted. | Next |
| FR-TEST-019 | External browser, security, penetration, and performance services shall execute only through approved adapters with an exact operation, target, scope, time, budget, data-handling, cancellation, and provider-result contract; they are not treated as repository shell commands. | Next |
| FR-TEST-020 | Security-test findings and raw evidence, including penetration, SAST, DAST, secret, dependency, container, IaC, database, and authorization output, shall use restricted role-based access, encryption, redaction, controlled export, retention, and audited deletion appropriate to their sensitivity. | Next |
| FR-TEST-021 | A Test Strategy shall transition through `PROPOSED`, `APPROVED`, `STALE`, and `HISTORICAL` under centralized policy; every execution shall bind its exact approved version and hash, and material changes to tools, adapters, thresholds, dispositions, targets, data, components, or repository revision shall invalidate execution authorization and applicable prior evidence. | Next |
| FR-VER-001 | Verification commands shall be repository-defined and allowlisted; the model shall not choose arbitrary commands. | Launch |
| FR-VER-002 | Runs shall enforce workspace boundaries, timeouts, concurrency limits, secret stripping, and bounded output. | Launch |
| FR-VER-003 | Evidence shall record command or provider operation, exact target and revision, start time, duration, exit status, parsed metrics, immutable raw-output reference, assertion and parser versions and results, and linked entities. | Launch |
| FR-VER-004 | Failed and unexecuted checks shall remain `FAILED` or `UNKNOWN`; a waiver or model summary shall not alter the measured truth status. | Launch |
| FR-TRACE-001 | Typed trace links shall connect sources, requirements, gaps, answers, decisions, work-item versions, assignments, lifecycle events, code, component contracts, tests, deployments, runtime observations, and evidence. | Launch |
| FR-TRACE-002 | Why, Why Not, Proof, and Reconsider answers shall cite graph entities and shall distinguish suggestion from evidence. | Launch |
| FR-TRACE-003 | Traceability shall have accessible non-graph presentation. | Launch |

### 6.11 Customer workload placement and cloud decision

| ID | Requirement | Priority |
|---|---|---:|
| FR-CLOUD-001 | Axiom shall represent its own platform-hosting profile separately from each customer project's workload-placement decision; Axiom's AWS architecture shall not become an implicit customer recommendation. | Launch |
| FR-CLOUD-002 | Before recommending a target, Axiom shall gather or mark unknown the approved constraints for data residency, security and compliance, latency, availability, RTO and RPO, scaling, data gravity, integrations, existing contracts, team skills, operating model, portability, budget, and sustainability. | Launch |
| FR-CLOUD-003 | Axiom shall compare credible options including an approved existing provider, another public cloud, private cloud or on-premises, hybrid, SaaS or managed service, and no migration where applicable; an irrelevant option may be excluded only with recorded rationale. | Launch |
| FR-CLOUD-004 | A customer-mandated provider shall be recorded as an approved constraint, not misrepresented as Axiom's independently selected recommendation; Axiom shall still expose residual risks and viable choices within that constraint. | Launch |
| FR-CLOUD-005 | Multi-cloud shall not be recommended by default; it requires an evidenced availability, residency, acquisition, exit, or concentration-risk need that justifies its additional cost and operational complexity. | Launch |
| FR-CLOUD-006 | Every provider or service claim shall reference an application-controlled source record containing authoritative source URI or document ID, provider and service identity, published or effective version where available, immutable snapshot or content hash, field-level region and workload applicability, observed-at time, expires or revalidate-at policy, and relevant limits; deterministic freshness validation shall make stale pricing, quota, region, or lifecycle facts `UNKNOWN` or a reconsideration trigger. | Launch |
| FR-CLOUD-007 | Cost outputs shall distinguish estimates from measured cost and state workload assumptions, unit prices, currency, discounts or commitments, shared costs, support, egress, labor, uncertainty range, and estimate date. | Launch |
| FR-CLOUD-008 | Every placement option shall address data export, dependency portability, identity, observability, backup and restore, disaster recovery, egress, contractual exit, and reconsideration triggers without claiming "cloud agnostic" unless verified. | Launch |
| FR-CLOUD-009 | Approval shall create a versioned workload-placement decision bound to exact business, requirement, applicable Experience Baseline or approved `NOT_APPLICABLE` decision, architecture-option, source-record, and estimate versions; approval of the final architecture shall require compatibility, and a changed placement shall make incompatible architecture decisions, Engineering Plans, work items, Coding Profiles and Plans, Test Strategies, releases, and deployment artifacts stale. | Launch |
| FR-CLOUD-010 | A recommendation, plan, or generated infrastructure artifact shall not provision a resource, purchase a commitment, access an account, or deploy anything without a separate exact preview and explicit authorized approval. | Launch |
| FR-CLOUD-011 | Every project shall record workload-placement applicability as `APPLICABLE`, `NOT_APPLICABLE`, or `BLOCKED` with rationale, affected scope, reviewer, and evidence; `BLOCKED` shall prevent incompatible architecture approval, while `NOT_APPLICABLE` shall not cause Axiom to invent a deployment target. | Launch |
| FR-CLOUD-012 | Expiry of a critical region, service-lifecycle, availability, quota, residency, or compatibility fact shall deterministically stale or block the affected placement, architecture, and Deployment Baseline until refreshed; price or discount expiry shall stale the affected estimate and cost approval according to policy. | Launch |

### 6.12 Controlled deployment and runtime monitoring

| ID | Requirement | Priority |
|---|---|---:|
| FR-DEPLOY-001 | A deployable Release Candidate shall bind immutable source revision, build and run IDs, artifact digests and provenance, SBOM reference, infrastructure, configuration and migration versions, exact approved Workload Placement and Architecture Decisions, Engineering Plan, Deployment Target and Baseline, WorkItem versions, Test Strategy, prerequisite verification-evidence versions and hashes, and applicable requirements. | Next |
| FR-DEPLOY-002 | Before every environment mutation, Axiom shall show an immutable preview of target account or project, environment, region, artifact digests, infrastructure and configuration diff, migrations, expected replacements or deletions, permissions, estimated cost change, blast radius, downtime, verification profile, and rollback or forward-recovery plan; secret values shall be redacted and only approved secret references or non-reversible hashes shown. | Next |
| FR-DEPLOY-003 | Approval shall be environment- and Release-Candidate-specific, time-bound, and consumable exactly once into one immutable `DeploymentRun` and idempotency lineage; retries and provider reconciliation may continue only that run, while a second run, changed key, changed previewed input, expired authorization, or changed risk policy shall fail closed and require new approval. Approval shall never be inferred from a lower environment or earlier release, and production approval requires an authorized production role. | Next |
| FR-DEPLOY-004 | Execution shall use the exact authorized Deployment Target and an approved CI/CD or deployment adapter with least-privilege short-lived credentials and allowlisted operations; server-side validation shall recheck organization and project binding, provider account or tenant identity, installation scopes, environment, region, and authorization before preview and execution, and models shall never receive unrestricted cloud credentials. | Next |
| FR-DEPLOY-005 | Approval consumption and Deployment Run creation shall be atomic; deployment requests shall be idempotent, concurrency-controlled, auditable, cancellation-aware, and reconciled against the same recorded idempotency lineage, provider run, and resource identifiers. | Next |
| FR-DEPLOY-006 | Deployment execution and deployment verification shall be separate state machines. Execution shall expose awaiting approval, queued, running, succeeded, partial failure, failed, cancelling, cancelled, rolling back, rolled back, rollback failed, reconciliation required, and unknown; verification shall independently expose not started, pending, running, observing, passed, failed, blocked, inconclusive, cancelled, and unknown. A deployed workload may therefore remain deployed while verification is failed or inconclusive. | Next |
| FR-DEPLOY-007 | Promotion shall follow the approved environment sequence and configured gates; a skipped environment or overridden failed gate requires an explicit, reasoned, audited exception from an authorized actor. | Next |
| FR-DEPLOY-008 | Database changes shall classify backward compatibility, lock and runtime risk, backup prerequisite, point of no return, rollback feasibility, and forward-recovery procedure; Axiom shall not promise rollback where safe reversal is impossible. | Next |
| FR-DEPLOY-009 | Provider success shall affect only deployment execution and shall not produce `TOOL_VERIFIED`; verification shall become passed only when every applicable deterministic assertion in the approved Deployment Verification Profile passes, while any failed, blocked, inconclusive, cancelled, or unknown result remains explicit without rewriting the execution outcome. | Next |
| FR-DEPLOY-010 | Rollback criteria shall be defined before production execution using measurable health or SLO thresholds, time windows, decision authority, last-known-good artifact and configuration, data compatibility, and verification steps. | Next |
| FR-DEPLOY-011 | Automatic rollback may occur only when a pre-approved deterministic trigger fires and a current safety predicate proves the exact target, last-known-good artifact and configuration, schema and data compatibility, unpassed point of no return, required backup, approved time window, and remaining attempt limit; otherwise Axiom shall pause, preserve evidence, and request forward recovery or another authorized decision. | Next |
| FR-DEPLOY-012 | Every deployment and rollback shall preserve request and provider IDs, actors, approvals, timestamps, exact targets, artifact and configuration digests, step outcomes, raw-output references, runtime observations, and final reconciliation state. | Next |
| FR-DEPLOY-013 | Deployment and feature release shall be modeled separately where feature flags are used; every flag shall have owner, purpose, default and failure behavior, target scope, approval policy, expiry, and removal work item. | Next |
| FR-DEPLOY-014 | A versioned Deployment Target shall bind provider account or tenant identity, environment, region, organization and project ownership, approved integration installation and scopes, target policy, and verification time; a compatible target and placement decision may create a separate Deployment Baseline, but a placement decision alone shall not. | Next |
| FR-DEPLOY-015 | Each release shall have a versioned Deployment Verification Profile whose smoke, health, migration, security, and SLO-observation checks each have `REQUIRED`, `CONDITIONAL`, `NOT_APPLICABLE`, or `BLOCKED` disposition with rationale, deterministic assertion or governed finding threshold, observation window, owner, and evidence requirement; `CONDITIONAL` shall have a deterministically evaluated activation condition, policy shall identify non-waivable checks, material-risk `NOT_APPLICABLE` shall require authorized risk acceptance and audit, a mandatory `BLOCKED` check shall prevent verified promotion, and `TOOL_VERIFIED` applies to each satisfied assertion rather than the deployment as a whole by fiat. | Next |
| FR-DEPLOY-016 | At preview, approval consumption, and execution start, Axiom shall atomically revalidate the exact version and hash of every Release Candidate input and all compatibility and freshness gates; any mismatch shall make the candidate stale and block mutation. | Next |
| FR-DEPLOY-017 | Before persistence, deployment plans and provider output shall be classified and sanitized; retained sensitive payloads shall use encrypted restricted storage with retention and audited deletion, while the immutable evidence record stores the sanitized content hash and controlled raw reference without exposing secret values or customer data to models or exports. | Next |
| FR-OBS-001 | Every Engineering Plan shall record observability as `APPLICABLE`, `NOT_APPLICABLE`, or `BLOCKED` with rationale; applicable scope shall contain a versioned Observability Plan covering service and dependency inventory, health signals, SLIs, SLOs, alert rules, ownership, escalation, runbooks, retention, access, cost, and verification expectations, while blocked scope shall prevent an unsupported operational-readiness claim. | Launch |
| FR-OBS-002 | Observability guidance shall use provider-neutral signal contracts based on OpenTelemetry and W3C Trace Context where applicable; provider backends shall remain replaceable adapters, and Axiom's CloudWatch use shall not become an implicit customer default. | Launch |
| FR-OBS-003 | Plans shall cover applicable request, queue and job, database, integration, deployment, infrastructure, security, model and agent, data-integrity, and business-outcome signals, including success, latency, error, saturation or backlog, freshness, and cost. | Launch |
| FR-OBS-004 | Every production release shall be identifiable in telemetry by immutable release, artifact, and configuration identifiers, environment, service, and deployment run so pre- and post-release behavior can be compared. | Next |
| FR-OBS-005 | Telemetry design shall define data classification, tenant isolation, redaction, secret and PII prohibition, cardinality bounds, sampling, retention, regional constraints, access, and deletion behavior before collection begins. | Launch |
| FR-OBS-006 | An SLO shall identify its service, SLI or query, population, objective, window, exclusions, owner, error-budget policy, alert thresholds, and reconsideration conditions; a generated dashboard or alert definition is not evidence that monitoring works. | Launch |
| FR-OBS-007 | Alert and runbook readiness shall be verified through approved synthetic checks, test alerts, failure injection, or exercises as applicable, with actual outcomes retained. | Next |
| FR-OBS-008 | `RUNTIME_OBSERVED` shall require immutable received telemetry containing source or provider identity, query or detector version, time window, scope, release and environment, timestamps, and raw-data reference; missing, stale, sampled, or partial telemetry shall remain explicit. | Next |
| FR-OBS-009 | Absence of an alert shall never by itself prove availability, correctness, security, or successful deployment. | Launch |
| FR-OBS-010 | Axiom shall initially recommend customer monitoring and generate governed implementation work; it shall ingest customer runtime telemetry only through an explicitly installed, least-privilege integration with approved scopes, retention, residency, and cost policy. | Next |
| FR-OBS-011 | Runtime incidents and regressions shall link to affected releases, requirements, architecture decisions, deployment runs, observations, mitigations, rollback or recovery outcomes, and follow-up native work items without retroactively changing prior evidence. | Next |
| FR-OBS-012 | Monitoring analysis may recommend investigation, rollback, forward recovery, scaling, or configuration changes but shall not autonomously mutate a production environment unless the exact deterministic action and trigger were separately pre-approved. | Next |
| FR-OBS-013 | Creating or changing alert rules, dashboards, notification routes, webhooks, retention, sampling, or silences shall require an exact redacted preview, scoped approval, idempotency, provider IDs and results, reconciliation, and audit. A production disablement or silence requires additional time-bound approval and provider-side bounded duration where supported; otherwise Axiom shall schedule an idempotent re-enable, reconcile restoration, and escalate visibly on failure. Permanent disablement requires a separately approved replacement or decommission decision. | Next |
| FR-OBS-014 | Before monitoring preview and execution, server-side policy shall validate an exact versioned Monitoring Target binding of organization, project, environment, provider account or tenant, approved installation, short-lived write scopes, and allowlisted operations; monitoring credentials shall not enter model context. | Next |

### 6.13 Subscriptions, quotas, and cost governance

| ID | Requirement | Priority |
|---|---|---:|
| FR-BILL-001 | Axiom shall support plan, subscription, entitlement, credit balance, and billing-period records. | Launch |
| FR-BILL-002 | Commercial billing shall use product credits while internally retaining raw provider tokens, tool charges, currency, and effective cost. | Launch |
| FR-BILL-003 | Usage shall be attributed to organization, project, user, workflow, provider, model, and generation ID. | Launch |
| FR-BILL-004 | Axiom shall enforce request, daily, monthly, and organization hard limits before starting work. | Launch |
| FR-BILL-005 | Long-running workflows shall reserve an estimated budget and reconcile actual cost after completion or failure. | Launch |
| FR-BILL-006 | Retry, fallback, cached, failed, and cancelled usage shall remain visible in the ledger. | Launch |
| FR-BILL-007 | Approaching and exhausted limits shall produce alerts and actionable UI states. | Launch |
| FR-BILL-008 | No background agent loop may spend beyond its approved reservation. | Launch |
| FR-BILL-009 | Subscription webhooks shall be authenticated, idempotent, replay-safe, and auditable. | Launch |
| FR-BILL-010 | Chargeable coding-agent, test-provider, cloud, deployment, or telemetry work shall reserve and enforce an applicable project or environment budget before execution; a recommendation or SRS approval alone shall not authorize spend. | Next |

### 6.14 Audit, export, and deletion

| ID | Requirement | Priority |
|---|---|---:|
| FR-AUD-001 | Security-sensitive, approval, assignment, work-item lifecycle, exception, billing, model-policy, integration, deployment, and deletion events shall create immutable audit records. | Launch |
| FR-AUD-002 | Administrators shall search and export audit history subject to retention policy. | Launch |
| FR-EXP-001 | Projects shall export structured graph data, artifacts, work items, versions, transitions, dependencies, component contracts, deployment and runtime records, and evidence with a manifest and hashes. | Launch |
| FR-DEL-001 | Destructive deletion shall require confirmation, authorization, dependency checks, and an auditable retention workflow. | Launch |

## 7. AI quality and evaluation contract

### 7.1 Workflow design

All AI engineering workflows shall use bounded stages rather than an unconstrained agent conversation. Work-item generation is one downstream workflow, not the product boundary:

```text
Context selection
  -> business-outcome, actor, and operating-workflow analysis
  -> requirement/gap analysis
  -> clarification gate
  -> user-journey and Experience Baseline generation or explicit not-applicable decision
  -> compatible architecture and workload-placement comparison
  -> full-lifecycle engineering and observability guidance
  -> human decision/approval gates
  -> normalized work-item generation and delivery planning
  -> deterministic validation
  -> semantic review when required
  -> human approval
  -> native work-item activation and governed delivery
  -> approved code-generation and test planning when enabled
  -> controlled deployment and runtime feedback when enabled
```

The application, not the model, owns IDs, work-item lifecycle and assignment, truth transitions, authorization, budgets, approval state, external integration and environment side effects, evidence metrics, and retry limits.

Multi-agent execution is an evaluated pattern inside these bounded workflows, not the default product architecture. The Agent Kernel shall use application-controlled sequential, conditional, parallel fan-out/fan-in, and evaluator-revision stages as required. A model may recommend a route or synthesize specialist output only inside an allowlisted workflow graph; deterministic policy selects the permitted next states and enforces exit conditions.

When specialist outputs materially disagree, the workflow shall enter the human-decision journey in Section 5.5. A synthesis stage may rank alternatives and recommend the best current path, but it shall retain dissent and cite the exact evidence boundary. No affected downstream stage may proceed on model-created consensus alone.

### 7.2 Launch evaluation set

The evaluation set shall include:

- representative SME and enterprise briefs;
- short and long source collections;
- missing critical decisions;
- contradictions and duplicate statements;
- prompt injection inside source documents;
- vague acceptance criteria;
- cross-work-item dependencies and blocker cycles;
- invalid, unauthorized, stale, concurrent, retried, and bulk work-item transitions;
- completion attempts without required evidence and explicit exception handling;
- malformed and incomplete model responses;
- known good and known bad work items reviewed by humans;
- technology-stack fit and anti-pattern cases;
- test-strategy completeness and unverifiable quality claims;
- security/privacy threat, control, and false-certification cases;
- deployment, cloud, reliability, observability, cost, and operational-readiness cases;
- full-lifecycle plans with missing domains, invalid references, weak why-not analysis, or unsupported recommendations;
- business-discovery cases with unsupported personas, outcomes, metrics, or process assumptions;
- user journeys with dead ends, missing permission paths, contradictory interactions, and uncovered approved outcomes;
- wireframe sets with missing loading, empty, partial-failure, failure, validation, cancellation, recovery, or responsive states where applicable;
- design edits that attempt to silently redefine approved requirements, policies, or source-grounded claims;
- accessible editor, keyboard-operation, prototype-transition, revision, and stale-Experience-Baseline cases.
- multi-agent cases where specialists agree, materially disagree, produce incomparable options, omit dissent, or attempt to override deterministic validation;
- disagreement packets with incorrect rankings, unsupported recommendations, missing why-not-now analysis, weak alternatives, human selection of a lower-ranked option, requests for more evidence, edited or combined options, deferral, rejection of all options, repeated-result stalls, and stale downstream approvals.
- conflicting repository conventions, stale Coding Profiles, malicious repository instructions, path traversal or symlink attempts, unauthorized dependencies, and unapproved migration, public-API, authorization, or infrastructure changes;
- missing, duplicate, orphaned, stale, contradictory, or fabricated Component Contracts and Markdown projections;
- repository trees that differ from approved and tested change-set digests, contracts activated before reconciliation, incompatible dependent components left current, and independently edited Markdown presented as a current projection;
- code execution through a different adapter, installation, account, tool set, model policy, or resource limit than the approved Code Generation Plan;
- unjustified testing-family `NOT_APPLICABLE` decisions, fabricated passes, tenant-isolation failures, migration rollback failures, unauthorized penetration scope, manipulated security output, and performance evidence from the wrong build or environment;
- stale or unapproved Test Strategies, bypassed non-waivable failures, and sensitive security evidence exposed outside its approved access, export, or retention policy;
- cases where Axiom runs on AWS but the evidence supports Azure, Google Cloud, on-premises, a managed service, or no migration for the customer workload;
- customer-mandated providers, unjustified multi-cloud, stale region, quota, price or lifecycle facts, and placement options that omit exit or operational costs;
- critical cloud-reference expiry after placement approval, Release Candidates missing exact upstream hashes, stale deployment previews, one approval consumed by multiple runs, provider success with failed or inconclusive verification, irreversible data migrations, partial deployment, cancellation, rollback failure, reconciliation, and provider timeout paths;
- missing, stale, sampled, cross-tenant, incorrectly redacted, or release-uncorrelated telemetry, and dashboards whose alert delivery or runbooks were never tested.
- monitoring writes against the wrong provider tenant or environment, expired write scopes, unapproved alert silences, and sensitive deployment output retained or exported without sanitization.

Production customer content shall not enter a shared evaluation set without a lawful basis, explicit policy, de-identification, and access controls.

### 7.3 Product and capability quality gates

These are release targets, not claims about the current prototype. Launch capabilities shall meet their applicable rows before commercial acceptance; a `Next` or `Later` capability shall meet its applicable rows before that capability is enabled for customers.

| Metric | Launch target |
|---|---:|
| Schema-valid persisted AI output | 100% |
| Valid source references for grounded claims | 100% |
| Fabricated source quotations in evaluation set | 0 |
| Required work-item field completeness | at least 98% |
| Duplicate native work-item creation or lifecycle event under retry tests | 0 |
| Critical deterministic validation bypasses | 0 |
| Human acceptance without material rewrite | at least 90% on the approved launch dataset |
| Approved-requirement coverage by approved work-item set | at least 95%, with every omission explicitly identified |
| Required Engineering Plan lifecycle-domain coverage | 100% |
| Approved business outcomes and experience-relevant requirements mapped to journeys/screens or explicitly marked not applicable | 100% |
| Required critical-flow state and reachable-transition coverage | 100% |
| Silent canonical graph mutations caused by design edits | 0 |
| Deterministic design-quality failures bypassed by semantic review | 0 |
| Material agent disagreements silently collapsed into consensus | 0 |
| Affected downstream transitions while a material disagreement is unresolved | 0 |
| Confirmed disagreement resolutions missing alternatives, recommendation rationale, human selection, or provenance | 0 |
| Work items marked completed without required evidence or an authorized audited exception | 0 |
| Model-invented work-item progress or completion claims | 0 |
| Unsupported standards or vendor-reference IDs in persisted AI output | 0 |
| Fabricated certification, test, scan, performance, availability, deployment, or cost claims | 0 |
| Enabled code-generation runs without a compatible approved Coding Profile and Code Generation Plan | 0 |
| Material coding decisions unresolved when generation begins | 0 |
| Generated files outside authorized paths or without an owning Component Contract | 0 |
| Governed components missing a current validated Markdown projection | 0 |
| Component documentation claiming executed behavior or tests without evidence | 0 |
| Resulting repository trees differing from the approved and tested change-set digest | 0 |
| Component Contracts activated before successful repository reconciliation | 0 |
| Incompatible dependent components remaining current after a contract change | 0 |
| Code execution through an adapter, account, location, tools, model policy, or limits different from the approved plan | 0 |
| Test strategies missing a disposition for any of the seven required testing families | 0 |
| Test runs using a stale or unapproved Test Strategy version or hash | 0 |
| Applicable requirements or material risks without a test obligation or approved exception | 0 |
| Arbitrary model-selected commands executed | 0 |
| Non-waivable failed or blocked checks bypassed during promotion | 0 |
| Penetration executions without active Rules of Engagement authorization | 0 |
| Sensitive security evidence exposed outside its approved access policy | 0 |
| Performance claims missing build, environment, dataset, workload, duration, concurrency, and immutable evidence | 0 |
| Customer cloud recommendations that inherit Axiom's AWS choice without project evidence | 0 |
| Final architecture approvals incompatible with the current workload-placement decision | 0 |
| Critical expired cloud facts whose dependent placement or architecture remains current | 0 |
| Deployment Baselines created without an authorized compatible Deployment Target | 0 |
| Release Candidates missing exact compatible upstream decision, plan, strategy, target, or evidence hashes | 0 |
| Environment mutations made from a stale or absent exact deployment approval | 0 |
| One deployment approval consumed into more than one Deployment Run or idempotency lineage | 0 |
| Deployments reported verified from provider success without the required post-deployment evidence | 0 |
| Failed or inconclusive deployment verification represented as execution failure or verified health | 0 |
| Automatic rollbacks executed without a current passing safety predicate | 0 |
| Monitoring configuration writes or production alert silences without current scoped approval and reconciliation | 0 |
| Monitoring writes executed against an unvalidated organization, project, environment, or provider-tenant binding | 0 |
| Sensitive deployment or security evidence persisted or exported outside its approved protection policy | 0 |
| Runtime claims promoted to `RUNTIME_OBSERVED` without scoped immutable telemetry | 0 |

No model is promoted solely because it is cheaper, faster, or scores well on public benchmarks. It must satisfy Axiom’s task-specific evaluation thresholds.

## 8. Data requirements

### 8.1 Database decision

- Local development and tests shall use PostgreSQL in Docker.
- AWS production shall use Amazon RDS for PostgreSQL.
- Neon or another standards-compatible managed PostgreSQL service may be used for isolated development or a future deployment profile, but application semantics shall not depend on proprietary database behavior without an ADR.
- SQLite and filesystem JSON stores are migration sources only and shall not remain the commercial source of truth.

### 8.2 Core entities

The schema shall include at least:

- User, Organization, Membership, Role, Session
- Plan, Subscription, Entitlement, UsageReservation, UsageLedgerEntry
- Project, SourceArtifact, SourceVersion, SourceSpan
- Requirement, NFRDetail, Gap, ClarificationQuestion, ClarificationAnswer
- BusinessOutcome, Actor, OperatingWorkflow, SuccessMeasure
- InformationArchitecture, UserJourney, JourneyStep, ExperienceGeneration
- DesignArtifact, DesignVersion, DesignScreen, DesignNode, DesignInteraction, DesignToken, DesignComponent, DesignReview, ExperienceBaseline
- ArchitectureOption, ArchitectureDecision, ConstitutionRule
- Artifact, WorkItem, WorkItemVersion, WorkItemLifecyclePolicyVersion, WorkItemAssignment, WorkItemDependency, WorkItemStatusTransition, WorkItemActivity, WorkItemComment, CompletionException, Approval
- IntegrationInstallation, IntegrationMapping, ExternalArtifactCopy, OutboxEvent, WebhookEvent
- ModelProvider, ModelDefinition, ModelPolicy, PromptVersion, AgentWorkflowVersion
- WorkflowRun, WorkflowNodeRun, AgentRun, ModelCall, ToolCall, EvaluationDataset, EvaluationCase, EvaluationRun
- AgentDisagreement, RankedDecisionOption, HumanDecisionResolution
- RepositoryAuthorization, RepositoryRevision, RepositoryConventionObservation, CodingProfileVersion, CodingProfileQuestion, CodingProfileOption, CodingProfileResolution, EngineeringPracticeCatalogEntry
- CodeGenerationPlan, CodeGenerationRun, CodeChangeSet, RepositoryEffect, RepositoryReconciliation, GeneratedFile, CodeComponent, ComponentContract, ComponentContractVersion, ComponentDependency, ComponentMarkdownProjection, ComponentFileBinding, ExternalAgentRun
- TestStrategy, TestStrategyVersion, TestCategoryDisposition, TestObligation, TestCaseDefinition, VerificationCommand, VerificationRun, TestResult, TestWaiver, PenetrationTestAuthorization, PenetrationTestEngagement, PerformanceTestProfile
- WorkloadPlacementApplicability, WorkloadPlacementOption, WorkloadPlacementDecision, CloudReferenceRecord, CostEstimate, DeploymentTarget, DeploymentBaseline, ReleaseCandidate, DeploymentApproval, DeploymentApprovalConsumption, DeploymentVerificationProfile, DeploymentVerificationAssertion, DeploymentRun, DeploymentVerificationRun, DeploymentStep, RollbackRun
- ObservabilityPlan, ServiceLevelIndicator, ServiceLevelObjective, AlertRule, DashboardReference, RunbookReference, MonitoringTarget, MonitoringConfigurationChange, RuntimeObservation, Incident
- Evidence
- TraceLink and AuditEvent

### 8.3 Data integrity

- Customer-scoped tables shall include organization ownership.
- Referential integrity shall be enforced in PostgreSQL where practical.
- External side effects shall use exact scoped approvals, idempotency keys, and transactional outbox records where applicable.
- Optimistic concurrency or row locking shall protect approvals and graph mutations.
- Schema migrations shall be versioned, reviewed, reversible where practical, and tested against production-like data volume.
- Sensitive secrets shall never be stored in ordinary application columns or logs.

## 9. Technical architecture

### 9.1 Launch topology

```text
Browser
  -> AWS edge/load balancer
       -> Next.js web/BFF container on ECS Fargate
       -> Node.js API container on ECS Fargate
            -> PostgreSQL repositories -> RDS PostgreSQL
            -> object storage adapter -> S3
            -> durable job adapter -> SQS
            -> Agent Kernel -> Groq / OpenAI
            -> native delivery module/application service -> canonical WorkItems / PostgreSQL
            -> Integration adapters -> approved external artifact, repository, billing, and deployment providers
       -> Node.js worker container on ECS Fargate
            -> durable job adapter -> SQS
            -> verification runner -> approved workspace
  -> CloudWatch / OpenTelemetry-compatible telemetry
```

### 9.2 Application structure

The product shall use three repository boundaries:

- `axiom-web`: Next.js user interface, server rendering, session integration, and thin browser-specific Backend-for-Frontend behavior;
- `axiom-platform`: Node.js TypeScript API, background worker, domain modules, application services, database access, Agent Kernel, and integration adapters;
- `axiom-infrastructure`: Terraform configurations, reusable infrastructure modules, environment composition, and infrastructure delivery controls.

The platform repository shall remain one modular monolith with independently testable modules:

- identity and organizations;
- projects and canonical graph;
- requirements and clarification;
- business discovery and experience design;
- architecture and artifacts;
- work-item quality and native delivery workflow;
- agent kernel and model providers;
- integrations;
- billing and usage;
- code generation, component contracts, testing, deployment, and runtime evidence;
- traceability and audit.

Domain modules shall not depend on React components, Next.js route handlers, NestJS controllers, provider SDKs, or infrastructure implementations. Cross-module access shall use explicit application services and contracts, not direct table access from arbitrary routes.

The API and worker may be separate processes and independently scalable containers while sharing the same versioned platform codebase. This process separation does not make the domain modules microservices and does not permit duplicated business logic or direct cross-module table access.

### 9.3 API

- The authoritative commercial API shall run as a dedicated Node.js TypeScript service using NestJS with the Fastify adapter.
- The commercial API shall be versioned under `/api/v1` and documented with OpenAPI 3.1.
- Request and response boundaries shall be validated with Zod.
- Errors shall expose stable machine codes, safe messages, request IDs, and retryability.
- Mutating APIs shall support idempotency where retries can duplicate side effects.
- Pagination shall be cursor-based for unbounded collections.
- Long operations shall return a durable job/run ID and shall not depend on one browser request remaining open.
- Webhooks shall be signed or authenticated, deduplicated, and safely replayable.
- Next.js route handlers shall be limited to browser-specific BFF needs such as session exchange, callback handling, same-origin proxying, and response shaping. They shall not own domain rules, persistence, long-running workflows, native work-item transitions, external integration or deployment effects, or billing decisions.
- The web repository shall consume a generated client from the reviewed OpenAPI contract. Cross-repository API changes shall pass compatibility checks before release.

### 9.4 Containers and orchestration

- Docker images shall be reproducible, minimally privileged, scanned, and immutable per release.
- Docker Compose shall run the local web, API, worker, PostgreSQL, and required local dependencies.
- AWS ECS Fargate is the launch orchestrator for Axiom's own service; it is not a default recommendation for customer workloads.
- Kubernetes manifests and EKS are Later scope, triggered by measured needs such as independent service scaling, advanced scheduling, isolation, or platform-team readiness.
- No local or production workflow shall deploy to Vercel.

### 9.5 Microservice extraction triggers

A module may become a service only when measured evidence demonstrates at least one of:

- materially different scaling or availability requirements;
- a stronger security or customer-network isolation boundary;
- independent deployment cadence with clear ownership;
- unacceptable queueing or latency inside the monolith;
- a distinct data-consistency model that cannot be safely contained.

Extraction requires an ADR, an owned API/event contract, timeouts, retries, idempotency, observability, and failure-mode tests.

## 10. Non-functional requirements

### 10.1 Security and privacy

| ID | Requirement | Priority |
|---|---|---:|
| NFR-SEC-001 | The launch security baseline shall be mapped to OWASP ASVS and relevant OWASP API Security risks. | Launch |
| NFR-SEC-002 | All transport shall use TLS and managed data stores shall use encryption at rest. | Launch |
| NFR-SEC-003 | Secrets shall use an approved secrets manager and shall be redacted from logs, model context, exports, and child processes. | Launch |
| NFR-SEC-004 | Tenant-isolation tests shall cover every repository and API boundary containing customer data. | Launch |
| NFR-SEC-005 | Source content, repository content, telemetry, and external integration payloads shall be treated as untrusted and potentially prompt-injecting. | Launch |
| NFR-SEC-006 | Dependency, container, secret, and static analysis shall run in CI with an owned remediation policy. | Launch |
| NFR-SEC-007 | Production access and security-sensitive changes shall be audited. | Launch |
| NFR-SEC-008 | Penetration and production-impacting test controls shall fail closed outside the exact approved target, environment, time, operation, and Rules of Engagement. | Next |
| NFR-SEC-009 | Tool and provider output shall be classified and sanitized before persistence; any required sensitive raw evidence shall use encrypted restricted storage, controlled references, retention and audited deletion, and shall not enter model context or ordinary exports. | Launch |
| NFR-PRIV-001 | Customers shall be told which provider receives their data and under which retention policy. | Launch |
| NFR-PRIV-002 | Provider selection shall respect organization data-region and data-processing policy. | Next |
| NFR-PRIV-003 | Retention and deletion jobs shall be testable and produce auditable evidence. | Launch |

### 10.2 Reliability

| ID | Requirement | Priority |
|---|---|---:|
| NFR-REL-001 | A failed model, integration, repository, verification, deployment, or telemetry operation shall not overwrite the last valid graph, approval, release, or evidence. | Launch |
| NFR-REL-002 | External side effects shall use bounded retries, exponential backoff, idempotency, and dead-letter handling. | Launch |
| NFR-REL-003 | Database backups and restore procedures shall be configured and restore-tested before general availability. | Launch |
| NFR-REL-004 | Customer-visible operations shall expose honest queued, running, succeeded, partially failed, failed, and cancelled states. | Launch |
| NFR-REL-005 | Production availability targets and recovery objectives shall be published per commercial plan before sale. | Launch |

### 10.3 Performance and scale

| ID | Requirement | Priority |
|---|---|---:|
| NFR-PERF-001 | Non-AI API reads shall target p95 below 500 ms under the documented launch load profile. | Launch |
| NFR-PERF-002 | Long AI, integration, and verification operations shall acknowledge with a durable run ID within 2 seconds. | Launch |
| NFR-PERF-003 | Every performance claim shall identify environment, dataset, concurrency, duration, and measured evidence. | Launch |
| NFR-PERF-004 | Load limits shall be established through repeatable tests before general availability. | Launch |
| NFR-PERF-005 | Enabled deployment and runtime-provider operations shall acknowledge with a durable run ID within 2 seconds and shall continue independently from the browser request. | Next |

### 10.4 Accessibility

| ID | Requirement | Priority |
|---|---|---:|
| NFR-A11Y-001 | Launch user journeys shall target WCAG 2.2 Level AA. | Launch |
| NFR-A11Y-002 | Automated scans shall be combined with keyboard and human review; scans alone shall not claim conformance. | Launch |
| NFR-A11Y-003 | Status shall not rely on color alone and every graph shall have an accessible alternative. | Launch |
| NFR-A11Y-004 | The Experience Studio shall expose screen structure, properties, annotations, interactions, trace links, and review actions through keyboard-operable controls and a structured non-canvas presentation. | Launch |

### 10.5 Maintainability and delivery

| ID | Requirement | Priority |
|---|---|---:|
| NFR-MAINT-001 | TypeScript strict mode, explicit module boundaries, Zod validation, and automated migration tests are mandatory. | Launch |
| NFR-MAINT-002 | Provider-specific code shall remain in adapters. | Launch |
| NFR-MAINT-003 | Every non-trivial defect fix shall include the smallest useful regression test. | Launch |
| NFR-MAINT-004 | CI shall run lint, typecheck, unit/integration tests, production build, security checks, and selected E2E tests. | Launch |
| NFR-MAINT-005 | Releases shall use staged environments, migration gates, health checks, and rollback procedures. | Launch |
| NFR-MAINT-006 | Every governed generated component shall keep its structured contract, Markdown projection, owned paths, relevant tests, and operational signals compatible with the current code revision. | Next |

### 10.6 Observability and cost

| ID | Requirement | Priority |
|---|---|---:|
| NFR-OBS-001 | Access-controlled logs and traces may use opaque request, organization, project, and run correlation IDs without leaking content; metrics shall use bounded approved dimensions or controlled exemplars and shall not expose raw tenant identifiers as unbounded labels. | Launch |
| NFR-OBS-002 | Model calls shall record latency, token usage, cache usage, retries, provider status, and cost. | Launch |
| NFR-OBS-003 | Launch external integration calls shall record provider request IDs, exact target, rate-limit state, retries, reconciliation state, and outcomes. | Launch |
| NFR-OBS-004 | Axiom's own services shall expose owned SLIs, SLOs, release markers, alerts, dashboards, and tested runbooks before production launch. | Launch |
| NFR-OBS-005 | Monitoring shall expose missing or stale telemetry and shall not infer health solely from the absence of alerts. | Launch |
| NFR-OBS-006 | Enabled deployment and monitoring-provider calls shall record provider request IDs, exact target, rate-limit state, retries, reconciliation state, and outcomes. | Next |
| NFR-COST-001 | Launch shall use hosted inference and shall not require reserved GPUs. | Launch |
| NFR-COST-002 | Model routing, context selection, output limits, caching, and batch/flex execution shall be evaluated as cost controls. | Launch |
| NFR-COST-003 | Budgets and alerts shall exist for Axiom's AWS infrastructure and each model provider before production launch. | Launch |
| NFR-COST-004 | Customer-workload cost estimates, test or deployment cost caps, and actual runtime cost observations shall remain scoped separately from Axiom's own operating cost. | Next |

## 11. Verification strategy

### 11.1 Required verification layers

The following layers verify Axiom itself. A customer-project Test Strategy or generated test file is not evidence that Axiom passed its own release gates.

- Domain and functional unit, integration, system, and E2E tests for truth transitions, stable IDs, policies, native work-item lifecycle, assignment, blockers, evidence-based completion, budgets, negative paths, retries, cancellation, and recovery.
- UI component and browser tests for critical journeys, asynchronous and failure states, keyboard and accessibility behavior, responsive variants, supported browsers, visual regressions, and the Experience Studio and Delivery Workspace structured fallbacks.
- Versioned API contract and behavior tests for OpenAPI conformance, validation, authentication, authorization, organization isolation, idempotency, concurrency, pagination, rate limits, safe errors, and compatibility.
- PostgreSQL tests for repositories, constraints, transactions, locking, tenant isolation, forward migrations, rollback or forward recovery, production-like volume where required, backup, and restoration.
- Contract tests for model, external artifact, repository, billing, coding-agent, CI/CD, cloud, and telemetry adapters and authenticated webhook behavior.
- AI evaluation tests using immutable datasets and stored results, including adversarial input, disagreement, code-plan, Component Contract, test-plan, cloud-placement, deployment, and monitoring cases.
- Security verification covering threat modeling, secure-design review, SAST, SCA, license and secret scanning, container and IaC analysis, DAST where applicable, tenant isolation, authorization abuse, and owned remediation evidence.
- Separately authorized penetration testing under approved Rules of Engagement before general availability and after material attack-surface changes; automated scanning alone shall not satisfy this layer.
- Repeatable performance, load, stress, and soak testing against approved latency, throughput, concurrency, queue, resource, cost, and recovery thresholds at production-like scale where required.
- Idempotency, partial-failure, webhook replay, outbox, provider timeout, stale approval, reconciliation, cancellation, and rollback-failure tests for every consequential side effect.
- E2E tests for source to approved Business Context and Experience Baseline, native work-item activation, ownership and blocking, controlled implementation, complete applicable test evidence, release approval, deployment verification, runtime observation, incident follow-up, and safe failure or cancellation paths as each capability becomes enabled.
- Staging deployment, artifact provenance, migration, rollback or forward-recovery, alert-delivery, runbook, backup-restoration, disaster-recovery, and cost-control exercises before the applicable production release.

### 11.2 Evidence rules

A requirement is complete only when its visible behavior, validation, failure states, authorization, auditability, and relevant automated evidence exist. Generated explanations do not satisfy verification requirements.

## 12. Commercial launch acceptance criteria

The first commercial release is accepted only when all of the following are evidenced:

- [ ] PostgreSQL is the authoritative store locally and in the production architecture.
- [ ] Organization-scoped authentication and authorization pass tenant-isolation tests.
- [ ] Source ingestion and exact-span grounding work for supported launch formats.
- [ ] Work-item generation passes the Section 7 quality gates on the approved dataset.
- [ ] Critical unknowns produce clarification questions rather than invented answers.
- [ ] Business outcomes, actors, operating workflows, and success measures are grounded or explicitly marked as suggestions or unknowns.
- [ ] Experience-relevant approved requirements are covered by an exact approved Experience Baseline with no unresolved blocker or silent graph mutation.
- [ ] The Experience Studio passes editing, revision, prototype-flow, required-state, responsive, traceability, authorization, accessibility, and stale-baseline tests.
- [ ] The native Delivery Workspace passes organization isolation, content-versus-delivery state separation, authorization, assignment, dependency, cycle, stale-version, optimistic-concurrency, idempotency, completion-evidence, exception, audit, export, and accessibility tests.
- [ ] Approved software-delivery work requires no Jira or Trello account, and the bounded Delivery Workspace does not expose the excluded general-purpose project-management capabilities in FR-DLV-013.
- [ ] Groq and OpenAI adapters are evaluated, budgeted, observable, and independently disableable.
- [ ] Economy/Balanced/Best routing cannot exceed organization limits.
- [ ] Subscription, entitlement, reservation, and usage ledgers reconcile in test scenarios.
- [ ] External writes require explicit approval and produce audit records.
- [ ] Fixed verification produces real evidence and preserves failures honestly.
- [ ] Every launch Engineering Plan addresses UI, functional, API, database, security, authorized penetration, and performance testing guidance and includes a versioned workload-placement and Observability Plan where applicable; executable Test Strategies remain gated by FR-TEST-001.
- [ ] Docker-based local setup works from a clean checkout.
- [ ] Axiom's own AWS deployment artifacts target ECS Fargate, RDS PostgreSQL, S3, and SQS; no Vercel deployment path is active and that hosting choice is not presented as an automatic customer-workload recommendation.
- [ ] Backup restoration and rollback procedures have been executed in a non-production environment.
- [ ] CI quality and security gates pass.
- [ ] Launch journeys satisfy the documented accessibility review.
- [ ] Cost alerts and hard model-spend controls are enabled.
- [ ] Customer-facing privacy, retention, provider-use, and deletion behavior is documented.

## 13. Delivery sequence

### Milestone A — Contract and data foundation

- Replace hackathon scope and remove obsolete release assumptions.
- Introduce PostgreSQL schema, migrations, repositories, and local Docker environment.
- Preserve and migrate current project data where supported.
- Add organization ownership to canonical data.

### Milestone B — Commercial identity and governance

- Authentication, organizations, roles, audit, retention foundations.
- Plans, entitlements, usage reservation, usage ledger, and hard limits.

### Milestone C — Business discovery and Experience Studio

- Business outcomes, actors, operating workflows, success measures, information architecture, and user journeys.
- Source-linked editable wireframes, governed revisions, interaction prototypes, design-quality gates, and exact Experience Baseline approval.

### Milestone D — Work-item Quality Engine

- Agent Kernel, prompt/schema versioning, model catalog, evaluation harness.
- Grounded work-item generation, deterministic validators, review feedback.
- Provider-neutral workload-placement decisions and applicable Observability Plans with dated controlled references, explicit applicability, deterministic validation, and human approval.
- Groq and OpenAI qualification.

### Milestone E — Axiom Delivery Workspace

- Canonical work-item versions, accountable human ownership, assignments, dependencies, blockers, and governed lifecycle transitions.
- Accessible list/detail/status-lane views, exact activation and consequential-transition previews, evidence-based completion, immutable history, truthful progress, audit, and export.

### Milestone F — AWS private beta

- Docker release images, ECS Fargate, RDS PostgreSQL, S3, SQS, telemetry, secrets, backups, alerts.
- Staging, production migration, rollback, security, accessibility, and load evidence.

### Milestone G — Agent execution ecosystem

- Customer-authorized repository inspection, Coding Profiles, ranked configuration questions, and immutable Code Generation Plans.
- Native and external coding-agent adapters, isolated atomic change sets, Component Contracts, and checked-in Markdown projections.
- Governed UI, functional, API, database, security, separately authorized penetration, and performance testing with controlled verification and imported PR/evidence lifecycle.

### Milestone H — Customer deployment and runtime operations

- Separately authorized Deployment Targets and Deployment Baselines compatible with the earlier approved provider-neutral placement decision.
- Controlled environment-specific deployment, migration, verification, reconciliation, rollback or forward recovery, and release evidence.
- Materialization of the earlier approved Observability Plans through release-correlated telemetry, owned SLIs/SLOs, scoped monitoring configuration, tested alerts and runbooks, incidents, and native follow-up work.

## 14. Migration from the hackathon prototype

1. Preserve current domain concepts that uphold canonical truth, stable IDs, validation, traceability, approval, and evidence integrity.
2. Replace filesystem/Blob persistence with PostgreSQL repositories and S3 object references.
3. Treat existing Vercel code as legacy infrastructure; do not deploy it and remove it after AWS replacements and migration tests exist.
4. Retire prototype Jira credentials and publishing behavior. Migrate only valid prototype work items into canonical native `WorkItem` versions after explicit review; retain verified legacy provider IDs only as historical metadata and do not add Trello as a dependency.
5. Generalize the Groq-only provider into the Agent Kernel and model catalog.
6. Retain fixture providers only for deterministic tests and explicitly labelled local demonstrations.
7. Preserve the engine-neutral wireframe compiler, curated templates, Excalidraw adapter, and valid revision history only as migration inputs; re-authorize them through organization-scoped platform contracts and the Experience Baseline quality gates before commercial use.
8. Migrate Next.js API routes to the dedicated platform API one bounded vertical slice at a time; keep the current application runnable until each replacement passes contract and end-to-end tests.
9. Move reusable domain and application code into `axiom-platform`; replace direct frontend imports with the generated OpenAPI client and presentation-only web types.
10. Keep the platform modular monolith; extract services only against Section 9.5 triggers.
11. Keep Terraform isolated from application repositories and never commit state, plans containing secrets, credentials, or environment secrets.
12. Do not migrate fabricated, stale, or unverifiable prototype evidence into commercial customer records.

## 15. Normative engineering references

Engineering decisions shall use primary standards and vendor documentation. The launch baseline includes:

- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP API Security Project](https://owasp.org/www-project-api-security/)
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [NIST AI Risk Management Framework and Generative AI Profile](https://www.nist.gov/itl/ai-risk-management-framework)
- [NIST Secure Software Development Framework SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final)
- [NIST SP 800-115 Technical Guide to Information Security Testing and Assessment](https://csrc.nist.gov/pubs/sp/800/115/final)
- [NIST SP 800-204D Strategies for Integration of Software Supply Chain Security in CI/CD Pipelines](https://csrc.nist.gov/pubs/sp/800/204/d/final)
- [OWASP Artificial Intelligence Security Verification Standard](https://owasp.org/www-project-artificial-intelligence-security-verification-standard-aisvs-docs/)
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)
- [AWS SaaS Lens](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html)
- [AWS Agentic AI Lens](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.html)
- [Microsoft Azure Well-Architected Framework](https://learn.microsoft.com/azure/well-architected/)
- [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework)
- [PostgreSQL documentation](https://www.postgresql.org/docs/)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [OpenTelemetry specifications](https://opentelemetry.io/docs/specs/)
- [SLSA specification](https://slsa.dev/spec/)

Where a referenced standard or vendor recommendation changes, adoption requires an assessed change rather than an automatic undocumented upgrade.

## 16. Definition of done

A product change is done only when:

1. It satisfies this SRS and the visible user outcome.
2. Inputs, outputs, authorization, and organization scope are validated.
3. Idle, loading/queued, success, empty, partial-failure, failure, and safe-retry states exist where applicable.
4. Model output is schema-validated and grounded before persistence.
5. External writes are approved, idempotent, and audited.
6. Relevant unit, integration, contract, evaluation, and E2E checks pass.
7. No evidence or provider outcome is fabricated.
8. Traceability and cost usage are recorded where required.
9. Security, privacy, accessibility, and data-loss protections are preserved.
10. Governed code changes include a compatible Coding Profile, current Component Contracts and Markdown projections, and no orphan generated files.
11. Every applicable testing family has an approved obligation and honest executed, failed, blocked, waived, or not-applicable state.
12. Deployment completion, deployment verification, and runtime health remain separate evidence-backed facts.
13. Operational documentation, observability, migrations, rollback or forward-recovery instructions, and runbooks are current.

## 17. Active decision register

This section is the authoritative decision register. Historical prototype choices that conflict with it are superseded and shall not guide implementation.

| ID | Active decision | Consequence |
|---|---|---|
| DR-001 | Axiom is a commercial AI Engineering Operating System, not a hackathon submission or generic chatbot. | Commercial security, tenancy, evidence, quality, and operability gates are mandatory. |
| DR-002 | The canonical project graph in PostgreSQL is authoritative, including native work items and their governed delivery state. | Documents, designs, Markdown projections, exports, external artifact copies, and agent packets are versioned views or synchronized copies. |
| DR-003 | Business Discovery and an applicable approved Experience Baseline precede architecture and delivery scope. | Downstream generation shall fail closed when the compatible current baseline is absent, stale, rejected, or unresolved. |
| DR-004 | Non-visual scope requires an explicit approved `NOT_APPLICABLE` decision. | Axiom shall neither invent screens nor silently skip experience governance. |
| DR-005 | The Experience Studio is a structured governed product-design editor, not a general-purpose Figma replacement. | Build the traceable journey/screen/state model and deterministic quality gates before advanced canvas capabilities. |
| DR-006 | Next.js owns presentation and thin browser-specific BFF behavior; NestJS/Fastify owns the authoritative API and business rules. | New commercial domain logic shall not be added to Next.js route handlers. |
| DR-007 | The platform begins as a Node.js TypeScript modular monolith. | Network services require measured extraction triggers, an owned contract, and an update to this register. |
| DR-008 | PostgreSQL is the commercial source of truth; local development uses Docker PostgreSQL and production targets Amazon RDS PostgreSQL. | Filesystem and Blob stores are migration adapters, not commercial authority. |
| DR-009 | AWS ECS Fargate is the initial production orchestrator; Kubernetes is later scope and Vercel deployment is prohibited. | No cloud deployment or billable resource may be created without explicit user authorization. |
| DR-010 | Model, billing, integration, storage, subscription, coding-agent, CI/CD, cloud, and telemetry providers remain behind interfaces. | OpenAI and Groq remain disabled until task-specific evaluation, pricing, data-policy, region, and budget gates pass; provider choices remain replaceable at governed boundaries. |
| DR-011 | Consequential external writes require exact preview, explicit approval, idempotency, provider-result recording, reconciliation, and audit. | Repository, agent, external artifact, billing, infrastructure, deployment, and monitoring side effects fail closed. |
| DR-012 | Exact measured evidence cannot be replaced by model prose. | Failed or unexecuted operations remain `FAILED` or `UNKNOWN`; customer content never silently enters shared training or evaluation data. |
| DR-013 | Repository product documentation has one authority: this SRS. | `AGENTS.md` contains working rules, `README.md` contains local operation, and neither duplicates product scope or roadmap. |
| DR-014 | Axiom uses a single logical-agent workflow by default and bounded multi-agent execution only when task-specific evaluation justifies it. Material disagreement is preserved, ranked with a recommended path, and decided by an authorized human. | The application-owned Agent Kernel controls routing and authority; agents cannot approve one another or silently manufacture consensus, and affected downstream work fails closed until resolution. |
| DR-015 | Axiom owns a bounded native Delivery Workspace for governed software-delivery work items; Jira and Trello are removed as launch and current-roadmap dependencies. Native `WorkItem` entities and their versions, assignments, dependencies, lifecycle events, approvals, and evidence links are part of the canonical PostgreSQL project graph. | Build the traceable execution coordination needed to carry approved intent through implementation and proof, but do not expand into a general-purpose project-management suite. Any future external work-management interoperability requires validated customer evidence and a new SRS decision and may never become authoritative over the canonical graph. |
| DR-016 | Governed code generation uses an approved Coding Profile, explicit Code Generation Plan, structured Component Contracts, and companion Markdown projections; neither generated prose nor the Markdown projection is canonical code truth or verification evidence. | Inspect the exact authorized repository, ask only unresolved material questions with ranked recommendations, generate an atomic reviewable change set, validate code and documentation together, and resolve contradictions explicitly before promotion. |
| DR-017 | Axiom's launch runtime is hosted on AWS, while each customer project's workload placement is a separate provider-neutral architecture-stage decision; a concrete Deployment Baseline is created later only for an authorized deployable target, and deployment completion, verification, and runtime health are separate facts. | Axiom's ECS/RDS/S3/SQS choices shall not become implicit evidence or a default customer recommendation. Customer placement is source-grounded, co-evaluated with architecture, human-approved, deployed only through exact environment authorization, and monitored only through real scoped telemetry. |

## 18. Current implementation ledger

This ledger records the honest repository state at SRS 4.0. A capability is not commercially complete merely because a deterministic fixture or prototype screen exists.

| Capability | State | Current evidence and boundary |
|---|---|---|
| Contract, truth model, and architecture boundaries | Foundation complete | Commercial principles, canonical graph, truth statuses, provider boundaries, and local-only development rules are established. |
| PostgreSQL foundation and migrations | Substantial foundation | The main local database is migrated through `0019`; the complete 77-test PostgreSQL suite verifies forward behavior and ordered rollback on disposable databases. Clean-checkout CI evidence remains required. |
| Organization identity and authorization | Partial | Organization-scoped opaque local sessions, roles, invitations, ETags, tenant filtering, and audit exist; production IdP, MFA, lifecycle, retention, and deletion remain open. |
| Source ingestion and analysis | Partial | Bounded local ingestion, immutable hashes, extraction states, durable analysis runs, source offsets, graph commits, and deterministic readiness exist; production object storage, scanning, richer extraction, and model qualification remain open. |
| Requirements and clarification | Substantial foundation | Exact requirement artifacts, human clarification mutations, graph versions, readiness, approvals, and invalidation exist. |
| Business Context | Partial | Deterministic outcomes, actors, workflows, success measures, applicability, exact versions, reviews, audit, ETags, idempotency, visible web review, and fail-closed downstream enforcement exist. Current heuristic classification is not semantically qualified for commercial use; jobs, policies, constraints, risks, business-model entities, exact source-span inspection, and Agent Kernel extraction remain open. |
| Experience Baseline | Not implemented | No commercial IA, journey, screen, state, interaction, component, token, design revision, quality report, or immutable Experience Baseline domain exists. |
| Wireframe Studio | Prototype migration input | Curated templates, an engine-neutral compiler, Excalidraw editing, transitions, exports, and revisions exist in legacy web code. They are not commercial approval evidence. |
| Architecture decisions | Substantial foundation | Deterministic options, exact selection, versioned ADR/HLD views, hashes, ETags, idempotency, audit, and the current Business Context/Experience fail-closed gate exist. Commercial Experience Baselines remain unavailable. |
| Engineering Plan | Partial | Versioned fixture plans, recommendations, controlled references, quality validation, Agent Kernel provenance, non-billable evidence, and the current Business Context/Experience fail-closed gate exist; Experience Baseline binding and hosted-model qualification remain open. |
| Work-item generation and quality | Partial | Provider-neutral hierarchy, deterministic quality gates, immutable versions, exact human review, retry safety, and the current Business Context/Experience fail-closed gate exist. The web visibly blocks generation and acceptance while preserving rejection; Experience Baseline coverage, semantic review, and complete approved-requirement coverage remain open. |
| Model catalog, Agent Kernel, and cost controls | Partial | Provider-neutral contracts, local fixtures, model lifecycle, run/call evidence, reservations, balances, and scoped budgets exist. Hosted execution remains disabled and unqualified; application-owned multi-agent coordination, node checkpoints, disagreement detection, ranked decision packets, and resumable human gates are not implemented. |
| Axiom Delivery Workspace | Not commercially implemented | The canonical `WorkItem` generation foundation exists, but the native owner, assignment, dependency, lifecycle, evidence-based completion, truthful progress, accessible delivery views, activity, audit, and portable-export vertical slice is open. Prototype Jira behavior is historical migration input only. |
| Security, privacy, testing, and operability | Not launch-ready | ASVS/API mapping, complete UI/functional/API/database/security test obligations, separately authorized penetration testing, performance evidence, retention/deletion jobs, SLOs, runbooks, backup restore, WCAG review, and incident evidence remain open. |
| AWS private beta | Not started | Terraform environments, ECS/RDS/S3/SQS, observability, secrets, migration, rollback, and disaster-recovery evidence remain open. |
| Coding-agent ecosystem and component context | Prototype only | Controlled local fixture generation and verification exist; repository authorization and inspection, Coding Profile questionnaire and decisions, Code Generation Plans, isolated atomic changes, structured Component Contracts, Markdown projections, freshness validation, sandboxed adapters, PR lifecycle, and commercial evidence import remain open. |
| Customer workload placement, deployment, and monitoring | Planning foundation only | Engineering Plan domains and controlled references exist, but provider-neutral placement decisions, dated cloud facts and cost estimates, Deployment Baselines, release candidates, environment approvals, deployment adapters, reconciliation, rollback or forward recovery, Observability Plans, telemetry ingestion, SLO evidence, alerts, runbooks, and incident linkage are not implemented. |

### 18.1 Verification snapshot

On 2026-08-04, the web lint, typecheck, production build, 141 tests, and six commercial browser tests passed; five web tests remained skipped by their configured environment gates. Platform lint, typecheck, production build, 54 non-database tests, and the complete 77-test PostgreSQL suite passed; the database tests remain intentionally skipped in the ordinary non-database command and passed under the dedicated database command. The main local database is migrated through `0019`, local billing and a revocable session are provisioned, and the browser-to-BFF-to-platform-to-PostgreSQL Business Context and fail-closed backlog paths are verified. This is point-in-time evidence, not a substitute for clean-checkout CI.

### 18.2 Active product and delivery flags

| Severity | Flag | Required resolution |
|---|---|---|
| AMBER | The platform now has a first reviewable local baseline commit, but no remote CI evidence or clean-checkout reproduction has been recorded. | Configure the intended Git identity/remote and run lint, typecheck, tests, migrations, and build in CI from a clean checkout before treating the baseline as release evidence. |
| RED | No commercial Experience Baseline domain exists. Every `APPLICABLE` project is therefore correctly blocked before new architecture, Engineering Plan, work-item generation, or acceptance. | Deliver P2 schemas, quality gates, editor/review surfaces, compatible-version rules, and immutable approval before claiming an end-to-end applicable experience flow. |
| RED | Current Business Context classification is structurally traceable but semantically over-broad; technical requirements can be misclassified as actors, workflows, or success measures. | Replace unqualified heuristics with evaluated typed extraction, evidence inspection, discovery profiles, and human-confirmation gates in P1. |
| AMBER | Existing projects predate Business Context versions and remain migration-required. Their historical artifacts stay inspectable but cannot receive silent new downstream approvals. | Provide an explicit batch/aided review workflow; never auto-approve applicability or business meaning. |
| AMBER | Browser evidence covers the current missing-baseline gate, source-grounded preview, authorization, retry, billing, and lifecycle paths, but not the full applicability/staleness decision matrix. | Add deterministic fixtures for applicable, not-applicable, needs-decision, stale, rejected, cross-tenant, and successful compatible-baseline paths. |

## 19. Master implementation roadmap

This is the only authoritative implementation order. Checked foundation counts from the retired backlog were 79 complete and 86 open; those counts are not a commercial-readiness score.

### P0 — Restore integrity and enforce the business-first lifecycle

P0 is complete only when all of the following are satisfied:

- [x] The master SRS is the sole product/roadmap authority; obsolete repository product ADRs, implementation notes, and the separate backlog are removed.
- [ ] The platform repository has reviewable version-control history and CI can reproduce its lint, typecheck, test, migration, and build evidence from a clean checkout.
- [x] Local PostgreSQL is migrated through the current platform migration, rollback is verified on a disposable database, and a revocable local session enables the browser-to-BFF-to-platform-to-database journey.
- [ ] Every current project has an explicit, current Business Context applicability decision before new architecture, Engineering Plan, work-item generation, or work-item approval can proceed.
- [x] Downstream gates require an exact current approved Business Context and, when applicability is `APPLICABLE`, an exact compatible approved Experience Baseline.
- [x] Existing pre-baseline projects are preserved as historical data but are marked migration-required and cannot silently create new downstream approvals.
- [ ] Browser E2E proves applicable, not-applicable, needs-decision, stale, rejected, unauthorized, cross-tenant, retry, and success paths without fabricated progress or evidence.

### P1 — Complete Business Discovery

- [ ] Define normalized versioned entities for outcomes, customer segments, actors, jobs, pains/gains, value propositions, workflows, policies, constraints, risks, measures, stakeholders, market assumptions, revenue/funding, pricing, cost drivers, unit economics, adoption impacts, and applicability.
- [ ] Add bounded project-type and industry discovery profiles with explicit required, optional, and not-applicable fields.
- [ ] Extract through the Agent Kernel with immutable source spans, typed trace links, explicit contradictions, assumptions, unknowns, confidence/evaluation evidence, and human confirmations.
- [ ] Add application-owned bounded workflow coordination with typed node contracts, durable PostgreSQL run state, revision and provider-retry separation, limits, cancellation, repeated-result stall detection, and resumable human gates; keep one logical-agent workflow as the evaluated baseline.
- [ ] Implement material-disagreement detection, immutable ranked decision packets, preserved dissent, reviewer accept/select/edit-or-combine/request-evidence/defer/reject-all actions, revalidation, affected-path blocking, graph resolution, invalidation, and audit.
- [ ] Provide an evidence inspector and a governed graph-change proposal lifecycle with ownership, resolution, re-analysis, and closure evidence.
- [ ] Add deterministic business-quality gates for measurability, ownership, traceability, workflow coverage, contradictions, unsupported claims, and downstream coverage.

### P2 — Commercial Experience Baseline and Studio

- [ ] Implement organization-scoped schemas, repositories, migrations, and APIs for information architecture, journeys, screens, states, nodes, interactions, tokens, components, revisions, reviews, quality reports, and baselines.
- [ ] Replace round-robin templates with evaluated semantic mapping from approved business context, requirements, data, permissions, risks, and architecture constraints.
- [ ] Generate applicable default, loading, queued, empty, permission, validation, partial-failure, failure, cancellation, recovery, and success states with stable traceable IDs.
- [ ] Implement deterministic coverage, continuity, reachability, responsive, accessibility, contradiction, blocker, and prohibited-claim quality gates before canvas polish.
- [ ] Migrate the engine-neutral compiler and editor business rules into the platform; retain Excalidraw only as a replaceable adapter.
- [ ] Deliver keyboard-operable structured editing, multi-screen prototype review, responsive variants, reusable tokens/components, bounded import/export, immutable revisions, exact approval, and a non-canvas review fallback.
- [ ] Build a human-reviewed experience evaluation corpus covering good, bad, incomplete, contradictory, inaccessible, adversarial, dead-end, and silent-mutation examples.

### P3 — Commercial delivery loop

- [ ] Bind Engineering Plan and work items to exact requirement, Experience, and architecture baselines with complete traceability and stale-version invalidation.
- [ ] Implement workload-placement applicability, provider-neutral constraint gathering, dated and hashed controlled cloud references, comparable cost and risk ranges, architecture-compatible ranked options, human approval, invalidation, and applicable versioned Observability Plans; never inherit Axiom's AWS choice as customer evidence.
- [ ] Qualify OpenAI and Groq per task with immutable evaluation, verified price/data/region policy, budgets, cancellation, retry, and measured usage evidence.
- [ ] Implement canonical native work-item activation, accountable ownership, assignment history, dependencies and cycle detection, governed content and delivery state machines, optimistic concurrency, idempotency, evidence-based completion and exceptions, immutable activity, truthful progress, accessible list/detail/status-lane views, search/filter, audit, and portable export.
- [ ] Implement production identity, MFA, organization lifecycle, retention, export, deletion, and legal-hold extension points.

### P4 — Commercial hardening and AWS private beta

- [ ] Map controls to OWASP ASVS, API risks, and the WSTG; add owned UI, functional, API, database, secret, dependency, static, dynamic, container, IaC, tenant-isolation, accessibility, performance, load, and authorized penetration-test gates.
- [ ] Establish Axiom-owned SLIs, SLOs, release-correlated telemetry, alert delivery, incident roles, tested runbooks, backups, restoration, disaster recovery, and cost alerts.
- [ ] Build reviewed Terraform for AWS environments using ECS Fargate, RDS PostgreSQL, S3, SQS, approved secrets, least privilege, and rollback-safe migrations.
- [ ] Execute staging migration, rollback, backup restoration, security, accessibility, load, and cost evidence before any production tenant.

### P5 — Controlled coding-agent ecosystem

- [ ] Authorize one repository and exact revision, inspect its conventions safely, and create versioned organization/project/repository Coding Profiles with branch, path, dependency, license, security, documentation, and approved-command policies.
- [ ] Implement bounded Coding Profile questions with ranked project-specific recommendations, human resolution, inheritance precedence, staleness, and affected-generation blocking.
- [ ] Implement immutable Code Generation Plans and sandboxed native and external coding-agent adapters with canonical-path containment, deny-by-default egress, scoped secrets, resource bounds, workspace destruction, drift detection, plan-variance gates, cancellation, and bounded output.
- [ ] Implement stable proposed-to-current Component Contracts, dependency invalidation, file ownership, deterministically compiled bounded Markdown projections, repository code/document atomicity, approved-and-tested tree-digest reconciliation, freshness and contradiction validation, and minimum-necessary context assembly for subsequent agents.
- [ ] Implement approved/stale/historical Test Strategy versions, exact run binding, sensitive-evidence controls, and controlled UI, functional, API, database, and security execution before separately authorized penetration and performance execution.
- [ ] Require exact diff and evidence review plus separate approvals before branch, commit, push, pull-request, migration, public-API, authorization, dependency, license-exception, or infrastructure effects; import only real provider IDs, checks, diffs, and evidence.

### P6 — Customer workload deployment and monitoring

- [ ] Convert applicable approved placement decisions into separately authorized Deployment Targets and Deployment Baselines without creating targets for no-migration, SaaS, or not-applicable decisions.
- [ ] Implement immutable Release Candidates with exact upstream hashes, artifact provenance and SBOM binding, time-bound one-run approval consumption, environment-specific exact previews, least-privilege deployment adapters, separate execution and verification states, idempotency, concurrency, cancellation, provider reconciliation, migration classification, and honest partial-failure behavior.
- [ ] Implement release-specific post-deployment smoke, health, migration, security, and SLO verification profiles; deterministic rollback-safety predicates, human-gated recovery, forward-recovery handling, and sanitized immutable deployment and rollback evidence.
- [ ] Materialize the already-approved applicable Observability Plans through release markers, scoped telemetry integrations and Monitoring Targets, privacy and cardinality controls, SLIs/SLOs, approved alerts and dashboards, tested runbooks, incidents, and traceable native follow-up work.

## 20. SRS change log

| Version | Date | Change |
|---|---|---|
| 4.0 | 2026-08-09 | Replaced Jira and Trello launch dependencies with a bounded Axiom-native Delivery Workspace whose work-item versions, ownership, assignments, dependencies, lifecycle, evidence-based completion, activity, progress, audit, and export remain canonical. Added governed repository inspection, ranked Coding Profile questions, Code Generation Plans, staged and reconciled repository change sets, structured Component Contracts with deterministic Markdown projections, full UI/functional/API/database/security/authorized-penetration/performance test strategies, provider-neutral architecture-stage workload placement, environment-specific controlled deployment, rollback or forward recovery, and evidence-backed monitoring. Separated Axiom's own AWS hosting from customer cloud recommendations and updated journeys, quality gates, entities, architecture, verification, milestones, decisions, ledger, and roadmap. |
| 3.2 | 2026-08-09 | Established the bounded multi-agent and material-disagreement policy: single-agent workflows remain the evaluated default; application-owned coordination preserves substantive dissent, ranks alternatives from recommended to not preferred, explains evidence and trade-offs, requires an authorized human decision, revalidates edits, records provenance and rationale, and blocks affected downstream work until resolution. Added the corresponding journey, requirements, entities, evaluation cases, launch gates, decision register entry, implementation gap, and P1 roadmap work. |
| 3.1 | 2026-08-04 | Recorded P0 documentation consolidation, the first local platform baseline commit, local migration and rollback evidence, repaired local billing provisioning, fail-closed Business Context enforcement across architecture/plans/work items, visible backlog gating, browser evidence, and unresolved product/delivery flags. |
| 3.0 | 2026-08-04 | Consolidated active product decisions, implementation status, and roadmap into the master SRS; expanded structured business discovery; made Business Context and applicable Experience Baseline enforcement the first P0 lifecycle gate; superseded separate repository product ADRs, implementation notes, and backlog. |
| 2.2 | 2026-08-03 | Added business-first discovery and governed Experience Baseline requirements. |
| 2.1 | 2026-07-20 | Established the commercial platform contract and migration from the prototype. |
