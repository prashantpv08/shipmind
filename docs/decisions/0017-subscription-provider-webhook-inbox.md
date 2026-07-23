# ADR 0017: Subscription-provider boundary and authenticated webhook inbox

## Status

Accepted — 2026-07-24

## Context

Axiom needs subscription state without coupling billing rules to a payment vendor. Incoming webhook bodies and headers are untrusted, delivery is at least once, events can arrive concurrently or out of order, and an authenticated event can still reference the wrong tenant or an unknown subscription.

No commercial subscription vendor has been selected. A local fixture must therefore prove the contract without claiming vendor integration or contacting an external system.

## Decision

- Provider-specific signature verification and payload translation live behind `SubscriptionProviderAdapter`.
- The launch fixture adapter is disabled by default, restricted to local configuration, and uses a dedicated secret of at least 32 bytes.
- The fixture signs the timestamp and exact raw HTTP body with HMAC-SHA-256, compares signatures in constant time, and rejects delivery timestamps outside a five-minute window.
- Authenticated payloads pass strict Zod validation and a 64 KiB bound before database processing.
- A provider event can mutate only a subscription already linked by organization, provider, external customer ID, and external subscription ID. Payload identifiers alone cannot discover or reassign another tenant’s subscription.
- `subscription_webhook_events` is the durable inbox. Provider plus external event ID is unique. Exact replays return the stored receipt without another subscription, balance, policy, or audit mutation. Reusing an event ID with different content fails closed.
- Subscription snapshots are applied transactionally with plan validation, current-subscription conflict checks, safe period-balance creation, allocation protection, policy clamping, row-version increments, and audit evidence.
- Events older than the last applied provider timestamp are retained as `IGNORED`; known processing failures are retained as `FAILED` and can be retried safely.
- The local CLI previews the exact normalized event and requires the same event ID and occurrence timestamp before `--apply` is accepted.

## Security basis

- [RFC 9421](https://www.rfc-editor.org/rfc/rfc9421.html) documents HMAC-SHA-256, signature timestamps, and nonce-style replay controls for HTTP messages.
- [Stripe’s webhook documentation](https://docs.stripe.com/webhooks?lang=node) independently documents signing the raw body, timestamp tolerance, endpoint-specific secrets, replay resistance, and prompt acknowledgement. It is a design reference only; Stripe is not selected or integrated.
- The [Standard Webhooks specification](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md) documents unique message IDs, timestamps, signatures, and secret rotation considerations.

## Consequences

- Subscription business rules remain provider-neutral and testable without a provider SDK.
- The local fixture proves authentication, deduplication, concurrent replay, out-of-order delivery, tenant isolation, failure retention, audit, migration, and rollback behavior.
- The selected commercial adapter must use that provider’s official verification library or documented algorithm and repeat the contract suite.
- The selected provider integration should persist and acknowledge valid deliveries quickly, then use the durable worker path for complex processing. This local fixture processes one bounded database transaction synchronously and is not the production delivery topology.
- Secret rotation, checkout, invoices, tax, refunds, customer portal, provider reconciliation, and production webhook operations remain unimplemented.
