# ADR 0020 — Critical-unknown ticket-generation gate

**Status:** Accepted  
**Date:** 2026-07-24

## Context

Axiom previously blocked generation only for an open gap whose severity was exactly `BLOCKER`. That allowed an unresolved contradiction or a high-severity untestable requirement to enter ticket generation, where a fixture or hosted model could fill the missing decision with plausible but unsupported text. The endpoint also returned only a prose error, even when the canonical graph already contained a linked clarification question.

## Decision

Ticket generation and backlog acceptance share one deterministic critical-gap policy.

An unresolved gap blocks when its status is `OPEN`, its truth status is `UNKNOWN`, and at least one of these conditions is true:

- severity is `BLOCKER`;
- type is `CONFLICT` or `CONTRADICTION`, regardless of severity;
- type is `UNTESTABLE` and severity is `HIGH`.

Other open discovery gaps remain visible but do not automatically stop generation. The policy is application-owned, provider-neutral, and evaluated before the Agent Kernel performs model work. Persistence and human acceptance recheck the policy transactionally so a decision that changes during generation or review cannot be bypassed.

When the initial generation check fails, the API returns `CLARIFICATION_REQUIRED` with the exact stored gap and first open linked clarification question. Axiom does not generate a replacement question or infer an answer. If no linked question exists, the response says so explicitly.

## Consequences

- A blocked request creates no work-item generation, AgentRun, ModelCall, token usage, or connector side effect.
- The web renders the exact decision, rationale, affected source IDs, and gap identity while preserving any previously persisted preview.
- New contradictions block acceptance even if the draft was generated before the contradiction appeared.
- The policy does not claim that every high-severity discovery gap is critical; criticality remains bounded to the rules above.
- Resolving a blocker belongs to the canonical clarification mutation. The backlog preview may invoke that platform workflow for the exact stored question, but it does not own or emulate the graph mutation.
