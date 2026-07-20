# ADR 0014 — Webpack fallback for local production builds

**Status:** Accepted

**Date:** 2026-07-21

## Context

Next.js 16.2.10 defaults `next build` to Turbopack. In this migration repository, repeated local builds remained in the optimized-compilation phase beyond bounded verification windows and emitted no actionable diagnostic. The prototype application still bundles large Excalidraw and Mermaid browser dependencies that will be reduced as the web repository is separated.

The installed Next.js CLI exposes `--webpack` as a supported production-build option. That mode surfaced an existing invalid PostCSS configuration; after correcting the configuration to export `plugins`, Webpack compiled the application, ran TypeScript, generated 14 static pages, and completed build-trace collection.

## Decision

The repository's required `pnpm build` command runs `next build --webpack` until the separated commercial web repository can re-evaluate Turbopack with the reduced dependency graph.

This changes only the local production bundler. It does not change the Next.js application architecture, runtime API, deployment target, or the prohibition on Vercel deployment.

## Consequences

- The required build command is deterministic and verified locally.
- Development may continue using the Next.js default development bundler.
- The build may be slower than a healthy Turbopack build.
- Re-enabling Turbopack requires a measured passing production build; it must not be assumed from development-server success.

## Evidence

- `pnpm exec next build --help` in the installed Next.js 16.2.10 package listed `--webpack` as a supported option.
- `pnpm exec next build --webpack` completed successfully on 2026-07-21 after the PostCSS correction.
