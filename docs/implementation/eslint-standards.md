# ESLint Standards

Axiom uses a dedicated lint config at `eslint.axiom.config.mjs` so the branch can keep the current `main` branch `eslint.config.mjs` unchanged and avoid merge conflicts.

The `pnpm lint` command points at this dedicated config and applies these guardrails:

- source files under `app/`, `src/`, `tests/`, and `e2e/` are capped at 400 non-blank, non-comment lines;
- functions warn after 120 non-blank, non-comment lines;
- complexity, nesting depth, and parameter count warnings highlight maintainability risks;
- unused variables, floating promises, misused promises, and consistent type imports are enforced;
- console usage is limited to warnings and errors;
- domain and service modules may not import from React components or Next app routes.

Large reference documents such as `SRS.md` are product contracts and are intentionally outside the source-file line cap.
