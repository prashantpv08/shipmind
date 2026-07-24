# Full-lifecycle Engineering Plan

## User outcome

An authorized user can open a project’s Engineering Plan and receive one source-grounded, reviewable view of the complete software delivery lifecycle. The view explains what Axiom recommends, what it does not recommend now, why, trade-offs, risks, reconsideration triggers, implementation actions, verification evidence, unknowns, and next delivery gates.

The plan includes product scope, UX and accessibility, approved architecture and technology, data, APIs and integrations, testing, security and privacy, CI/CD, AWS deployment and infrastructure, reliability and observability, cost and FinOps, and operations and support. Controlled implementation includes versioned coding rules, bounded code generation, reviewable patches, and later explicitly approved GitHub handoff; plan generation itself performs none of those side effects.

## Authoritative boundaries

- Next.js renders the experience and proxies browser requests. It owns no plan business rule.
- The NestJS/Fastify platform loads the exact tenant-scoped baseline, executes the Agent Kernel workflow, validates output, and persists the result.
- PostgreSQL owns immutable plan versions, quality reports, provenance, audit evidence, and idempotency state.
- Generation requires the current exact requirement-artifact approval, the exact latest human-approved architecture option, an eligible project status, grounded or human-confirmed entities, and no open critical gap.
- A plan remains `AI_SUGGESTED`; it cannot certify, deploy, publish, create code, or establish executed verification evidence.

## Quality and integrity gates

`engineering-plan-quality-v1` rejects:

- output that does not satisfy the strict `engineering-plan-v1` schema;
- a missing lifecycle domain;
- a source entity ID outside the approved current graph context;
- unsupported certification, production-readiness, test, vulnerability, deployment, latency, or availability claims.

Every recommendation includes at least one controlled primary reference. URLs are resolved from the application-owned `engineering-reference-catalog-2026-07-24`; model-provided URLs are not accepted. The launch catalog includes OWASP ASVS 5.0.0, OWASP API Security Top 10 2023, OWASP AISVS 1.0, NIST SSDF 1.1, NIST AI RMF 1.0, WCAG 2.2, AWS Well-Architected and SaaS Lens, OpenAPI 3.1.1, OpenTelemetry, and PostgreSQL documentation. A mapping is guidance and never compliance proof.

## Cost and retry safety

The service derives the request hash from the exact graph, approvals, architecture option, tier, prompt, and workflow. It reserves the idempotency key before Agent Kernel execution. A completed retry returns the persisted response without another model call. The Agent Kernel still performs policy routing and hard budget reservation before any chargeable hosted execution. The current executable model is a deterministic, non-billable local fixture; OpenAI and Groq candidates remain disabled.

## Local verification evidence

The implemented regression checks cover deterministic output, all lifecycle domains, source grounding, unsupported evidence rejection, tenant authorization, read-only access, persistence, audit records, controlled references, pre-model idempotency replay, and migration rollback order. A local authenticated positive flow produced one `DRAFT` plan with 12/12 domains, 100% valid source references, zero prohibited claims, `LOCAL_FIXTURE` provenance, and `AI_SUGGESTED` truth status. A project lacking current approvals and containing a critical gap returned a precise 422 blocker response without persisting a plan.

No Vercel, GitHub, Jira, Trello, AWS, or other external deployment or publication was performed.

## Remaining commercial work

- exact human review and approval of a plan;
- a versioned coding-profile catalog and secure-engineering rule applicability UI;
- governed coding-task and generated-patch persistence;
- GitHub App repository authorization, exact side-effect previews, idempotent writes, and webhook reconciliation;
- evaluation datasets and qualification gates for hosted OpenAI and Groq execution;
- Jira and Trello commercial connectors;
- AWS infrastructure only after explicit deployment authorization.
