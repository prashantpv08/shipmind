# Axiom — Commercial Software Requirements Specification

**Document ID:** AX-SRS-COM-001

**Version:** 3.1

**Date:** 2026-08-04

**Status:** Approved product contract

**Classification:** Internal / Commercial product

**Supersedes:** Axiom Commercial SRS 2.2 dated 2026-08-03, the separate implementation backlog, and repository product decision/implementation notes

## 1. Document control

| Field | Decision |
|---|---|
| Product | Axiom, an AI Engineering Operating System |
| Product thesis | Convert business intent into grounded product experience, engineering decisions, high-quality delivery work, controlled execution, and verifiable evidence |
| Initial customers | SMEs, product teams, engineering organizations, and enterprise pilots |
| Source of truth | The canonical project graph in PostgreSQL |
| Delivery architecture | Separate Next.js web, Node.js TypeScript platform, and Terraform repositories; the platform remains a modular monolith with independently extractable modules |
| Production cloud | AWS |
| Local development | Docker Compose; no cloud deployment required |
| Work management | Jira and Trello connectors; Axiom does not replace either product |
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
- implementation-ready work items;
- Jira issues or Trello cards after human approval;
- controlled task packets for Axiom or external coding agents;
- real verification evidence;
- traceable Why, Why Not, Proof, and Reconsider answers.

### 2.2 Differentiator

Axiom is not a generic chatbot and is not another project-management board. Its differentiator is a governed reasoning and evidence layer:

```text
Source evidence
  -> business outcomes and operating context
  -> canonical requirements
  -> clarified decisions
  -> reviewed user journeys and editable experience design
  -> approved architecture
  -> reviewed engineering plan
  -> verified work items
  -> Jira or Trello
  -> coding-agent handoff
  -> real evidence and traceability
```

### 2.3 Launch goals

1. Produce materially better engineering tickets than a single free-form prompt.
2. Prevent unsupported assumptions and fabricated evidence.
3. Make every important ticket traceable to approved source material.
4. Let each organization control models, budgets, connectors, and approvals.
5. Support economical hosted inference without purchasing or operating GPUs.
6. Provide a secure multi-tenant SaaS foundation that can grow without an immediate microservice rewrite.
7. Measure quality, cost, latency, and human acceptance for every AI workflow version.
8. Help users understand what is recommended, what is not recommended, why, the trade-offs, the missing evidence, and when a decision should be reconsidered across the complete software delivery lifecycle.
9. Let business, product, design, and engineering stakeholders review the same source-linked user journeys and wireframes before implementation scope is approved.

### 2.4 Non-goals for launch

Axiom shall not:

- provide a Jira-, Trello-, Linear-, or Notion-style work-management interface;
- replace a general-purpose visual-design suite for unrelated design work;
- train a proprietary foundation model;
- operate a GPU cluster;
- promise autonomous end-to-end software delivery without review;
- silently create external tickets, cards, code changes, deployments, or purchases;
- execute arbitrary model-generated shell commands;
- support arbitrary third-party models before they pass Axiom evaluations;
- deploy on Vercel;
- require Kubernetes for the first commercial release;
- claim legal, regulatory, security, or accessibility certification from automated checks alone.

## 3. Users, organizations, and access

### 3.1 Roles

| Role | Primary permissions |
|---|---|
| Organization Owner | Billing, retention, providers, connectors, organization deletion |
| Administrator | Members, roles, model policies, budgets, integrations |
| Product/Business Analyst | Sources, requirements, clarifications, work-item review |
| Product/Experience Designer | Business workflows, user journeys, wireframe editing, design review |
| Architect/Engineering Lead | Architecture review, approval, engineering policies |
| Developer | Approved tasks, coding-agent handoff, implementation evidence |
| QA/Reviewer | Evaluation, verification, evidence review |
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

PostgreSQL-backed structured entities are authoritative. Markdown, diagrams, Jira issues, Trello cards, Notion pages, and agent task packets are compiled or synchronized views. Stable entity IDs shall survive regeneration and external synchronization.

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

The system shall never fabricate source quotations, test results, coverage, scan findings, cost measurements, performance metrics, external ticket IDs, or coding-agent outcomes. A model may summarize immutable measurements but may not alter them.

## 5. Primary commercial journeys

### 5.1 Source to approved backlog

1. User creates or opens an organization project.
2. User uploads supported sources or pastes business intent.
3. Axiom stores immutable source versions and extracts addressable spans.
4. The agent workflow extracts requirements, NFRs, risks, constraints, and gaps.
5. Deterministic validation rejects invalid references and incomplete output.
6. Axiom asks prioritized clarification questions instead of inventing critical facts.
7. Authorized users confirm answers and approve the requirement baseline.
8. Where the scope includes a user experience, Axiom generates and an authorized user approves the exact Experience Baseline.
9. Axiom generates architecture options where architecture decisions are required.
10. An authorized user approves the relevant decision.
11. Axiom generates implementation-ready work items from the compatible approved baselines.
12. Quality gates score coverage, grounding, testability, duplication, design alignment, and completeness.
13. A human reviews the exact publication preview.
14. Axiom publishes the approved version to Jira or Trello.

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

### 5.3 Approved work to implementation evidence

1. User selects an approved work item.
2. Axiom compiles a versioned task packet from approved graph entities.
3. User chooses Axiom Native, Codex, GitHub Copilot, Devin, or export-only when that adapter is enabled.
4. External execution requires explicit authorization and uses the customer’s account where applicable.
5. Returned patches, pull requests, logs, and claims remain unverified.
6. Axiom runs only repository-approved, allowlisted verification commands.
7. Real results become evidence linked to the original requirements.

### 5.4 Approved intent to full-lifecycle engineering plan

1. Axiom selects the exact approved requirement, applicable Experience Baseline, and architecture versions.
2. A versioned Agent Kernel workflow proposes engineering guidance across every required lifecycle domain.
3. Every recommendation states its disposition, rationale, benefits, trade-offs, risks, alternatives, why alternatives are not preferred now, reconsideration triggers, implementation actions, verification expectations, source entities, and applicable controlled reference IDs.
4. Missing business or engineering evidence becomes an explicit unknown or decision gate rather than an invented recommendation.
5. Deterministic validation rejects missing lifecycle domains, invalid source links, prohibited evidence claims, unsupported reference IDs, and incomplete why/why-not analysis.
6. The exact immutable plan remains `AI_SUGGESTED` until reviewed; it cannot approve architecture, publish work, modify infrastructure, deploy, or claim verification.
7. Material source, requirement, or architecture changes make earlier plans historical and require regeneration.

## 6. Functional requirements

### 6.1 Projects and source ingestion

| ID | Requirement | Priority |
|---|---|---:|
| FR-PROJ-001 | Users shall create, archive, restore, and explicitly delete organization-scoped projects. | Launch |
| FR-PROJ-002 | A project shall expose lifecycle status, current graph version, approvals, connector state, and budget usage. | Launch |
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

### 6.4 Work-item and ticket generation

| ID | Requirement | Priority |
|---|---|---:|
| FR-WORK-001 | Axiom shall generate a normalized hierarchy of initiative/epic, story, task, and defect work items as applicable. | Launch |
| FR-WORK-002 | Every implementable work item shall contain outcome, context, scope, out-of-scope, testable acceptance criteria, dependencies, risks, open questions, evidence expectations, and source links. | Launch |
| FR-WORK-003 | Work items shall use stable IDs independent of Jira keys or Trello card IDs. | Launch |
| FR-WORK-004 | Axiom shall reject publication when required fields, grounding, or testability gates fail. | Launch |
| FR-WORK-005 | Axiom shall detect duplicate or materially overlapping work items before publication. | Launch |
| FR-WORK-006 | Axiom shall identify uncovered approved requirements and unjustified work items. | Launch |
| FR-WORK-007 | Ticket generation shall ask for clarification when a critical implementation decision is unknown. | Launch |
| FR-WORK-008 | Users shall review an exact, immutable publication preview and explicitly approve it. | Launch |
| FR-WORK-009 | Regeneration shall create a new version and preserve the previously approved version and publication history. | Launch |
| FR-WORK-010 | Organization templates may add validated fields and policies without bypassing core quality gates. | Next |

### 6.5 Ticket quality verification

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
| FR-DOC-001 | Axiom shall compile SRS, NFR, HLD, ADR, test strategy, API contract, backlog, and task-packet views from the graph. | Launch |
| FR-DOC-002 | Generated artifacts shall include graph version, content hash, generation provenance, and truth status. | Launch |
| FR-DOC-003 | Axiom may publish documents to Notion or Confluence through optional connectors; those copies are not authoritative. | Next |
| FR-DOC-004 | Axiom shall compile business-context, user-journey, Experience Baseline, design-handoff, and experience-coverage views from canonical graph and design versions. | Launch |
| FR-PLAN-001 | Axiom shall generate a versioned Engineering Plan for product scope, UX/accessibility, architecture/technology, data, APIs/integrations, testing/quality, security/privacy, CI/CD, deployment/cloud infrastructure, reliability/observability, cost/FinOps, and operations/support. | Launch |
| FR-PLAN-002 | Every recommendation shall state recommended, conditional, not-recommended, or needs-decision; why; benefits; trade-offs; risks; alternatives and why-not-now; reconsideration triggers; implementation actions; verification expectations; source links; and controlled reference IDs. | Launch |
| FR-PLAN-003 | Technology, testing, security, deployment, and cloud guidance shall be bound to the exact approved requirement, applicable Experience Baseline, and architecture versions and remain `AI_SUGGESTED` until human review. | Launch |
| FR-PLAN-004 | Axiom shall not claim certification, compliance, test success, security findings, performance, availability, or cost measurements without immutable executed evidence. | Launch |
| FR-PLAN-005 | Axiom shall expose unknowns and next decision gates when evidence is insufficient and shall preserve earlier plans as immutable history after regeneration. | Launch |
| FR-PLAN-006 | Engineering guidance shall use a versioned application-controlled catalog of assessed primary standards and vendor references; model-generated URLs shall not be trusted as references. | Launch |

### 6.7 Jira and Trello connectors

| ID | Requirement | Priority |
|---|---|---:|
| FR-CONN-001 | An organization shall choose Jira, Trello, both, or neither per project. | Launch |
| FR-CONN-002 | Connectors shall use OAuth or an approved enterprise authorization mechanism; personal static credentials are not a commercial default. | Launch |
| FR-CONN-003 | Axiom shall map normalized work items into provider-specific fields through a versioned mapping. | Launch |
| FR-CONN-004 | Jira publication shall support configured issue types, hierarchy, project, labels, and custom-field mappings. | Launch |
| FR-CONN-005 | Trello publication shall support board, list, labels, checklists, members, and approved custom-field mappings. | Launch |
| FR-CONN-006 | Publication shall be idempotent and retry-safe and shall store external ID, URL, version, request ID, and response status. | Launch |
| FR-CONN-007 | Partial failure shall identify exactly which items succeeded, failed, or require reconciliation. | Launch |
| FR-CONN-008 | Axiom shall never claim publication success without a confirmed provider response. | Launch |
| FR-CONN-009 | Launch synchronization shall be controlled publish plus read-only status refresh; unrestricted two-way field synchronization is deferred. | Launch |
| FR-CONN-010 | Webhook updates shall be authenticated, deduplicated, replay-safe, and audited. | Next |
| FR-CONN-011 | Axiom shall not implement a general-purpose board or sprint-management interface. | Launch |

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

### 6.9 Coding-agent adapters and controlled execution

| ID | Requirement | Priority |
|---|---|---:|
| FR-AGENT-001 | Axiom shall define an adapter contract for native execution, Codex, GitHub Copilot, Devin, and export-only handoff. | Next |
| FR-AGENT-002 | External agents shall use customer-owned accounts or separately priced entitlements by default. | Next |
| FR-AGENT-003 | Task packets shall contain only approved scope, constraints, acceptance criteria, trace links, and verification expectations. | Launch |
| FR-AGENT-004 | Repository writes shall require explicit repository authorization and path boundaries. | Next |
| FR-AGENT-005 | External-agent output shall remain unverified until approved commands produce evidence. | Launch |
| FR-AGENT-006 | Axiom shall not expose provider secrets or unrelated organization context to an agent. | Launch |
| FR-CODE-001 | Axiom shall maintain versioned organization, project, and repository coding profiles covering approved languages and frameworks, formatting and linting, architecture boundaries, dependency and license policy, secure-coding controls, generated-file paths, and forbidden patterns. | Launch |
| FR-CODE-002 | Coding-profile inheritance and conflicts shall be resolved deterministically; an AI may suggest a rule change, but only an authorized human may approve the effective profile. | Launch |
| FR-CODE-003 | Every coding task shall bind the exact approved work-item versions, architecture decision, coding-profile version, repository revision, allowed paths, and verification commands. | Launch |
| FR-CODE-004 | Native or external code generation shall produce a reviewable patch or branch and shall not write directly to a protected branch. | Next |
| FR-CODE-005 | Generated code, commits, pull requests, review comments, and verification evidence shall retain typed trace links to the originating decisions and work items. | Next |
| FR-GH-001 | GitHub connectivity shall use a GitHub App or approved enterprise OAuth installation with least-privilege repository selection; personal access tokens are not the commercial default. | Next |
| FR-GH-002 | Before creating a branch, commit, pull request, review, or check, Axiom shall show the exact side-effect preview and require explicit approval. | Next |
| FR-GH-003 | GitHub writes shall be idempotent, auditable, branch-policy aware, and reconciled using recorded provider IDs and authenticated deduplicated webhooks. | Next |
| FR-SEC-001 | Axiom shall maintain a versioned secure-engineering rule catalog that can map applicable requirements to OWASP ASVS 5.0.0, OWASP API Security Top 10 2023, OWASP AISVS 1.0, and NIST SSDF 1.1. | Launch |
| FR-SEC-002 | Axiom shall explain rule applicability, implementation guidance, verification method, exceptions, and missing evidence; catalog mappings shall never be presented as certification or compliance proof. | Launch |

### 6.10 Verification, traceability, and explanation

| ID | Requirement | Priority |
|---|---|---:|
| FR-VER-001 | Verification commands shall be repository-defined and allowlisted; the model shall not choose arbitrary commands. | Launch |
| FR-VER-002 | Runs shall enforce workspace boundaries, timeouts, concurrency limits, secret stripping, and bounded output. | Launch |
| FR-VER-003 | Evidence shall record command/tool, start time, duration, exit status, parsed metrics, immutable raw-output reference, and linked entities. | Launch |
| FR-VER-004 | Failed and unexecuted checks shall remain `FAILED` or `UNKNOWN`. | Launch |
| FR-TRACE-001 | Typed trace links shall connect sources, requirements, gaps, answers, decisions, work items, external publications, code, tests, and evidence. | Launch |
| FR-TRACE-002 | Why, Why Not, Proof, and Reconsider answers shall cite graph entities and shall distinguish suggestion from evidence. | Launch |
| FR-TRACE-003 | Traceability shall have accessible non-graph presentation. | Launch |

### 6.11 Subscriptions, quotas, and cost governance

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

### 6.12 Audit, export, and deletion

| ID | Requirement | Priority |
|---|---|---:|
| FR-AUD-001 | Security-sensitive, approval, billing, model-policy, connector, and deletion events shall create immutable audit records. | Launch |
| FR-AUD-002 | Administrators shall search and export audit history subject to retention policy. | Launch |
| FR-EXP-001 | Projects shall export structured graph data, artifacts, work items, publications, and evidence with a manifest and hashes. | Launch |
| FR-DEL-001 | Destructive deletion shall require confirmation, authorization, dependency checks, and an auditable retention workflow. | Launch |

## 7. AI quality and evaluation contract

### 7.1 Workflow design

All AI engineering workflows shall use bounded stages rather than an unconstrained agent conversation. Ticket generation is one downstream workflow, not the product boundary:

```text
Context selection
  -> business-outcome, actor, and operating-workflow analysis
  -> requirement/gap analysis
  -> clarification gate
  -> user-journey and Experience Baseline generation or explicit not-applicable decision
  -> architecture and full-lifecycle engineering guidance
  -> human decision/approval gates
  -> normalized work-item generation and delivery planning
  -> deterministic validation
  -> semantic review when required
  -> human approval
  -> connector publication
```

The application, not the model, owns IDs, truth transitions, authorization, budgets, approval state, connector side effects, evidence metrics, and retry limits.

### 7.2 Launch evaluation set

The evaluation set shall include:

- representative SME and enterprise briefs;
- short and long source collections;
- missing critical decisions;
- contradictions and duplicate statements;
- prompt injection inside source documents;
- vague acceptance criteria;
- cross-ticket dependencies;
- Jira and Trello field-mapping cases;
- malformed and incomplete model responses;
- known good and known bad tickets reviewed by humans;
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

Production customer content shall not enter a shared evaluation set without a lawful basis, explicit policy, de-identification, and access controls.

### 7.3 Launch quality gates

These are release targets, not claims about the current prototype:

| Metric | Launch target |
|---|---:|
| Schema-valid persisted AI output | 100% |
| Valid source references for grounded claims | 100% |
| Fabricated source quotations in evaluation set | 0 |
| Required work-item field completeness | at least 98% |
| Duplicate external creation under retry tests | 0 |
| Critical deterministic validation bypasses | 0 |
| Human acceptance without material rewrite | at least 90% on the approved launch dataset |
| Approved-requirement coverage by backlog | at least 95%, with every omission explicitly identified |
| Required Engineering Plan lifecycle-domain coverage | 100% |
| Approved business outcomes and experience-relevant requirements mapped to journeys/screens or explicitly marked not applicable | 100% |
| Required critical-flow state and reachable-transition coverage | 100% |
| Silent canonical graph mutations caused by design edits | 0 |
| Deterministic design-quality failures bypassed by semantic review | 0 |
| Unsupported standards or vendor-reference IDs in persisted AI output | 0 |
| Fabricated certification, test, scan, performance, availability, deployment, or cost claims | 0 |

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
- Artifact, WorkItem, WorkItemVersion, Approval
- ConnectorInstallation, FieldMapping, Publication, PublicationItem, WebhookEvent
- ModelProvider, ModelDefinition, ModelPolicy, PromptVersion, AgentWorkflowVersion
- AgentRun, ModelCall, ToolCall, EvaluationDataset, EvaluationCase, EvaluationRun
- RepositoryAuthorization, ExternalAgentRun, VerificationRun, Evidence
- TraceLink and AuditEvent

### 8.3 Data integrity

- Customer-scoped tables shall include organization ownership.
- Referential integrity shall be enforced in PostgreSQL where practical.
- External side effects shall use idempotency keys and transactional outbox records.
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
            -> Connector adapters -> Jira / Trello
       -> Node.js worker container on ECS Fargate
            -> durable job adapter -> SQS
            -> verification runner -> approved workspace
  -> CloudWatch / OpenTelemetry-compatible telemetry
```

### 9.2 Application structure

The product shall use three repository boundaries:

- `axiom-web`: Next.js user interface, server rendering, session integration, and thin browser-specific Backend-for-Frontend behavior;
- `axiom-platform`: Node.js TypeScript API, background worker, domain modules, application services, database access, Agent Kernel, and connector adapters;
- `axiom-infrastructure`: Terraform configurations, reusable infrastructure modules, environment composition, and infrastructure delivery controls.

The platform repository shall remain one modular monolith with independently testable modules:

- identity and organizations;
- projects and canonical graph;
- requirements and clarification;
- business discovery and experience design;
- architecture and artifacts;
- work-item quality;
- agent kernel and model providers;
- connectors;
- billing and usage;
- execution and verification;
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
- Next.js route handlers shall be limited to browser-specific BFF needs such as session exchange, callback handling, same-origin proxying, and response shaping. They shall not own domain rules, persistence, long-running workflows, connector publication, or billing decisions.
- The web repository shall consume a generated client from the reviewed OpenAPI contract. Cross-repository API changes shall pass compatibility checks before release.

### 9.4 Containers and orchestration

- Docker images shall be reproducible, minimally privileged, scanned, and immutable per release.
- Docker Compose shall run the local web, API, worker, PostgreSQL, and required local dependencies.
- AWS ECS Fargate is the launch orchestrator.
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
| NFR-SEC-005 | Source content and connector payloads shall be treated as untrusted and potentially prompt-injecting. | Launch |
| NFR-SEC-006 | Dependency, container, secret, and static analysis shall run in CI with an owned remediation policy. | Launch |
| NFR-SEC-007 | Production access and security-sensitive changes shall be audited. | Launch |
| NFR-PRIV-001 | Customers shall be told which provider receives their data and under which retention policy. | Launch |
| NFR-PRIV-002 | Provider selection shall respect organization data-region and data-processing policy. | Next |
| NFR-PRIV-003 | Retention and deletion jobs shall be testable and produce auditable evidence. | Launch |

### 10.2 Reliability

| ID | Requirement | Priority |
|---|---|---:|
| NFR-REL-001 | A failed model, connector, or tool operation shall not overwrite the last valid graph or approval. | Launch |
| NFR-REL-002 | External side effects shall use bounded retries, exponential backoff, idempotency, and dead-letter handling. | Launch |
| NFR-REL-003 | Database backups and restore procedures shall be configured and restore-tested before general availability. | Launch |
| NFR-REL-004 | Customer-visible operations shall expose honest queued, running, succeeded, partially failed, failed, and cancelled states. | Launch |
| NFR-REL-005 | Production availability targets and recovery objectives shall be published per commercial plan before sale. | Launch |

### 10.3 Performance and scale

| ID | Requirement | Priority |
|---|---|---:|
| NFR-PERF-001 | Non-AI API reads shall target p95 below 500 ms under the documented launch load profile. | Launch |
| NFR-PERF-002 | Long AI and connector operations shall acknowledge with a durable run ID within 2 seconds. | Launch |
| NFR-PERF-003 | Every performance claim shall identify environment, dataset, concurrency, duration, and measured evidence. | Launch |
| NFR-PERF-004 | Load limits shall be established through repeatable tests before general availability. | Launch |

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

### 10.6 Observability and cost

| ID | Requirement | Priority |
|---|---|---:|
| NFR-OBS-001 | Logs, metrics, and traces shall share request, organization, project, and run correlation IDs without leaking content. | Launch |
| NFR-OBS-002 | Model calls shall record latency, token usage, cache usage, retries, provider status, and cost. | Launch |
| NFR-OBS-003 | Connector calls shall record provider request IDs, rate-limit state, retries, and outcomes. | Launch |
| NFR-COST-001 | Launch shall use hosted inference and shall not require reserved GPUs. | Launch |
| NFR-COST-002 | Model routing, context selection, output limits, caching, and batch/flex execution shall be evaluated as cost controls. | Launch |
| NFR-COST-003 | Budgets and alerts shall exist for AWS infrastructure and each model provider before production launch. | Launch |

## 11. Verification strategy

### 11.1 Required automated layers

- Domain unit tests for truth transitions, stable IDs, scoring, policies, budget reservations, and mappings.
- Repository integration tests against PostgreSQL.
- Contract tests for model providers, Jira, Trello, subscription webhooks, and coding-agent adapters.
- AI evaluation tests using immutable datasets and stored results.
- Experience Studio unit and browser tests for editing, keyboard operation, revisions, prototype transitions, stale baselines, responsive variants, traceability, and deterministic design-quality gates.
- Tenant-isolation and authorization tests.
- Idempotency, retry, partial-failure, webhook replay, and outbox tests.
- E2E tests for source-to-approved-Experience-Baseline, source-to-approved-ticket, and Jira/Trello publication journeys.
- Backup restoration, migration, and rollback exercises before general availability.
- Security, accessibility, and load evidence appropriate to each release.

### 11.2 Evidence rules

A requirement is complete only when its visible behavior, validation, failure states, authorization, auditability, and relevant automated evidence exist. Generated explanations do not satisfy verification requirements.

## 12. Commercial launch acceptance criteria

The first commercial release is accepted only when all of the following are evidenced:

- [ ] PostgreSQL is the authoritative store locally and in the production architecture.
- [ ] Organization-scoped authentication and authorization pass tenant-isolation tests.
- [ ] Source ingestion and exact-span grounding work for supported launch formats.
- [ ] Ticket generation passes the Section 7 quality gates on the approved dataset.
- [ ] Critical unknowns produce clarification questions rather than invented answers.
- [ ] Business outcomes, actors, operating workflows, and success measures are grounded or explicitly marked as suggestions or unknowns.
- [ ] Experience-relevant approved requirements are covered by an exact approved Experience Baseline with no unresolved blocker or silent graph mutation.
- [ ] The Experience Studio passes editing, revision, prototype-flow, required-state, responsive, traceability, authorization, accessibility, and stale-baseline tests.
- [ ] Jira and Trello each pass sandbox/tenant contract tests, idempotency tests, and partial-failure tests.
- [ ] No Jira-style or Trello-style work-management board exists in Axiom.
- [ ] Groq and OpenAI adapters are evaluated, budgeted, observable, and independently disableable.
- [ ] Economy/Balanced/Best routing cannot exceed organization limits.
- [ ] Subscription, entitlement, reservation, and usage ledgers reconcile in test scenarios.
- [ ] External writes require explicit approval and produce audit records.
- [ ] Fixed verification produces real evidence and preserves failures honestly.
- [ ] Docker-based local setup works from a clean checkout.
- [ ] AWS deployment artifacts target ECS Fargate, RDS PostgreSQL, S3, and SQS; no Vercel deployment path is active.
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

### Milestone D — Ticket Quality Engine

- Agent Kernel, prompt/schema versioning, model catalog, evaluation harness.
- Grounded work-item generation, deterministic validators, review feedback.
- Groq and OpenAI qualification.

### Milestone E — Jira and Trello

- OAuth installations and field mapping.
- Exact preview, approval, idempotent publication, reconciliation, status refresh.

### Milestone F — AWS private beta

- Docker release images, ECS Fargate, RDS PostgreSQL, S3, SQS, telemetry, secrets, backups, alerts.
- Staging, production migration, rollback, security, accessibility, and load evidence.

### Milestone G — Agent execution ecosystem

- Customer-authorized repository boundary.
- Native and external coding-agent adapters.
- Controlled verification and imported PR/evidence lifecycle.

## 14. Migration from the hackathon prototype

1. Preserve current domain concepts that uphold canonical truth, stable IDs, validation, traceability, approval, and evidence integrity.
2. Replace filesystem/Blob persistence with PostgreSQL repositories and S3 object references.
3. Treat existing Vercel code as legacy infrastructure; do not deploy it and remove it after AWS replacements and migration tests exist.
4. Replace internal Jira credentials with organization installations and add Trello.
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
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [NIST AI Risk Management Framework and Generative AI Profile](https://www.nist.gov/itl/ai-risk-management-framework)
- [NIST Secure Software Development Framework SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final)
- [OWASP Artificial Intelligence Security Verification Standard](https://owasp.org/www-project-artificial-intelligence-security-verification-standard-aisvs-docs/)
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)
- [AWS SaaS Lens](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html)
- [AWS Agentic AI Lens](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentic-ai-lens.html)
- [PostgreSQL documentation](https://www.postgresql.org/docs/)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [OpenTelemetry specifications](https://opentelemetry.io/docs/specs/)

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
10. Operational documentation, migrations, and rollback instructions are current.

## 17. Active decision register

This section is the authoritative decision register. Historical prototype choices that conflict with it are superseded and shall not guide implementation.

| ID | Active decision | Consequence |
|---|---|---|
| DR-001 | Axiom is a commercial AI Engineering Operating System, not a hackathon submission or generic chatbot. | Commercial security, tenancy, evidence, quality, and operability gates are mandatory. |
| DR-002 | The canonical project graph in PostgreSQL is authoritative. | Documents, designs, tickets, connectors, and agent packets are versioned views or synchronized copies. |
| DR-003 | Business Discovery and an applicable approved Experience Baseline precede architecture and delivery scope. | Downstream generation shall fail closed when the compatible current baseline is absent, stale, rejected, or unresolved. |
| DR-004 | Non-visual scope requires an explicit approved `NOT_APPLICABLE` decision. | Axiom shall neither invent screens nor silently skip experience governance. |
| DR-005 | The Experience Studio is a structured governed product-design editor, not a general-purpose Figma replacement. | Build the traceable journey/screen/state model and deterministic quality gates before advanced canvas capabilities. |
| DR-006 | Next.js owns presentation and thin browser-specific BFF behavior; NestJS/Fastify owns the authoritative API and business rules. | New commercial domain logic shall not be added to Next.js route handlers. |
| DR-007 | The platform begins as a Node.js TypeScript modular monolith. | Network services require measured extraction triggers, an owned contract, and an update to this register. |
| DR-008 | PostgreSQL is the commercial source of truth; local development uses Docker PostgreSQL and production targets Amazon RDS PostgreSQL. | Filesystem and Blob stores are migration adapters, not commercial authority. |
| DR-009 | AWS ECS Fargate is the initial production orchestrator; Kubernetes is later scope and Vercel deployment is prohibited. | No cloud deployment or billable resource may be created without explicit user authorization. |
| DR-010 | Model, billing, connector, storage, subscription, and coding-agent providers remain behind interfaces. | OpenAI and Groq remain disabled until task-specific evaluation, pricing, data-policy, region, and budget gates pass. |
| DR-011 | External writes require exact preview, explicit approval, idempotency, provider-result recording, reconciliation, and audit. | Jira, Trello, repository, agent, billing, and deployment side effects fail closed. |
| DR-012 | Exact measured evidence cannot be replaced by model prose. | Failed or unexecuted operations remain `FAILED` or `UNKNOWN`; customer content never silently enters shared training or evaluation data. |
| DR-013 | Repository product documentation has one authority: this SRS. | `AGENTS.md` contains working rules, `README.md` contains local operation, and neither duplicates product scope or roadmap. |

## 18. Current implementation ledger

This ledger records the honest repository state at SRS 3.1. A capability is not commercially complete merely because a deterministic fixture or prototype screen exists.

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
| Work items | Partial | Connector-neutral hierarchy, deterministic quality gates, immutable versions, exact human review, retry safety, and the current Business Context/Experience fail-closed gate exist. The web visibly blocks generation and acceptance while preserving rejection; Experience Baseline coverage, semantic review, and connectors remain open. |
| Model catalog, Agent Kernel, and cost controls | Partial | Provider-neutral contracts, local fixtures, model lifecycle, run/call evidence, reservations, balances, and scoped budgets exist. Hosted execution remains disabled and unqualified. |
| Jira and Trello | Not commercially implemented | Prototype Jira behavior is migration input; commercial OAuth/installations, mappings, outbox publication, reconciliation, webhooks, and Trello are open. |
| Security, privacy, and operability | Not launch-ready | ASVS/API mapping, scans, retention/deletion jobs, SLOs, runbooks, backup restore, WCAG review, and incident evidence remain open. |
| AWS private beta | Not started | Terraform environments, ECS/RDS/S3/SQS, observability, secrets, migration, rollback, and disaster-recovery evidence remain open. |
| Coding-agent ecosystem | Prototype only | Controlled local fixture generation and verification exist; repository authorization, coding profiles, sandboxed adapters, PR lifecycle, and commercial evidence import remain open. |

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
- [ ] Qualify OpenAI and Groq per task with immutable evaluation, verified price/data/region policy, budgets, cancellation, retry, and measured usage evidence.
- [ ] Implement Jira and Trello installations, mappings, exact previews, transactional outbox publication, idempotency, reconciliation, rate limits, authenticated webhooks, partial failures, and audit.
- [ ] Implement production identity, MFA, organization lifecycle, retention, export, deletion, and legal-hold extension points.

### P4 — Commercial hardening and AWS private beta

- [ ] Map controls to OWASP ASVS and API risks; add owned secret, dependency, static, container, tenant-isolation, accessibility, load, and penetration-test gates.
- [ ] Establish SLOs, telemetry, incident roles, runbooks, backups, restoration, disaster recovery, and cost alerts.
- [ ] Build reviewed Terraform for AWS environments using ECS Fargate, RDS PostgreSQL, S3, SQS, approved secrets, least privilege, and rollback-safe migrations.
- [ ] Execute staging migration, rollback, backup restoration, security, accessibility, load, and cost evidence before any production tenant.

### P5 — Controlled coding-agent ecosystem

- [ ] Add organization/project/repository coding profiles, authorization, branch and path policies, dependency/license controls, and approved verification commands.
- [ ] Implement sandboxed native and external coding-agent adapters with bounded task packets, secrets, filesystem access, timeouts, cancellation, concurrency, and output.
- [ ] Require exact previews and approvals before branch, commit, push, or pull-request effects; import only real provider IDs, checks, diffs, and verification evidence.

## 20. SRS change log

| Version | Date | Change |
|---|---|---|
| 3.1 | 2026-08-04 | Recorded P0 documentation consolidation, the first local platform baseline commit, local migration and rollback evidence, repaired local billing provisioning, fail-closed Business Context enforcement across architecture/plans/work items, visible backlog gating, browser evidence, and unresolved product/delivery flags. |
| 3.0 | 2026-08-04 | Consolidated active product decisions, implementation status, and roadmap into the master SRS; expanded structured business discovery; made Business Context and applicable Experience Baseline enforcement the first P0 lifecycle gate; superseded separate repository product ADRs, implementation notes, and backlog. |
| 2.2 | 2026-08-03 | Added business-first discovery and governed Experience Baseline requirements. |
| 2.1 | 2026-07-20 | Established the commercial platform contract and migration from the prototype. |
