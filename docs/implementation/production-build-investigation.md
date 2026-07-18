# Production build investigation

- Date: 2026-07-18 (Asia/Kolkata)
- Branch: `codex/production-build-investigation`
- Trigger: the P0 acceptance audit could not obtain a completed `pnpm build`

## Finding

The application-level build blocker was the custom PostCSS configuration. The apparent multi-minute stall in the acceptance audit was prolonged by the restricted execution environment: Turbopack's PostCSS evaluator creates a helper process that binds a loopback port, which the sandbox denied with `EPERM`.

`postcss.config.mjs` exported an empty object. Next.js 16 requires a custom PostCSS configuration to export a `plugins` key. A webpack comparison build surfaced the deterministic error for every imported CSS file:

```text
Error: Your custom PostCSS configuration must export a `plugins` key.
```

The application CSS currently contains no Tailwind directives or PostCSS transforms, so the smallest valid configuration is an explicit empty plugin map. No package or generated-workspace rule changes are required.

## Diagnostic notes

- A restricted clean Turbopack build eventually reported that its PostCSS helper could not bind a local port (`EPERM`).
- A supported webpack comparison reached the explicit PostCSS configuration error.
- Sampling the compiler showed its main event loop and SWC worker pool waiting rather than performing sustained CPU work.
- An unrestricted corrected Turbopack build completed successfully in 25.7 seconds before trace-warning cleanup.
- The fixed verification workspace and reset roots were made statically traceable while preserving runtime confinement and explicit test-only root overrides.

## Fix

```js
const config = {
  plugins: {},
};
```

This keeps the existing plain-CSS behavior and satisfies both supported Next.js build pipelines.

## Final verification

- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm test` — 9 files, 59 tests passed.
- `pnpm build` — passed in 14.9 seconds with no Turbopack warning.
- `git diff --check` — passed.
