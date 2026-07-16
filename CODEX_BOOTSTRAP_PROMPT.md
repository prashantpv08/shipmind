# Codex Bootstrap Prompt

Copy the prompt below into the primary Codex session.

```text
We are building Axiom, an AI Engineering Operating System.

Read these files in order:
1. AGENTS.md
2. SRS.md
3. IMPLEMENTATION_BACKLOG.md
4. DEMO_SCENARIO.md

Treat SRS.md as the product contract. Do not expand the scope.

Before writing code, produce:
- a P0-only implementation plan;
- the proposed repository tree;
- the initial domain entities and Zod schemas;
- the local commands for development, lint, typecheck, tests, E2E, build, demo reset, and sandbox verification;
- the five highest technical risks and how you will contain them.

Then implement only Milestone 0 and Milestone 1 from IMPLEMENTATION_BACKLOG.md.

Constraints:
- TypeScript strict mode and pnpm workspace.
- Next.js App Router.
- Canonical project graph is the source of truth.
- All model outputs must pass Zod validation.
- Never fabricate evidence, test results, coverage, security findings, or performance metrics.
- Do not execute model-generated commands.
- Do not add authentication, organizations, arbitrary repositories, cloud deployment generation, live meeting integrations, or multi-model routing.
- Keep the app runnable after every milestone.
- Add tests as you implement.

At the end, report:
1. files changed;
2. commands executed;
3. test results;
4. remaining blockers;
5. the exact next milestone.
```
