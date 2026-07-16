# Axiom / Shipmind

Axiom is a P0 hackathon MVP for an AI engineering operating system. The current vertical slice demonstrates the NotifyFlow journey from a grounded product brief through clarification, architecture comparison, and ADR approval.

## Quality commands

This repository uses TypeScript strict mode, Next.js, Vitest, Playwright, and ESLint flat config.

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## ESLint standards

`eslint.config.mjs` applies the Next.js core web vitals and TypeScript rule sets plus project guardrails:

- source files under `app/`, `src/`, `tests/`, and `e2e/` are capped at 400 non-blank, non-comment lines;
- functions warn after 120 non-blank, non-comment lines to encourage component and domain decomposition;
- complexity, nesting depth, and parameter count warnings highlight maintainability risks;
- unused variables, floating promises, misused promises, and inconsistent type imports are enforced;
- console usage is limited to warnings and errors;
- app-layer imports are restricted so domain logic does not depend on React components or route handlers.

Large reference documents such as `SRS.md` are intentionally outside the source-file line cap because they are product contracts rather than runnable code.
