# Axiom Day 1 Hackathon Slice

Axiom Day 1 is a single Next.js App Router application that demonstrates the fixture-backed NotifyFlow brief analysis journey without an API key.

## Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm demo:reset
```

## Implemented Day 1 Scope

- Built-in NotifyFlow project and original source brief.
- Canonical Zod schemas for project, source document/span, requirements, NFRs, assumptions, risks, gaps, analysis runs, and readiness score.
- FixtureAnalysisProvider with validated, source-grounded findings.
- LiveAnalysisProvider stub only; live API integration is intentionally deferred.
- Deterministic readiness scoring in application code.
- Desktop-focused UI with loading, empty, success, failure, reset, grouped findings, provenance labels, and source-evidence highlighting.

## Out of Scope Today

Clarification questions, architecture comparison, ADR generation, enterprise artifacts, code generation, tool execution, exports, and Why / Why Not / Proof Explorer are intentionally not implemented in Day 1.
