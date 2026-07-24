# ADR 0025 — Add hosted provider adapters while keeping execution disabled

## Status

Accepted on 2026-07-24.

## Context

Axiom needs low-cost and quality-oriented model choices without owning GPUs. The platform already has a provider-neutral Agent Kernel, deterministic local fixture, model catalog, usage reservations, and ticket-quality gates. OpenAI and Groq were catalog placeholders, but no commercial adapter contract existed.

Enabling a hosted model now would be premature. The launch evaluation corpus is still `AWAITING_HUMAN_REVIEW`; provider pricing, approved regions, data handling, credentials, and chargeable reservation/reconciliation are not complete. A provider call could therefore spend money or transfer customer content without all required gates.

## Decision

Implement OpenAI and Groq through one Responses API adapter contract and keep both unreachable from organization policy.

- OpenAI uses `POST https://api.openai.com/v1/responses`, `store: false`, a SHA-256 privacy-preserving safety identifier, and JSON-schema output.
- Groq uses its OpenAI-compatible `POST https://api.groq.com/openai/v1/responses` endpoint and JSON-schema output.
- Both adapters reject non-allowlisted model-definition IDs and any tool request in the ticket-generation workflow.
- Both require measured provider token usage and validate the parsed output again with Axiom's Zod and deterministic ticket-quality gates.
- Provider errors are normalized without persisting response bodies or secrets.
- Candidate model identifiers are stored in PostgreSQL as `CANDIDATE` and `DISABLED`, with `UNVERIFIED` pricing, `NOT_EVALUATED` qualification, no approved region, and `REQUIRES_REVIEW` data policy.
- No provider credential is added and no live evaluation is run in this slice.

## Verified upstream contracts

- OpenAI's current model guide identifies GPT-5.6 Luna, Terra, and Sol and recommends the Responses API for reasoning workflows: <https://developers.openai.com/api/docs/guides/latest-model.md>
- OpenAI's Responses API contract supports JSON-schema output, measured usage, `store`, reasoning effort, and `safety_identifier`: <https://developers.openai.com/api/reference/resources/responses/methods/create>
- Groq documents its OpenAI-compatible Responses API and JSON-schema output: <https://console.groq.com/docs/responses-api>
- Groq documents strict structured output for `openai/gpt-oss-20b` and `openai/gpt-oss-120b`: <https://console.groq.com/docs/structured-outputs>

These pages were checked on 2026-07-24. Pricing was deliberately not copied because model availability and price are operational data that require a dated verification process before enablement.

## Consequences

Provider transport and parsing can be regression-tested locally without cost. Catalog users can see real candidate identifiers without mistaking them for approved models. The Agent Kernel continues to fail closed for hosted execution until qualification and cost/data controls are complete.
