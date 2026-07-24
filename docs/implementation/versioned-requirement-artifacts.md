# Versioned requirement artifacts

## User outcome

Authorized product decision-makers can generate, inspect, regenerate, and approve an exact Requirements/SRS/NFR baseline for the current canonical graph without a paid model, cloud deployment, or external connector write.

## Implemented boundary

The NestJS/Fastify platform owns tenant-scoped current reads, deterministic compilation, immutable PostgreSQL versions, exact-hash approval, ETags, idempotency, role authorization, critical-gap checks, project lifecycle transitions, and audit evidence. The compiler is a pure TypeScript domain function and has no dependency on NestJS, Next.js, provider SDKs, or PostgreSQL.

The Next.js application loads this baseline alongside the exact current readiness and backlog preview. Its thin BFF validates same-origin browser mutations, request contracts, project ETags, idempotency keys, and successful platform responses. The page shows all three full Markdown bodies and their SHA-256 hashes before approval. Viewer roles receive the same evidence without mutation controls.

Legacy imported rows with incompatible provenance are preserved but excluded from the commercial baseline. Generating a new baseline increments from stored historical versions. Regeneration preserves earlier approvals as audit history while exact-hash matching makes them stale.

## Honest states and gates

Generation and approval distinguish idle, in-flight, success, known failure, and unknown result. Unknown results preserve the operation's idempotency key. Approval is unavailable until exactly three valid current-graph artifacts exist. Open critical gaps block approval. Backlog generation and acceptance independently recheck the exact latest hashes and still require a current architecture decision.

This slice does not generate architecture options, approve an ADR, call OpenAI or Groq, publish to Jira or Trello, or deploy to AWS or Vercel.

## Local regression surface

- compiler tests cover deterministic grounded content and explicit unknowns;
- PostgreSQL tests cover versioning, exact approvals, stale approval invalidation, authorization, tenancy, critical gaps, and rollback guards;
- work-item integration tests prove a prior approval cannot authorize regenerated documents;
- BFF tests cover exact forwarding, ETags, idempotency, same-origin protection, and response validation; and
- web contract, lint, type, build, and browser checks cover the visible preview workflow.
