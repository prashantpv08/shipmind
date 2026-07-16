# Axiom Hackathon Day 1 Plan

## Scope Guardrails

This plan is constrained to one polished three-minute demo over four days. Day 1 implements only the fixture-backed NotifyFlow brief analysis journey in a single Next.js App Router application using TypeScript strict mode, pnpm, Zod, local fixture data, and in-memory/browser-local demo state.

Day 1 explicitly excludes authentication, organizations, multi-tenancy features beyond labeling the sample brief content, external databases, Prisma/PostgreSQL/Supabase/Firebase, microservices, Python backends, third-party integrations, code generation, architecture generation, artifact export, cloud deployment, security scanning, test-runner orchestration, live OpenAI calls, and P1/P2 requirements.

## Day 1 Vertical Slice

1. Create one Next.js App Router application.
2. Define canonical Zod schemas for Project, SourceDocument, SourceSpan, Requirement, NonFunctionalRequirement, Assumption, Risk, Gap, AnalysisRun, and ReadinessScore.
3. Load the built-in NotifyFlow demo project and original brief.
4. Implement an AnalysisProvider interface with a working FixtureAnalysisProvider and a LiveAnalysisProvider stub only.
5. Validate fixture analysis, including source-span text matching against the original brief.
6. Calculate readiness deterministically in application code.
7. Render a focused desktop demo UI with brief, analysis progress, grouped findings, provenance/status indicators, readiness breakdown, source evidence panel, empty/loading/success/failure states, and reset.
8. Add unit tests for fixture validation, malformed fixture rejection, invalid source spans, readiness scoring, and state preservation after failed analysis.
9. Add one Playwright happy-path test for the complete NotifyFlow journey.
10. Verify lint, typecheck, unit tests, e2e test, and production build.

## Day 1 Stop Condition

Stop once the fixture-backed journey works without an API key and verification is complete. Do not begin clarification questions, architecture comparison, ADRs, enterprise artifacts, code generation, tool execution, or Why / Why Not / Proof Explorer.
