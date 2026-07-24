# Versioned architecture comparison and decision

## User outcome

Authorized project members can compare three complete architecture options locally, inspect every trade-off and exact hash, approve one option with a rationale, and receive deterministic ADR/HLD views. Agile ticket generation opens only for that exact latest decision.

## Implemented boundary

The NestJS/Fastify platform owns organization authorization, exact requirement-approval checks, deterministic compilation, immutable PostgreSQL generations and options, exact decision approval, ADR/HLD persistence, project lifecycle transitions, ETags, idempotency, and audit evidence. Provider interfaces are untouched and no hosted model is required.

The Next.js application remains a thin BFF. It loads the architecture baseline with current project, readiness, requirement artifacts, and backlog state. It validates same-origin mutations and successful platform responses, displays the complete non-graph comparison, and provides role-appropriate generation and approval controls. Unknown mutation outcomes retain the same idempotency key for safe retry.

## Integrity and eligibility

Generation requires an exact current requirement approval and no critical open gap. Approval additionally requires the latest generation and selected option hashes. Approval atomically records the decision and both deterministic documents. A new generation invalidates earlier approval eligibility without deleting evidence. Work-item generation and acceptance independently repeat the latest-generation decision check inside their transaction.

The monetary range remains `UNKNOWN`; the UI explains the missing evidence rather than estimating it. The recommendation remains `AI_SUGGESTED` until human approval. Nothing in this slice publishes to Jira or Trello, calls OpenAI or Groq, or deploys to AWS or Vercel.

## Local regression surface

- compiler tests cover deterministic completeness, explicit unknown cost, and approved-document provenance;
- PostgreSQL tests cover exact generation and approval, role and tenant isolation, idempotency, ADR/HLD compilation, and regeneration invalidation;
- work-item tests prove legacy and stale architecture decisions cannot authorize tickets;
- BFF tests cover same-origin protection, ETags, idempotency, exact forwarding, and malformed-response rejection; and
- lint, type, test, production build, migration, and browser checks cover the visible local flow.
