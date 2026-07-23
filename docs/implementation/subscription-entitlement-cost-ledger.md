# Subscription, entitlement, and cost-ledger foundation

## User outcome

Organization owners and administrators can inspect the current local plan, AI entitlement, product-credit allocation, active reservations, reconciled consumption, alert status, and recent immutable usage evidence. Chargeable backend workflows now have a tested reservation and reconciliation boundary to call before a real model provider is introduced.

## Implemented scope

- PostgreSQL records for plans, plan entitlements, subscriptions, billing-period credit balances, usage reservations, and immutable usage ledger entries.
- A localhost-only provisioning command for the non-commercial `LOCAL_DEVELOPMENT` plan.
- Tenant-scoped owner/administrator overview API at `GET /api/v1/organizations/:organizationId/billing/overview`.
- Backend-only reservation and reconciliation application methods with:
  - active subscription and AI-entitlement checks;
  - per-request and organization billing-period hard limits;
  - row-lock serialization for concurrent reservations;
  - exact idempotent replay and changed-retry rejection;
  - rejection when actual cost exceeds the approved reservation;
  - product credits plus raw tokens, provider cost, tool cost, currency, outcome, retries, fallback, and cache evidence;
  - organization, optional project, user, workflow, provider, model, generation, and run attribution;
  - transactional audit events.
- Thin Next.js BFF validation and a server-rendered plan/usage page with loading, failure, unauthorized, unprovisioned, available, approaching, exhausted, and empty-ledger states.

## Local commands

From `axiom-platform` after PostgreSQL is running:

```bash
pnpm db:migrate
pnpm billing:local-provision
pnpm auth:local-session
pnpm dev
```

From the web repository:

```bash
AXIOM_LOCAL_AUTH_ENABLED=true AXIOM_PLATFORM_URL=http://127.0.0.1:4100 pnpm dev
```

Open `/account`, connect the local session, and choose **View budget**. No paid provider or cloud resource is contacted.

## Verified evidence

- Platform TypeScript check passes.
- PostgreSQL integration suite: 5 files and 41 tests pass, including tenant authorization, concurrency, idempotency, reconciliation, overrun protection, immutability, and migration rollback.
- Web lint and TypeScript checks pass.
- Web unit suite: 18 files pass, 1 file is intentionally skipped; 106 tests pass and 5 are intentionally skipped.
- Next.js production build passes and includes the dynamic billing page and BFF route.
- Focused commercial Playwright flow passes locally: sign-in, budget page, project reads, cross-tenant denial, and sign-out (1/1).

## Deliberately incomplete

- No commercial plan prices or checkout flow are claimed.
- No subscription-provider adapter or webhook exists yet.
- Daily, per-user, and per-project budgets are not yet enforced.
- Administrators cannot mutate allocations or alert thresholds from the UI yet.
- Expired reservation recovery is not yet implemented.
- The existing local fixture generator remains non-billable and correctly creates no fake cost rows.
