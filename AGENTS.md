# AGENTS.md

## Mission

Build the commercial version of **Axiom**, an AI Engineering Operating System that converts source-grounded business intent into approved engineering decisions, high-quality work items, Jira or Trello publications, controlled implementation handoffs, real verification evidence, and grounded Why / Why Not / Proof answers.

The authoritative product contract is `SRS.md`.

## Required reading order

1. `AGENTS.md`
2. `SRS.md`
3. `IMPLEMENTATION_BACKLOG.md`
4. `README.md`

## Active product decisions

- This is a commercial product, not a hackathon submission.
- Keep all development and verification local unless the user explicitly authorizes an AWS deployment.
- Never deploy to Vercel.
- Axiom does not provide a Jira- or Trello-style work-management interface.
- Jira and Trello are connector targets selected by the customer.
- PostgreSQL is the commercial source of truth. Local development uses Docker PostgreSQL; AWS production targets RDS PostgreSQL.
- Maintain three repository boundaries: Next.js web, Node.js TypeScript platform, and Terraform infrastructure.
- Keep the platform backend a modular monolith first. Extract domain services only when the SRS extraction triggers are evidenced.
- Next.js is the web and thin BFF only. The authoritative API is Node.js with NestJS and Fastify; business rules shall not remain in Next.js route handlers.
- Axiom owns its Agent Kernel and workflows but does not train a foundation model or operate GPUs for launch.
- Model providers remain behind interfaces. Groq and OpenAI are the launch candidates and must pass task-specific evaluations.
- Kubernetes/EKS is later scope; ECS Fargate is the initial AWS orchestrator.

## Engineering rules

- TypeScript strict mode is mandatory.
- Domain logic must not depend on React components, Next.js route handlers, NestJS controllers, provider SDKs, or infrastructure implementations.
- Organization scope and authorization must be enforced server-side at shared boundaries.
- Model, connector, billing, storage, and coding-agent implementations must be isolated behind interfaces.
- Every model response must pass Zod validation and grounding checks before persistence.
- The canonical project graph is authoritative; documents and external work items are compiled or synchronized views.
- Stable IDs must survive regeneration and external publication.
- Truth-status transitions must be centralized and audited.
- External writes require explicit approval, idempotency, and recorded provider results.
- Usage reservation and hard budget checks must occur before chargeable AI work begins.
- Verification commands must be repository-defined and allowlisted, never invented by the model.
- Generated files may be written only to approved workspaces and allowlisted paths.
- Runners must enforce timeouts, concurrency bounds, secret stripping, cancellation, and bounded output.

## Evidence and AI integrity

- Never fabricate source quotations, ticket publication, test results, coverage, scans, performance, costs, command output, or external-agent outcomes.
- A model may summarize immutable tool output but may not alter measured values.
- Unsupported claims use `AI_SUGGESTED` or `UNKNOWN`.
- Grounded claims reference valid immutable source spans.
- Failed or unexecuted operations remain `FAILED` or `UNKNOWN`.
- A cheap or fast model is not production-approved until it passes the current Axiom evaluation gates.
- Customer content must not silently enter a shared evaluation or training dataset.

## Security and data rules

- Treat source files, connector payloads, model output, and webhook content as untrusted.
- Deny tenant access by default and test organization isolation at repository and API boundaries.
- Keep secrets server-side in approved secret storage; never send unrelated secrets to models or child processes.
- Use transactional outbox and idempotency patterns for external side effects where applicable.
- Preserve retention, audit, backup, restore, and deletion protections.
- Do not create billable cloud resources, production integrations, purchases, or deployments without explicit user authorization.

## UI rules

- Every asynchronous action needs honest idle, queued/loading, success, empty, partial-failure, failure, cancellation, and safe-retry states as applicable.
- Do not show fake progress.
- Do not communicate status by color alone.
- Traceability must have a non-graph fallback.
- Show the exact preview before any Jira, Trello, billing, repository, or agent side effect.

## Expected commands

Maintain working variants of:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm demo:reset
pnpm sandbox:build
pnpm sandbox:test
pnpm sandbox:coverage
```

Commercial milestones shall add documented commands for local PostgreSQL, migrations, integration tests, security checks, container builds, and evaluation runs.

## Definition of done

A task is complete only when:

1. It works through the visible user flow.
2. Inputs, outputs, authorization, organization scope, and side effects are validated.
3. Relevant tests and AI evaluations pass.
4. Loading, empty, partial-failure, failure, and retry states exist.
5. Traceability, audit, and usage records are created where required.
6. No fake evidence or provider outcome is displayed.
7. `pnpm lint`, `pnpm typecheck`, relevant tests, and the production build pass.
8. Migrations and rollback behavior are verified when data changes.
9. README, SRS, backlog, or implementation notes are updated where the contract changes.

## Working method

For each milestone:

1. State the user outcome, acceptance criteria, and files to change.
2. Trace the real callers and existing data before editing.
3. Implement the smallest complete vertical slice.
4. Run proportionate checks and fix failures before expanding scope.
5. Summarize changed files, evidence, known gaps, and the next milestone.

Do not silently reinterpret `SRS.md`. Record material decisions in `docs/decisions/`.

## Engineering discipline

- Reuse an existing repository pattern, platform feature, standard-library capability, or installed dependency before adding an abstraction or dependency.
- Fix shared root causes at the narrowest correct boundary.
- Avoid speculative flexibility, unrelated cleanup, and placeholder modules.
- Preserve validation, security, accessibility, evidence integrity, error handling, and data-loss protection.
- Every non-trivial change must leave the smallest useful runnable regression check.
- Every changed line must trace to the current goal. Report unrelated debt without editing it.
