# ADR 0018 — Provider-neutral generation and qualified model catalog

**Status:** Accepted

**Date:** 2026-07-24

## Context

Axiom needs inexpensive hosted inference without coupling ticket quality, budgets, or tenant policy to one vendor. Provider model names, prices, context limits, data-processing terms, and availability change independently. Treating a provider name or a current marketing model as production approval would bypass the SRS evaluation and cost gates.

The commercial contract requires immutable model IDs, capabilities, price metadata, context limits, data policy, allowed regions, evaluation evidence, organization policy, and Economy/Balanced/Best routing. It also requires every model response to pass Axiom validation and grounding before persistence.

OpenAI's current API documentation separates model selection from response structure and exposes structured output through the Responses API. It also recommends evaluating model quality, cost, and latency for the application's task rather than selecting from a generic benchmark. These vendor details belong inside an adapter; they do not define Axiom's domain contract.

## Decision

1. Axiom owns a provider-neutral generation contract for bounded messages, structured-output requirements, tool definitions, usage evidence, results, and typed provider errors.
2. Provider SDK types shall not enter work-item, graph, billing, or HTTP domain contracts.
3. A PostgreSQL catalog records provider and immutable model-definition lifecycle independently. A hosted model can be enabled only after qualification evidence, verified pricing, approved data policy, and at least one approved region exist.
4. Organization policy maps Economy, Balanced, and Best to enabled immutable model definitions. End users see tiers; raw model policy changes remain a future administrator action.
5. `LOCAL_FIXTURE` is the only executable definition in this slice. It is local-only, non-billable, has no fabricated token counts or provider request ID, and cannot be mistaken for production qualification.
6. OpenAI and Groq are seeded only as disabled candidates. No hosted model ID, price, context limit, region, data-policy approval, credential, or evaluation score is guessed or enabled.
7. The catalog read is available to every authorized organization member because users need truthful routing visibility. Policy mutation will require a separate administrator permission, exact preview, optimistic concurrency, idempotency, and audit evidence.
8. A future Agent Kernel will select a policy tier, perform entitlement and budget reservation before chargeable work, invoke the matching adapter, validate workflow-specific output, write measurement evidence, and reconcile actual usage.

## Consequences

- Axiom can qualify OpenAI and Groq independently and disable either without changing domain code.
- Current local ticket generation stays deterministic and free of provider costs.
- Provider candidates are visible without implying availability.
- Model catalog rows are evidence-bearing configuration, not a live mirror of vendor marketing pages.
- Adding a hosted definition requires a reviewed catalog update and evaluation evidence; it cannot be enabled solely through an environment variable.
- This slice does not yet route ticket generation through the Agent Kernel or call a hosted provider.

## Primary references

- [Axiom commercial SRS](../../SRS.md), sections 6.7, 7, 8.2, and 10.6.
- [OpenAI model documentation](https://developers.openai.com/api/docs/models).
- [OpenAI Responses API migration guidance](https://developers.openai.com/api/docs/guides/migrate-to-responses#additional-differences).
- [OpenAI model selection guide](https://developers.openai.com/cookbook/examples/partners/model_selection_guide/model_selection_guide).
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).

