# Scoped budget controls and expired-reservation recovery

## User outcome

Organization owners and administrators can review and lower daily organization, user, and project product-credit limits without exceeding plan entitlements. They see an exact confirmation before mutation, receive honest stale/unknown-result states, and can safely release credits held by expired reservations. Chargeable work is blocked transactionally when any applicable hard limit is exceeded.

## Implemented scope

- Migration `0010_scoped_budget_controls` adds versioned organization policies, plan ceilings, `EXPIRED` reservation state, and immutable `EXPIRATION` evidence.
- Reservation enforcement covers per-request, organization billing-period, organization-daily, user-daily, and project-daily limits.
- The organization balance row serializes concurrent approval decisions.
- Expired reservations are recovered before a new reservation and through an explicit owner/administrator endpoint.
- Policy updates require authorization, current ETag, exact idempotent replay, plan-ceiling validation, and audit evidence.
- The owner/administrator budget page shows daily remaining credits, scoped controls, expired-reservation warnings, exact previews, loading, success, validation, stale-write, failure, unknown-outcome, cancellation, and safe-retry states.
- The Next.js BFF validates same-origin mutations and platform responses; the NestJS platform owns all budget rules.

## Local verification

From `axiom-platform`:

```bash
pnpm db:migrate
pnpm billing:local-provision
pnpm test:db
pnpm check
```

From the web repository:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
AXIOM_COMMERCIAL_E2E=true pnpm test:e2e -- e2e/commercial-auth.spec.ts
```

All commands stay local. The `LOCAL_DEVELOPMENT` plan has no commercial price and neither provisioning nor verification calls a paid model, payment provider, AWS, or Vercel.

## Verified evidence

- Migration `0010` applied to local PostgreSQL and the idempotent local policy provisioner completed.
- Platform lint, strict TypeScript check, unit tests, deterministic seven-case ticket evaluation, PostgreSQL integration tests, and production build pass.
- PostgreSQL integration result: 5 files and 44 tests, including 8 cost-governance cases for scoped limits, concurrency, policy replay/staleness, plan ceilings, expiry, immutable evidence, late reconciliation, and rollback.
- Web lint, strict TypeScript check, 109 unit tests, production build, and all 10 local Playwright flows pass.
- The browser flow verifies the exact budget-control preview and cancellation without creating a billing side effect.

## Remaining Milestone 3 work

- Select and integrate the subscription provider behind an interface.
- Authenticate, deduplicate, and replay-test provider webhooks.
- Wire the Agent Kernel through reservation and reconciliation before enabling any paid model adapter.
- Add provider-specific end-to-end reconciliation scenarios without fabricating provider measurements.
