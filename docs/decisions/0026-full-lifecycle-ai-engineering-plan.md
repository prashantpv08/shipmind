# ADR 0026 — Make full-lifecycle engineering guidance a first-class AI workflow

## Status

Accepted on 2026-07-24.

## Context

Axiom's canonical graph, architecture workflow, Ticket Quality Engine, connectors, coding-agent handoff, verification, and evidence model already span more than ticket creation. The product contract and first Agent Kernel workflow nevertheless made ticket generation appear to be the primary AI outcome.

Customers need help making and reviewing engineering decisions across the complete software delivery lifecycle: product scope, user experience and accessibility, architecture and technology selection, data, APIs, testing, security, delivery, deployment and cloud infrastructure, reliability and observability, cost, and operations. They also need to see what is not recommended, why, the trade-offs, the missing evidence, and the conditions that should trigger reconsideration.

## Decision

Introduce a versioned `Engineering Plan v1` as a first-class Agent Kernel workflow and canonical project view.

- It is generated only from the exact current approved requirement baseline and approved architecture decision.
- It covers twelve mandatory lifecycle domains.
- Every recommendation contains explicit why, why-not-now, benefits, trade-offs, risks, implementation actions, verification expectations, source links, and reconsideration conditions.
- Standards and vendor references come from an application-controlled catalog. The model may select reference IDs but may not invent URLs.
- Deterministic validation rejects missing domains, invalid source IDs, incomplete reasoning, unsupported reference IDs, and prohibited evidence or certification claims.
- Output remains `AI_SUGGESTED`. It cannot approve a decision, create tickets, change code, provision cloud resources, or deploy.
- Material graph or architecture changes make the plan historical; regeneration creates a new immutable version.
- Logical lifecycle specialists remain versioned workflows on the shared Agent Kernel, not microservices or independently spending agents.

## Reference baseline

The initial controlled catalog uses primary references, including OWASP ASVS 5.0.0, OWASP API Security, OWASP AISVS 1.0, NIST SSDF 1.1, NIST AI RMF, WCAG 2.2, AWS Well-Architected and SaaS Lens, OpenAPI, OpenTelemetry, and PostgreSQL documentation. Reference adoption is versioned and assessed; an upstream change does not silently alter an existing plan.

The workflow prompt follows OpenAI's outcome-first guidance: state the user outcome, evidence, constraints, success criteria, output contract, and stop rules without duplicating instructions. Hosted providers remain disabled until task-specific evaluation and budget gates pass.

## Consequences

Ticket generation becomes one downstream consumer of a broader engineering decision system. Users receive a reviewable full-lifecycle plan before implementation work is published. Axiom can later evaluate model quality independently for architecture, security, testing, deployment, and other workflows without creating separate agent services or permitting autonomous side effects.

Code generation is another governed downstream workflow. It consumes an approved plan, approved work items, the exact architecture decision, a versioned coding profile, repository and path authorization, and repository-owned verification commands. Its output remains an unverified patch or branch until real checks and human review create evidence. GitHub is a connector boundary with exact previews and explicit approval, never the source of product truth.
