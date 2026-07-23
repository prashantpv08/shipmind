# ADR 0016: Scoped budget policy and reservation expiration

## Status

Accepted — 2026-07-24

## Context

An organization-period balance alone cannot contain one runaway day, user, or project. Axiom also cannot leave abandoned reservations holding credits indefinitely. Policy changes and recovery are billing side effects, so they require server authorization, exact preview, concurrency protection, audit evidence, and safe retry behavior.

## Decision

- Each provisioned organization has one versioned `budget_policies` row with organization-daily, user-daily, project-daily, and alert-threshold controls.
- Plan entitlements are immutable ceilings for customer policy. An organization policy can lower a ceiling but cannot raise it.
- Reservation approval locks the organization balance row and calculates committed daily use from reserved estimates or reconciled actual usage. It enforces organization, user, and project limits in that serialized transaction before creating a reservation.
- UTC calendar days define launch daily limits. The organization billing period remains the longer organization hard boundary.
- Expired reservations become `EXPIRED` with a `CANCELLED` outcome and zero actual credits. Recovery releases the reserved balance and appends immutable `EXPIRATION` ledger and audit events in one transaction.
- A reservation performs recovery before evaluating a new chargeable request. Owners and administrators can also trigger the idempotent recovery operation explicitly.
- Policy mutation requires `BILLING_MANAGE`, the current policy ETag in `If-Match`, a stable idempotency key, and an exact browser preview. The backend is authoritative.
- The web remains a thin BFF and server-rendered view. It does not calculate approval or mutate ledger evidence.

## Consequences

- Concurrent reservations cannot independently approve past organization, user, or project daily limits.
- Abandoned work stops consuming available credits after recovery while its history remains inspectable.
- A future policy scheduler may invoke the same recovery application service; no second release path is needed.
- Launch uses UTC rather than organization-local budget days. Configurable billing time zones require a later explicit contract and migration.
- Subscription-provider adapters and authenticated webhooks remain separate Milestone 3 work.
