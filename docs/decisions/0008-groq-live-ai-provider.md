# ADR 0008: Groq live AI provider for the hackathon prototype

- Status: Accepted
- Date: 2026-07-19

## Context

The hackathon deployment needs real model-backed analysis and AI-assisted document revision, but the current project owner does not have OpenAI API billing or an OpenAI API key. A paid ChatGPT subscription is not an API credential. The existing provider boundary already uses an OpenAI-compatible TypeScript client, so the smallest viable change is to select a compatible inference service without changing the domain contract.

## Decision

Use Groq as the single live model provider for the P0 prototype:

- authenticate only with the server-side `GROQ_API_KEY`;
- use Groq's OpenAI-compatible base URL;
- default to `openai/gpt-oss-120b` through `GROQ_MODEL`;
- use Chat Completions strict JSON-schema mode for analysis and document revision;
- validate every returned value again with Zod before it enters the canonical graph or a document version;
- keep fixture mode explicit and never substitute fixture data after a live failure.

The `openai/` prefix in the model ID identifies the open-weight model family. Requests, credentials, quotas, and billing belong to Groq.

## Why this model

`openai/gpt-oss-120b` is the strongest current Groq-hosted fit for long product documents, architecture reasoning, and code-oriented engineering decisions. It supports strict JSON-schema output, which is more important to Axiom than maximizing requests per minute because the canonical graph must reject malformed model output.

## Consequences

- The prototype can run live without an OpenAI API key or a new provider SDK.
- Free-plan rate limits can reject large or frequent requests. The UI must surface those failures honestly.
- Strict schema compliance does not prove semantic correctness; exact-quote grounding checks, stable-ID rules, graph validation, and deterministic readiness logic remain in application code.
- A future provider change remains isolated behind `ModelProvider` and `RevisionProvider`.

## Alternatives considered

- `openai/gpt-oss-20b`: cheaper and faster, but lower quality for complex requirement and architecture synthesis.
- Llama 4 Scout on Groq: higher free-plan token throughput, but no strict structured-output guarantee.
- Gemini: capable structured output, but requires an additional SDK and was not selected after the owner chose Groq.
