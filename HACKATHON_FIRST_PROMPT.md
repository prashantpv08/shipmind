# Axiom Hackathon First Prompt

Open the repository in Codex, switch to **Plan mode** (`/plan`), and paste the prompt below.

```text
You are the lead engineer for a four-day hackathon build of Axiom.

Before doing anything, read these files in order:
1. AGENTS.md
2. SRS.md
3. IMPLEMENTATION_BACKLOG.md
4. DEMO_SCENARIO.md
5. sample-inputs/notifyflow-brief.md

Product goal:
Build a reliable three-minute demo of one complete Axiom journey:
ambiguous brief -> source-grounded requirements, NFRs and gaps -> clarification and readiness -> architecture alternatives with Why and Why Not -> approved decision -> enterprise artifacts -> one generated API vertical slice -> real test evidence -> grounded Why / Why Not / Proof answers.

This is a hackathon. Optimize for a working, visually clear, resettable demo, not enterprise completeness. Do not expand the SRS scope.

Do not write code yet. Create HACKATHON_PLAN.md containing:
1. a Day 1 to Day 4 implementation plan in strict dependency order;
2. the smallest repository structure needed;
3. the canonical graph entities and Zod schemas;
4. the exact visible demo flow and screen states;
5. development, lint, typecheck, unit test, E2E, build, demo-reset and sandbox commands;
6. the five highest technical risks and a fallback for each;
7. a cut list showing what must be removed first if time slips;
8. acceptance checks for each day.

Mandatory architecture constraints:
- TypeScript strict mode.
- Next.js App Router.
- Keep one application and internal modules unless a separate package is essential.
- The canonical project graph is the source of truth.
- All model output must pass Zod validation before persistence.
- Use stable entity IDs and exact source spans.
- Implement a fixture provider first and a live model provider behind the same interface.
- The full demo must remain usable without an API key, with fixture output clearly labeled as demo data.
- Never fabricate evidence, command output, coverage, security findings, performance metrics or source quotations.
- Do not execute model-generated shell commands.
- Do not add authentication, organizations, meeting bots, Jira/GitHub integrations, arbitrary repository ingestion, real cloud provisioning, multi-model routing, or P1/P2 modules.

Day 1 must end with all of the following working:
- the app starts locally;
- the NotifyFlow sample can be seeded and reset;
- a user can submit the sample brief;
- the fixture provider returns validated functional requirements, NFRs, assumptions, risks and at least five meaningful gaps;
- every source-grounded item opens the exact supporting source excerpt;
- a deterministic implementation-readiness score is displayed;
- malformed or ungrounded analysis is rejected without corrupting stored data;
- loading, empty and failure states exist;
- lint, typecheck, unit tests and production build pass.

Plan the live model adapter, but do not make Day 1 depend on it.

After writing HACKATHON_PLAN.md, stop. Summarize:
- the critical path;
- the Day 1 files to create;
- the main scope cuts;
- any blocking decision you need from me.

Do not edit implementation files until I approve the plan.
```
