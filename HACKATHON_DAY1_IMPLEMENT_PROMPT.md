# Axiom Hackathon Day 1 Implementation Prompt

Use this only after reviewing and approving `HACKATHON_PLAN.md`.

```text
Implement only the approved Day 1 scope from HACKATHON_PLAN.md, corresponding to Milestone 0 and the minimum complete portion of Milestone 1.

Priorities, in order:
1. a runnable and resettable app;
2. the NotifyFlow fixture journey;
3. canonical graph schemas and validation;
4. source-grounded requirements, NFRs, assumptions, risks and gaps;
5. deterministic readiness scoring;
6. visible loading, empty, success and failure states;
7. tests and a passing production build.

Use the fixture provider first. Keep the live model provider behind an interface, but do not spend time integrating the API until the fixture path and tests are stable.

Work in small verified steps. After each coherent slice, run the relevant checks. Do not begin clarification, architecture generation, artifact generation, code generation, verification runners, or Why Explorer work today.

Before finishing, run:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build

Then report:
1. files changed;
2. commands executed and exact outcomes;
3. Day 1 acceptance checks that pass;
4. remaining defects or risks;
5. the smallest next task for Day 2.

Do not claim a check passed unless you actually ran it.
```
