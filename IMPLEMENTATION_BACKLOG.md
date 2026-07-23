# Axiom Commercial Implementation Backlog

This backlog implements `SRS.md` in dependency order. Do not begin a later milestone while the current milestone’s required gates fail. Preserve the working prototype while replacing its hackathon-only infrastructure through tested migrations.

## Existing foundation to preserve

- Canonical graph, source grounding, truth statuses, stable IDs, and deterministic readiness.
- Document and architecture review with explicit approvals.
- Controlled generation, fixed-command verification, evidence, traceability, and grounded Why answers.
- Provider, storage, connector, runner, and domain boundaries that already isolate infrastructure.

Existing filesystem storage, Vercel adapters, single-workspace integration credentials, fixture assumptions, and Groq-only configuration are migration targets rather than commercial architecture.

## Milestone 0 — Contract and baseline

### Outcome

The repository follows the commercial SRS and has a measured, reproducible local baseline before data or identity changes.

- [x] Replace the hackathon SRS with the commercial product contract.
- [x] Align `AGENTS.md` and this backlog with commercial decisions.
- [x] Remove obsolete hackathon prompts, duplicate specifications, demo scripts, and one-time handoff/audit documents.
- [x] Inventory current persistence, integrations, routes, and customer-data boundaries. Evidence: `docs/implementation/commercial-migration-baseline.md`.
- [x] Record current lint, typecheck, unit, E2E, build, and sandbox results. Evidence: `docs/implementation/commercial-migration-baseline.md`.
- [x] Add an ADR for commercial platform, persistence, connector, and AI-provider boundaries. Evidence: `docs/decisions/0010-commercial-platform-boundaries.md`.
- [x] Document current-to-target migration risks and rollback checkpoints. Evidence: `docs/implementation/commercial-migration-baseline.md`.

### Exit criteria

- No active documentation instructs contributors to deploy to Vercel or optimize for a hackathon.
- The local application remains runnable.
- Baseline verification evidence is recorded without changing production state.

## Milestone 1 — PostgreSQL foundation

### Outcome

PostgreSQL becomes the authoritative commercial store locally, with a safe migration path from current prototype data.

- [x] Add Docker Compose for application dependencies and PostgreSQL.
- [x] Select and document the typed migration/data-access layer. Evidence: `docs/decisions/0011-postgresql-data-access-and-migration.md`.
- [x] Design organization-scoped normalized tables from the SRS data model.
- [x] Implement migrations, constraints, indexes, timestamps, explicit ranked order, and optimistic concurrency.
- [x] Introduce repository interfaces and PostgreSQL implementations.
- [x] Add transactional outbox and idempotency records for future external writes.
- [x] Build a one-time prototype-data importer with dry-run, apply, and parity-validation modes.
- [x] Preserve stable graph IDs, versions, hashes, approvals, trace links, and ranked aggregate order.
- [x] Add PostgreSQL integration tests and migration rollback/forward tests.
- [x] Add local database setup, migrate, seed, test, import, verify, and reset commands. Evidence: `docs/implementation/postgresql-foundation.md`.

### Exit criteria

- A clean checkout can start PostgreSQL and the app locally.
- Existing representative projects migrate without losing valid provenance.
- Organization-scoped repository integration tests pass.
- Filesystem and SQLite-like stores are not the authoritative commercial path.

## Milestone 1.5 — Repository and API boundary

### Outcome

The commercial web, platform, and infrastructure responsibilities have independent repositories, while the prototype remains runnable during contract-tested migration.

- [x] Record the web/platform/infrastructure split and Node.js backend decision. Evidence: `docs/decisions/0012-web-platform-infrastructure-repository-split.md`.
- [x] Establish `axiom-platform` and `axiom-infrastructure` as independent local Git repositories; retain this repository as the runnable `axiom-web` migration source.
- [ ] Complete the frontend extraction and rename or replace this repository with the final `axiom-web` repository after migrated flows have parity evidence.
- [x] Scaffold the Node.js TypeScript platform using NestJS with Fastify in strict mode.
- [x] Add a versioned `/api/v1` foundation, stable error envelope, request correlation, and generated OpenAPI contract.
- [ ] Add a separately runnable worker process without duplicating domain logic.
- [x] Add lint, typecheck, contract, build, and local start commands to the platform repository.
- [x] Document the current route-to-platform migration order and rollback checkpoints. Evidence: `docs/implementation/repository-split-foundation.md`.
- [ ] Move one bounded vertical slice at a time and replace frontend domain imports with reviewed API contracts.
- [x] Move organization-scoped project metadata list/detail reads behind the platform API and thin web BFF. Evidence: `docs/implementation/organization-scoped-project-reads.md`.
- [x] Move project creation behind the platform API with scoped workspace validation, role authorization, idempotent transactional persistence, immutable audit evidence, and a retry-safe web flow. Evidence: `docs/implementation/organization-scoped-project-creation.md`.
- [x] Move recoverable project archive/restore behind the platform API with `If-Match`, preserved lifecycle state, row locking, immutable audit evidence, and guarded migration rollback. Evidence: `docs/implementation/project-archive-restore.md`.
- [x] Move human clarification answers behind the platform API with tenant authorization, ETags, idempotency, immutable graph versioning, stable IDs, human provenance, audit redaction, and stale-backlog review invalidation. Evidence: `docs/decisions/0021-versioned-human-clarification-mutations.md` and `docs/implementation/commercial-clarification-answers.md`.
- [x] Add ignore rules and a repository policy check preventing Terraform state, plans, credentials, keys, and environment secrets from version control.
- [ ] Remove each migrated Next.js business route only after replacement contract and end-to-end tests pass.

### Exit criteria

- Next.js owns presentation and thin browser-specific BFF behavior only.
- The Node.js platform owns business APIs, workers, persistence, AI orchestration, and connector side effects.
- The web consumes a reviewed OpenAPI contract rather than importing platform domain code.
- Local development starts without Vercel, AWS, or any paid cloud resource.

## Milestone 2 — Identity, organizations, and audit

### Outcome

Multiple organizations can use Axiom without crossing data or authority boundaries.

- [ ] Implement the isolated authentication adapter and secure sessions.
- [x] Add the PostgreSQL user, membership, opaque-session, and immutable-audit foundation. Evidence: `docs/decisions/0013-opaque-sessions-authorization-and-audit.md` and `docs/implementation/identity-organization-audit-foundation.md`.
- [x] Add the local-only web/BFF session handoff and current-user organization bootstrap without exposing the opaque credential to browser JavaScript. Evidence: `docs/implementation/web-bff-session-foundation.md`.
- [x] Add a global deny-by-default platform guard with explicit public and permission metadata.
- [x] Prove one organization-scoped API permits an active member and rejects anonymous, expired, revoked, and cross-tenant access.
- [ ] Implement Organization, Membership, Role, and invitation flows.
- [x] Implement the bounded member-list and invitation create/list/revoke/accept governance slice with owner/administrator authorization, hash-only deterministic tokens, local-only manual delivery, idempotency, ETags, row locking, tenant isolation, and immutable audit evidence. Production IdP, email delivery, role changes, removal, ownership transfer, and MFA remain open. Evidence: `docs/implementation/organization-membership-invitations.md`.
- [ ] Add server-side authorization policies and deny-by-default behavior.
- [ ] Require organization scope in shared repositories and application services.
- [x] Require organization scope in the migrated project metadata repository and service, with repository-level and API-level tenant-isolation tests. Evidence: `docs/implementation/organization-scoped-project-reads.md`.
- [x] Require organization scope and explicit create permission for migrated project creation, with cross-tenant, idempotency, rollback, and audit integration tests. Evidence: `docs/implementation/organization-scoped-project-creation.md`.
- [ ] Add owner, administrator, contributor, reviewer, and viewer permissions.
- [x] Implement database-enforced immutable audit events for the current platform security-sensitive actions; extend action coverage with each new workflow.
- [x] Add recoverable project archive and restore for owners and administrators, including stale-write, concurrency, tenant-isolation, and audit tests. Evidence: `docs/implementation/project-archive-restore.md`.
- [ ] Add organization lifecycle plus project/organization retention and explicit deletion workflows.
- [ ] Add tenant-isolation, role, session, and destructive-action tests.
- [ ] Add MFA requirement for organization owners before general availability.

### Exit criteria

- Cross-organization access tests fail closed across APIs and repositories.
- Security-sensitive actions are authorized and audited.
- Organization deletion follows a recoverable, tested lifecycle.

## Milestone 3 — Subscription, entitlements, and cost ledger

### Outcome

AI and product usage cannot exceed an organization’s approved plan or budget.

- [x] Implement Plan, Subscription, Entitlement, UsageReservation, and UsageLedgerEntry. Evidence: `docs/implementation/subscription-entitlement-cost-ledger.md`.
- [x] Establish the provider-neutral subscription adapter and deterministic local fixture. Evidence: `docs/implementation/subscription-webhook-foundation.md`.
- [ ] Integrate the selected subscription provider behind an adapter.
- [x] Authenticate, deduplicate, and replay-test the provider-neutral webhook inbox with a local fixture. Repeat the contract suite for the selected commercial provider. Evidence: `docs/implementation/subscription-webhook-foundation.md`.
- [x] Implement product credits while retaining raw provider usage and effective cost. Evidence: `docs/implementation/subscription-entitlement-cost-ledger.md`.
- [x] Attribute usage to organization, project, user, workflow, provider, model, and run. Evidence: `docs/implementation/subscription-entitlement-cost-ledger.md`.
- [x] Reserve estimated cost before work and reconcile actual cost afterward. Evidence: `docs/implementation/subscription-entitlement-cost-ledger.md`.
- [x] Enforce per-request, daily, billing-period, user, project, and organization hard limits. Evidence: `docs/implementation/scoped-budget-controls.md`.
- [x] Add alert thresholds, exhausted-budget states, and owner/administrator controls. Evidence: `docs/implementation/scoped-budget-controls.md`.
- [x] Record retries, fallbacks, failures, cancellation, caching, and tool charges. Evidence: `docs/implementation/subscription-entitlement-cost-ledger.md`.
- [x] Add reconciliation, concurrency, overrun, and provider-neutral webhook tests. Evidence: `docs/implementation/subscription-entitlement-cost-ledger.md`, `docs/implementation/scoped-budget-controls.md`, and `docs/implementation/subscription-webhook-foundation.md`.

### Exit criteria

- No chargeable workflow starts without entitlement and budget reservation.
- Ledger and subscription test scenarios reconcile.
- Background workflows cannot exceed their reservation silently.

## Milestone 4 — Agent Kernel and model catalog

### Outcome

Axiom owns a provider-neutral, measurable, budget-aware agent runtime.

- [x] Define provider-neutral generation, structured-output, tool, usage, and error contracts with a deterministic non-billable local fixture. Evidence: `docs/decisions/0018-provider-neutral-generation-and-model-catalog.md` and `docs/implementation/model-catalog-foundation.md`.
- [ ] Implement the Agent Kernel: context builder, policy engine, router, tool registry, validator, budget guard, trace writer, and evidence writer.
- [x] Route the first bounded `ticket-generation` workflow through shared context assembly, three-tier policy resolution, an empty tool allowlist, structured/deterministic validation, fail-closed hosted-budget policy, immutable AgentRun/ModelCall evidence, and the local fixture adapter. Chargeable reservation/reconciliation and the remaining logical workflows are still open. Evidence: `docs/decisions/0019-agent-kernel-ticket-generation-run-evidence.md` and `docs/implementation/agent-kernel-ticket-generation.md`.
- [ ] Convert logical agents into versioned workflows rather than separate services.
- [x] Implement the PostgreSQL model-catalog foundation for lifecycle, capability, pricing status, context limits, data policy, regions, and evaluation state. OpenAI and Groq remain disabled candidates until qualification. Evidence: `docs/implementation/model-catalog-foundation.md`.
- [x] Implement organization-scoped Economy, Balanced, and Best policy reads with the safe local fixture; administrator mutation and Agent Kernel routing remain open. Evidence: `docs/implementation/model-catalog-foundation.md`.
- [ ] Adapt existing Groq support to the new contract.
- [ ] Add an OpenAI provider through the same contract.
- [ ] Add bounded retry, repair, fallback, cancellation, and circuit-breaker behavior.
- [ ] Encrypt eligible customer-provided provider credentials.
- [ ] Record prompt, schema, workflow, provider, model, latency, token, cache, and cost provenance.
- [x] Record immutable prompt, schema, evaluator, workflow, model-policy, provider, model, attempt, latency, and measured-or-not-applicable usage provenance for the ticket-generation fixture path. Hosted token/cache/cost evidence remains open. Evidence: `docs/implementation/agent-kernel-ticket-generation.md`.
- [x] Add the first provider contract suite and deterministic fixture without paid APIs; hosted provider adapter suites remain required when those adapters are added. Evidence: `docs/implementation/model-catalog-foundation.md`.

### Exit criteria

- Groq and OpenAI can be enabled or disabled independently.
- Provider failures cannot corrupt the graph or exceed the budget.
- Domain code has no provider SDK dependency.
- No launch path requires an Axiom-owned GPU.

## Milestone 5 — Ticket Quality Engine

### Outcome

Axiom produces grounded, complete, testable work items that pass measurable quality gates.

- [x] Add the bounded Ticket Quality Foundation: connector-neutral Agile `WorkItem v1`, deterministic hierarchy/grounding/coverage/testability/overlap/dependency/clarification/evidence-claim gates, seven curated local evaluation cases, and `pnpm eval:tickets`. The corpus remains `AWAITING_HUMAN_REVIEW`, and persistence, generation, semantic review, approval, and connector compilation remain open. Evidence: `docs/implementation/ticket-quality-foundation.md`.

- [x] Finalize normalized `WorkItem v1` and immutable PostgreSQL `WorkItemVersion` persistence. Evidence: `docs/implementation/work-item-generation-preview.md`.
- [x] Implement bounded context selection from the current document-approved and architecture-approved graph version, excluding unsupported/unknown entities and blocking open critical gaps. Evidence: `docs/implementation/work-item-generation-preview.md`.
- [x] Generate hierarchy, scope, out-of-scope, context, acceptance criteria, dependencies, risks, open questions, evidence expectations, and source links through the bounded Agent Kernel fixture workflow. Hosted-model qualification remains open. Evidence: `docs/implementation/agent-kernel-ticket-generation.md`.
- [x] Reject invalid, incomplete, ungrounded, or untestable fixture output deterministically before persistence. Provider-generated output must use the same gate when added. Evidence: `docs/implementation/ticket-quality-foundation.md` and `docs/implementation/work-item-generation-preview.md`.
- [x] Implement deterministic requirement coverage, overlap, duplicate, contradiction, and orphan checks. Contradictions are blocked from generation and acceptance; coverage, overlap, duplicate IDs, and unjustified work are enforced by `ticket-quality-v1`. Evidence: `docs/decisions/0020-critical-unknown-ticket-generation-gate.md` and `docs/implementation/ticket-clarification-gate.md`.
- [x] Implement critical-unknown clarification gates before Agent Kernel execution, at persistence, and at backlog acceptance, with exact stored clarification guidance in the web flow. Evidence: `docs/decisions/0020-critical-unknown-ticket-generation-gate.md` and `docs/implementation/ticket-clarification-gate.md`.
- [x] Implement the authorized commercial answer path for a stored blocking clarification, creating a human-confirmed graph version and preserving prior approvals and drafts as historical evidence. Downstream document and architecture regeneration remain separate workflows. Evidence: `docs/decisions/0021-versioned-human-clarification-mutations.md` and `docs/implementation/commercial-clarification-answers.md`.
- [ ] Add an optional independent semantic review stage behind policy.
- [x] Implement exact immutable review previews and categorized accept, accept-with-edits, and reject feedback with ETags, idempotency, edited WorkItem versions, deterministic revalidation, organization authorization, and audit evidence. Evidence: `docs/implementation/work-item-human-review.md`.
- [ ] Version prompts, schemas, rubrics, policies, and generations.
- [ ] Build the launch evaluation dataset with reviewed good, bad, contradictory, incomplete, and adversarial cases.
- [ ] Implement evaluation runs, comparison reports, thresholds, and model promotion rules.
- [ ] Record human acceptance and material-rewrite metrics.

### Exit criteria

- All Section 7 SRS launch quality gates pass on the approved dataset.
- Every rejected generation has an actionable reason.
- A cheaper model is promoted only when task-specific evidence supports it.

## Milestone 6 — Jira commercial connector

### Outcome

Organizations can safely publish approved work to Jira without Axiom becoming a Jira clone.

- [ ] Replace shared static credentials with organization-scoped authorization.
- [ ] Discover projects, issue types, hierarchy, fields, permissions, and limits.
- [ ] Implement versioned field mappings including custom fields.
- [ ] Show the exact immutable preview and require explicit confirmation.
- [ ] Publish hierarchy idempotently using transactional outbox records.
- [ ] Store external keys, URLs, provider request IDs, versions, and outcomes.
- [ ] Handle rate limits, bounded retries, partial success, and reconciliation.
- [ ] Implement read-only status refresh for launch.
- [ ] Add sandbox/tenant contract tests, idempotency tests, and failure fixtures.

### Exit criteria

- Retrying the same approved plan never duplicates Jira issues.
- Partial failures can be reconciled without recreating successful issues.
- No Axiom screen behaves as a general-purpose project board.

## Milestone 7 — Trello commercial connector

### Outcome

Organizations can choose Trello instead of or alongside Jira.

- [ ] Implement organization-scoped Trello authorization.
- [ ] Discover workspaces, boards, lists, members, labels, and custom fields.
- [ ] Map normalized work items to cards, descriptions, checklists, labels, and relationships.
- [ ] Show the exact immutable preview and require explicit confirmation.
- [ ] Publish idempotently with transactional outbox records.
- [ ] Store card IDs, URLs, mapping version, request IDs, and outcomes.
- [ ] Handle rate limits, partial success, reconciliation, and read-only status refresh.
- [ ] Add sandbox/tenant contract tests, idempotency tests, and failure fixtures.

### Exit criteria

- A project can choose Jira, Trello, both, or neither according to policy.
- Trello retries cannot create duplicate cards.
- Provider-specific limits do not weaken the normalized Axiom work-item contract.

## Milestone 8 — Commercial security, privacy, and operability

### Outcome

The product has evidence-backed controls suitable for a private commercial beta.

- [ ] Map launch controls to OWASP ASVS and relevant API risks.
- [ ] Add secret, dependency, static, and container scanning with owned severity policy.
- [ ] Implement secure secret storage and redaction tests.
- [ ] Implement retention jobs, deletion evidence, and legal-hold extension points.
- [ ] Add structured logs, metrics, and traces with correlation and tenant-safe attributes.
- [ ] Define operational dashboards and alerts for failures, queues, budgets, connectors, and providers.
- [ ] Establish SLOs, incident roles, runbooks, backup policy, and tested restoration.
- [ ] Complete WCAG 2.2 AA-targeted automated, keyboard, and human review of launch journeys.
- [ ] Run documented load tests and publish bounded capacity assumptions.

### Exit criteria

- Security, privacy, accessibility, recovery, and load claims have real evidence.
- Logs and traces do not leak source content, credentials, or cross-tenant identifiers.
- Backup restoration succeeds in a non-production environment.

## Milestone 9 — AWS private beta

### Outcome

Axiom can run as a controlled AWS private beta without Vercel or Kubernetes.

- [ ] Create reproducible, minimally privileged Docker images.
- [ ] Provision infrastructure through reviewed infrastructure-as-code only after explicit authorization.
- [ ] Use ECS Fargate, RDS PostgreSQL, S3, SQS, managed secrets, and CloudWatch/OpenTelemetry-compatible telemetry.
- [ ] Configure networking, TLS, encryption, backups, health checks, autoscaling, and cost budgets.
- [ ] Establish development, staging, and production promotion gates.
- [ ] Test migrations, rollback, restore, failure recovery, and deployment health.
- [ ] Record infrastructure and provider cost assumptions and alerts.
- [ ] Remove Vercel runtime dependencies only after equivalent local/AWS behavior is verified.

### Exit criteria

- The AWS private-beta acceptance checklist passes.
- No Vercel deployment path is active.
- No Kubernetes cluster or GPU reservation is required.
- Deployment, rollback, restore, and cost evidence is recorded.

## Milestone 10 — Coding-agent ecosystem

### Outcome

Approved work can be handed to native or external coding agents without weakening governance.

- [ ] Define the external coding-agent adapter and run lifecycle.
- [ ] Implement export-only and customer-account handoff first.
- [ ] Add repository authorization, branch policy, workspace, and path boundaries.
- [ ] Integrate selected Codex, GitHub Copilot, or Devin paths only where supported and commercially justified.
- [ ] Import run, pull-request, patch, and artifact references.
- [ ] Keep all imported claims unverified until Axiom verification executes.
- [ ] Add cancellation, timeout, cost, audit, and failure-state tests.

### Exit criteria

- External agents cannot access unapproved organization context or credentials.
- Axiom can trace an approved work item to external execution and real verification evidence.
- Customer-owned external-agent costs remain separate unless a commercial plan explicitly includes them.
