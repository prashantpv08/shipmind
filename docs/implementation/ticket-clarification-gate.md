# Ticket clarification gate and grounded decomposition

## User outcome

An authorized user either receives a specific, source-grounded Agile draft or an actionable list of unresolved decisions. Axiom does not spend model budget or invent implementation details when the current graph contains a critical unknown or contradiction.

## Implemented boundary

The platform now:

1. loads current graph gaps and their stored open clarification questions inside the organization and graph-version scope;
2. applies one deterministic critical-gap policy shared by generation and acceptance;
3. returns a typed `CLARIFICATION_REQUIRED` response before Agent Kernel execution;
4. rechecks the same policy in the generation persistence and human-acceptance transactions;
5. preserves exact gap, question, rationale, and affected-source identifiers through the thin web BFF;
6. displays those decisions beside the generation action without replacing the last valid preview;
7. decomposes each approved requirement or NFR into a stable Agile story whose title, outcome, scope, and acceptance criterion retain the approved statement;
8. quality-gates the output for schema, hierarchy, grounding, requirement coverage, orphan work, overlap, duplicates, dependencies, vague criteria, unresolved questions, and fabricated evidence claims.

The follow-on commercial answer path is documented in [commercial clarification answers](commercial-clarification-answers.md). It resolves the exact stored question through a versioned platform mutation; the backlog UI does not update graph state itself.

## Integrity behavior

- The client cannot supply blockers or clarification text.
- The platform reads only the canonical current graph and exact stored questions.
- No blocker response records a fake AgentRun, ModelCall, token count, cost, or successful generation.
- A missing linked question is shown as missing; the UI does not fabricate one.
- Medium/high noncritical discovery gaps do not silently become launch-blocking policy.
- Jira and Trello publication remain unavailable from this flow.

## Local regression surface

The slice includes unit coverage for the policy matrix and grounded fixture decomposition, PostgreSQL integration cases for pre-kernel blocking and post-generation contradictions, BFF response validation, full ticket-quality evaluation, and browser verification of the clarification state. All execution is local and the fixture remains non-billable.

The evaluation corpus is still labeled `AWAITING_HUMAN_REVIEW`; passing the deterministic fixtures is not model-promotion evidence for OpenAI, Groq, or another hosted provider.
