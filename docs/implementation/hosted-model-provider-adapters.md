# Hosted model provider adapters

## User outcome

Axiom now has one bounded generation contract for the local fixture, OpenAI, and Groq. Commercial users still cannot accidentally trigger a paid request: every organization tier resolves to the local fixture, while hosted providers and models remain disabled candidates.

## Implemented boundary

`axiom-platform/src/agent-kernel/hosted-responses-generation.adapter.ts` owns transport only. Domain and work-item code do not import a provider SDK.

For each request the adapter:

1. validates the organization, run, workflow, selected model definition, output contract, timeout, and empty tool allowlist;
2. sends a non-streaming Responses API request with `store: false`;
3. asks for bounded JSON-schema output using best-effort schema mode;
4. requires a completed response and measured provider token counts;
5. parses JSON and returns the provider-neutral `GenerationResult`;
6. leaves semantic validation to `WorkItemBatchSchema` and `ticket-quality-v1` before persistence.

Best-effort schema mode is intentional for the current `WorkItem v1`, which has type-specific optional Story and Defect fields. Provider schema enforcement is not treated as semantic correctness; Axiom always performs its own validation and grounding checks.

OpenAI receives a stable SHA-256 value derived from organization and user IDs as `safety_identifier`; raw identity fields are not sent in that field. Groq does not receive the OpenAI-specific safety field. Neither adapter accepts tools yet, so model output cannot invoke Jira, Trello, a repository, or any external action.

## Catalog migration

Migration `0017_hosted_model_candidates` adds these disabled candidates:

- OpenAI `gpt-5.6-luna`
- OpenAI `gpt-5.6-terra`
- OpenAI `gpt-5.6-sol`
- Groq `openai/gpt-oss-20b`
- Groq `openai/gpt-oss-120b`

Every row is `CANDIDATE`, `DISABLED`, `UNVERIFIED`, `NOT_EVALUATED`, has no approved region, and requires data-policy review. The rollback refuses to remove a candidate referenced by a model policy or immutable run evidence.

## Local verification

Run:

```bash
pnpm test:providers
pnpm eval:tickets
pnpm test:db
```

`test:providers` uses only in-memory HTTP responses. It verifies endpoints, authorization placement, retention, safety-ID behavior, structured-output request shape, measured token mapping, model-definition binding, tool denial, rate-limit classification, and malformed-output rejection. It never contacts OpenAI or Groq.

`eval:tickets` continues to test the deterministic evaluator corpus, not provider quality. The corpus remains `AWAITING_HUMAN_REVIEW`; therefore no candidate can be promoted from these results.

## Remaining enablement gates

Before the first live provider call, Axiom still needs:

- a human-approved source-to-backlog evaluation dataset and model-specific comparison runs;
- explicit promotion thresholds for grounding, coverage, testability, rewrite rate, latency, and cost;
- verified dated pricing and credit conversion;
- approved regions and data-processing review;
- encrypted organization/provider credentials;
- Agent Kernel reservation before the request and reconciliation from measured usage afterward;
- circuit-breaker and live sandbox failure evidence.

Until all gates pass, hosted execution remains unavailable rather than silently falling back or spending money.
