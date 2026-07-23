# Commercial clarification answers

## User outcome

When backlog generation is blocked by a stored critical unknown, an authorized decision-maker can record the exact confirmed answer without leaving the commercial backlog flow. Axiom creates a new canonical graph version, preserves the old evidence, and makes the need for downstream regeneration explicit.

## Implemented boundary

The commercial platform provides:

- a tenant-scoped clarification-answer endpoint owned by NestJS/Fastify;
- explicit `clarification:answer` authorization for Owner, Administrator, Product Analyst, and Architect roles;
- strict question ID and answer schemas;
- project `If-Match` concurrency and request idempotency;
- transactional copying of the current graph into a new immutable version;
- centralized `OPEN/UNKNOWN` to `ANSWERED/HUMAN_CONFIRMED` transitions;
- a deterministic stable answer-entity ID and question provenance;
- audit metadata containing an answer hash rather than answer plaintext; and
- historical preservation of old documents, architecture decisions, approvals, and backlog generations.

The Next.js application remains a thin BFF and presentation layer. It validates the browser request and platform response, forwards the server-side session credential, and renders the exact platform blocker. After a successful answer it refreshes the current project graph and disables review controls on any previous-graph backlog draft.

## Honest states

The answer form distinguishes idle, validation failure, recording, success, known platform failure, and unknown network result. An unknown result preserves the same idempotency key for the exact answer. A `409` or `412` clears the retry because the client must refresh before issuing a new mutation.

The flow does not calculate a readiness score, regenerate compiled documents, rerun architecture review, generate tickets, publish to Jira or Trello, call a hosted model, or incur cloud cost. Those states remain visibly incomplete.

## Local regression surface

- policy tests cover valid transitions, deterministic stable IDs, already-answered questions, and unsupported categories;
- PostgreSQL integration tests cover graph versioning, stable history, provenance, authorization, ETags, exact replay, changed retries, and audit redaction;
- BFF tests cover validated forwarding, response validation, same-origin protection, ETag, and idempotency; and
- the backlog page keeps historical previews visible while removing their review actions.

All commands run locally against the deterministic non-billable fixture and local PostgreSQL.
