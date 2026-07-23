# Subscription adapter and webhook inbox foundation

## User outcome

Axiom now has a provider-neutral, tenant-safe path for receiving subscription snapshots. Local developers can preview and deliver a deterministic signed fixture, observe one real subscription transition, and replay the identical delivery without creating duplicate state or audit evidence.

## Implemented scope

- `SubscriptionProviderAdapter` separates signature/payload behavior from application and persistence rules.
- Local fixture adapter with explicit enable flag, strong server-only secret, exact raw-body HMAC-SHA-256, constant-time comparison, five-minute timestamp tolerance, body-size bound, and strict Zod validation.
- Reversible migration `0011_subscription_webhook_inbox` for provider ordering metadata and the durable webhook inbox.
- Transactional subscription application with exact external identity matching, plan/status/period validation, period balance provisioning, allocation protection, policy clamping, row versions, and immutable audit records.
- Exact replay, changed-payload conflict, concurrent duplicate, out-of-order ignore, tenant-isolation failure, failed-attempt retry, and rollback coverage.
- Preview-first local CLI. No secret, signature, payment, invoice, or external-provider result is exposed to the browser.

## Local operation

The endpoint is unavailable unless both local variables are set on the platform process:

```bash
AXIOM_LOCAL_SUBSCRIPTION_WEBHOOK_ENABLED=true
AXIOM_LOCAL_SUBSCRIPTION_WEBHOOK_SECRET=<at-least-32-random-bytes>
```

Preview an event first:

```bash
pnpm billing:local-webhook -- --event-id=fixture-example
```

Preview mode prints the generated occurrence timestamp. Apply only the exact preview by adding both values it prints:

```bash
pnpm billing:local-webhook -- --apply --event-id=fixture-example --occurred-at=<previewed-ISO-timestamp>
```

The command refuses non-local HTTP endpoints. Repeating the exact apply command returns the original receipt with `replayed: true`.

## Deliberately incomplete

- `LOCAL_FIXTURE` is not a commercial subscription provider.
- No checkout, price, invoice, tax, refund, customer-portal, purchase, or cloud resource exists.
- A commercial provider must be selected explicitly and implemented behind the existing adapter.
- The production adapter must use provider-native authentication, secret rotation, fast acknowledgement plus durable worker processing, provider reconciliation, operational alerts, and provider sandbox evidence.

## Verified evidence

- Migration `0011` applied successfully to local Docker PostgreSQL and the local subscription was idempotently linked to the fixture identity.
- Platform lint, strict TypeScript check, 16 unit tests, deterministic seven-case ticket evaluation, and the production build pass.
- PostgreSQL result: 6 integration files and 49 tests pass, including 5 webhook-inbox scenarios and guarded rollback.
- A real `tsx` platform process on a separate localhost port processed the exact previewed event once. Repeating the identical command returned the same webhook event ID and subscription row version with `replayed: true`.
- The durable inbox retained one attempt for the replayed event and the replay created no second audit event.
