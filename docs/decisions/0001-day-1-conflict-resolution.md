# Decision 0001: Day 1 merge conflict resolution

## Status

Accepted on 2026-07-16.

## Context

Pull request #2 introduced the Day 1 NotifyFlow implementation while the repository already contained the detailed hackathon planning documents from the earlier planning work. The conflict resolution must preserve both sides:

- the planning contract in `HACKATHON_PLAN.md`, `SRS.md`, `IMPLEMENTATION_BACKLOG.md`, and `DEMO_SCENARIO.md`;
- the Day 1 runnable implementation that adds the fixture-backed requirements analysis, source-span validation, readiness scoring, UI, and tests.

Losing either side would break the Day 1 handoff: the implementation needs the planning contract, and the planning contract needs the runnable Day 1 slice.

## Decision

Keep the existing planning documents intact and add the Day 1 implementation as application code, configuration, tests, and README setup notes. Add a dependency-free conflict-marker check so future updates can verify that no unresolved Git conflict markers remain in tracked text files.

## Consequences

- Day 1 implementation files are retained rather than replaced by the planning-only branch.
- Planning documents remain the authoritative contract for later milestones.
- `node scripts/check-conflicts.mjs` can be run even before package installation because it only uses Node built-ins and Git.
