# ADR 0019 — Agent Kernel ticket-generation run evidence

**Status:** Accepted  
**Date:** 2026-07-24

## Context

The commercial work-item endpoint selected approved graph context, called a deterministic fixture generator directly, ran the ticket-quality evaluator, and persisted a draft. That preserved grounding and quality, but it bypassed the provider-neutral generation contract and did not create `AgentRun` or `ModelCall` evidence. Enabling a hosted adapter on that path would therefore bypass model policy, retry limits, and model-call provenance.

## Decision

Ticket generation is the first versioned logical workflow executed by the shared Agent Kernel.

- The browser submits `ECONOMY`, `BALANCED`, or `BEST`; it cannot select a raw provider or model.
- The kernel resolves the tier through the organization PostgreSQL model policy and rechecks provider, model, structured-output, lifecycle, and execution status.
- The kernel currently permits only `MODEL-AXIOM-STRUCTURED-FIXTURE-V1`. Hosted routes fail closed.
- The workflow fixes its prompt, output-schema, evaluator, allowed-tool set, timeout, and maximum-attempt versions in application-owned code and immutable PostgreSQL version records.
- Every attempted provider call creates append-only `ModelCall` evidence. The surrounding `AgentRun` records context/output hashes, model policy version, tier, actor, request, terminal state, and the final call.
- Provider output passes workflow-owned Zod and deterministic grounding/quality validation before the run succeeds or work-item data is persisted.
- The local fixture is non-billable. Its run records `NOT_APPLICABLE / NON_BILLABLE_LOCAL_FIXTURE`; no reservation, tokens, or cost are fabricated.
- Any future chargeable adapter remains disabled until the kernel can reserve estimated credits before the call and reconcile immutable measured usage afterward.

The local fixture may still build deterministic output before entering the provider adapter. This is test behavior, not evidence that a hosted model generated the backlog.

## Consequences

- Existing legacy previews remain readable with `provenance: null`; the UI labels them as predating Agent Kernel evidence.
- New previews expose exact run and model-call IDs, tier, model, prompt/workflow versions, attempt count, usage evidence, and budget disposition.
- A successful model call can still lead to a failed run when deterministic validation rejects its output. No invalid work-item version is persisted.
- Synchronous execution remains acceptable only for the bounded local fixture. Durable worker execution must precede hosted or long-running generation.
- Repair prompts, hosted fallback, cancellation persistence, circuit breakers, and chargeable budget reconciliation remain separate gated work.

