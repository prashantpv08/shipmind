# ADR 0010 — Commercial platform boundaries

- Status: Accepted
- Date: 2026-07-20
- Supersedes: Jira-only delivery direction in 0005, Vercel hosting in 0007, and Groq-only provider selection in 0008

## Context

The hackathon proved Axiom’s source-to-evidence thesis, but its filesystem persistence, single-workspace credentials, one-provider AI configuration, and Vercel deployment boundary are not suitable for a multi-tenant commercial product. The product owner also chose Jira and Trello as external work-management systems rather than building an internal board.

## Decision

1. Axiom remains a TypeScript modular monolith until measured scale, ownership, cadence, or isolation requirements justify service extraction.
2. PostgreSQL is the commercial source of truth. Local development uses Docker PostgreSQL; AWS production targets RDS PostgreSQL. Large immutable source and evidence objects use S3 references.
3. AWS ECS Fargate is the initial production orchestrator, with SQS for durable asynchronous work. No Vercel deployment is authorized. EKS is deferred until measured requirements justify its cost and operational burden.
4. Axiom owns a provider-neutral Agent Kernel and logical workflows. It does not train a foundation model, operate GPUs, or deploy one service per logical agent for launch.
5. Groq and OpenAI are launch provider candidates. Any provider or model must pass Axiom’s task-specific quality, safety, latency, and cost gates before production enablement.
6. Axiom owns normalized work items, quality gates, exact publication preview, approval, traceability, and synchronization history. Jira and Trello remain external connector targets. Axiom does not implement a general-purpose board.
7. Launch synchronization is controlled publication plus read-only status refresh. Unrestricted two-way field synchronization is deferred until conflict policy, webhook replay, field ownership, and reconciliation are specified and tested.
8. External coding agents use an adapter boundary and customer-owned accounts by default. Their output remains unverified until Axiom executes approved verification commands.

## Consequences

- Existing Vercel, filesystem, static Jira-token, and Groq-only code remains migration input, not commercial architecture.
- PostgreSQL, organizations, authorization, billing, evaluation, and connector installations precede an AWS commercial launch.
- Logical agent specialization does not create premature microservices.
- Low-cost inference can be used broadly while expensive models remain bounded fallbacks.
- Jira and Trello provider differences are isolated behind versioned mappings from one Axiom WorkItem contract.

## Reconsideration triggers

- Extract a module only when the SRS service-extraction evidence exists.
- Adopt EKS only when independent workloads, isolation, scheduling, or platform-team needs outweigh ECS simplicity.
- Evaluate self-hosted models only when sustained usage, data residency, or customer-owned hardware produces a verified total-cost or control advantage.
- Add two-way connector synchronization only after field ownership, conflict resolution, replay, and reconciliation are product requirements with passing tests.

