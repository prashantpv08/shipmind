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
- [ ] Inventory current persistence, integrations, routes, and customer-data boundaries.
- [ ] Record current lint, typecheck, unit, E2E, build, and sandbox results.
- [ ] Add an ADR for commercial platform, persistence, connector, and AI-provider boundaries.
- [ ] Document current-to-target migration risks and rollback checkpoints.

### Exit criteria

- No active documentation instructs contributors to deploy to Vercel or optimize for a hackathon.
- The local application remains runnable.
- Baseline verification evidence is recorded without changing production state.

## Milestone 1 — PostgreSQL foundation

### Outcome

PostgreSQL becomes the authoritative commercial store locally, with a safe migration path from current prototype data.

- [ ] Add Docker Compose for application dependencies and PostgreSQL.
- [ ] Select and document the typed migration/data-access layer.
- [ ] Design organization-scoped normalized tables from the SRS data model.
- [ ] Implement migrations, constraints, indexes, timestamps, and optimistic concurrency.
- [ ] Introduce repository interfaces and PostgreSQL implementations.
- [ ] Add transactional outbox and idempotency records for future external writes.
- [ ] Build a one-time prototype-data importer with dry-run and validation modes.
- [ ] Preserve stable graph IDs, versions, hashes, approvals, and trace links.
- [ ] Add PostgreSQL integration tests and migration rollback/forward tests.
- [ ] Add local database setup, migrate, seed, test, and reset commands.

### Exit criteria

- A clean checkout can start PostgreSQL and the app locally.
- Existing representative projects migrate without losing valid provenance.
- Organization-scoped repository integration tests pass.
- Filesystem and SQLite-like stores are not the authoritative commercial path.

## Milestone 2 — Identity, organizations, and audit

### Outcome

Multiple organizations can use Axiom without crossing data or authority boundaries.

- [ ] Implement the isolated authentication adapter and secure sessions.
- [ ] Implement Organization, Membership, Role, and invitation flows.
- [ ] Add server-side authorization policies and deny-by-default behavior.
- [ ] Require organization scope in shared repositories and application services.
- [ ] Add owner, administrator, contributor, reviewer, and viewer permissions.
- [ ] Implement immutable audit events for security-sensitive and approval actions.
- [ ] Add organization/project archive, restore, retention, and deletion workflows.
- [ ] Add tenant-isolation, role, session, and destructive-action tests.
- [ ] Add MFA requirement for organization owners before general availability.

### Exit criteria

- Cross-organization access tests fail closed across APIs and repositories.
- Security-sensitive actions are authorized and audited.
- Organization deletion follows a recoverable, tested lifecycle.

## Milestone 3 — Subscription, entitlements, and cost ledger

### Outcome

AI and product usage cannot exceed an organization’s approved plan or budget.

- [ ] Implement Plan, Subscription, Entitlement, UsageReservation, and UsageLedgerEntry.
- [ ] Integrate the selected subscription provider behind an adapter.
- [ ] Authenticate, deduplicate, and replay-test billing webhooks.
- [ ] Implement product credits while retaining raw provider usage and effective cost.
- [ ] Attribute usage to organization, project, user, workflow, provider, model, and run.
- [ ] Reserve estimated cost before work and reconcile actual cost afterward.
- [ ] Enforce per-request, daily, monthly, user, project, and organization hard limits.
- [ ] Add alert thresholds, exhausted-budget states, and administrator controls.
- [ ] Record retries, fallbacks, failures, cancellation, caching, and tool charges.
- [ ] Add reconciliation, concurrency, overrun, and webhook tests.

### Exit criteria

- No chargeable workflow starts without entitlement and budget reservation.
- Ledger and subscription test scenarios reconcile.
- Background workflows cannot exceed their reservation silently.

## Milestone 4 — Agent Kernel and model catalog

### Outcome

Axiom owns a provider-neutral, measurable, budget-aware agent runtime.

- [ ] Define provider-neutral generation, structured-output, tool, usage, and error contracts.
- [ ] Implement the Agent Kernel: context builder, policy engine, router, tool registry, validator, budget guard, trace writer, and evidence writer.
- [ ] Convert logical agents into versioned workflows rather than separate services.
- [ ] Implement model catalog, lifecycle, capability, pricing, data-policy, and region metadata.
- [ ] Implement Economy, Balanced, and Best policies.
- [ ] Adapt existing Groq support to the new contract.
- [ ] Add an OpenAI provider through the same contract.
- [ ] Add bounded retry, repair, fallback, cancellation, and circuit-breaker behavior.
- [ ] Encrypt eligible customer-provided provider credentials.
- [ ] Record prompt, schema, workflow, provider, model, latency, token, cache, and cost provenance.
- [ ] Add contract tests and provider fixtures without requiring paid APIs in ordinary CI.

### Exit criteria

- Groq and OpenAI can be enabled or disabled independently.
- Provider failures cannot corrupt the graph or exceed the budget.
- Domain code has no provider SDK dependency.
- No launch path requires an Axiom-owned GPU.

## Milestone 5 — Ticket Quality Engine

### Outcome

Axiom produces grounded, complete, testable work items that pass measurable quality gates.

- [ ] Finalize normalized WorkItem and WorkItemVersion schemas.
- [ ] Implement context selection from approved graph versions.
- [ ] Generate hierarchy, scope, out-of-scope, context, acceptance criteria, dependencies, risks, open questions, evidence expectations, and source links.
- [ ] Reject invalid, incomplete, ungrounded, or untestable output deterministically.
- [ ] Implement requirement coverage, overlap, duplicate, contradiction, and orphan checks.
- [ ] Implement critical-unknown clarification gates.
- [ ] Add an optional independent semantic review stage behind policy.
- [ ] Implement immutable review previews and accept/edit/reject feedback.
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
