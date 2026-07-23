# ADR 0015: Transactional product-credit reservation and immutable usage ledger

## Status

Accepted for the commercial modular-monolith foundation.

## Context

Axiom must prevent chargeable AI work from exceeding an organization’s approved budget while preserving raw provider measurements. The launch product will use hosted model providers, but provider choice and commercial subscription vendor are not finalized. The current fixture ticket generator is local and non-billable, so inventing token or cost rows for it would violate the evidence contract.

## Decision

- Product credits are integer units. Provider and tool costs are stored separately as integer currency micros alongside raw input and output tokens.
- Each organization billing period has one credit balance with allocated, reserved, and consumed units.
- Chargeable workflows must call the backend billing application service to reserve estimated credits before provider work begins.
- Reservation approval locks the organization balance row, validates the active subscription and AI entitlement, checks the per-request ceiling and remaining organization-period balance, and commits the reservation, ledger entry, and audit event in one transaction.
- Reconciliation may charge no more than the approved reservation. It releases the difference, stores the exact measured usage and outcome, and writes a second immutable ledger entry and audit event in one transaction.
- Reservation and reconciliation retries are content-hash idempotent. Changed retries fail instead of silently altering accounting evidence.
- The web application provides only a tenant-authorized read view. It does not own billing rules or expose a manual charge simulator.
- The initial `LOCAL_DEVELOPMENT` plan has no price and is provisioned only by a localhost-restricted script. It is not a commercial price commitment.

## Consequences

- Concurrent requests cannot overspend the same organization balance.
- Failed, cancelled, cached, retried, fallback, and tool usage can be retained without conflating product credits with provider invoices.
- Daily, per-user, and per-project limits, expired-reservation recovery, administrator budget mutation, subscription-provider adapters, and authenticated webhooks remain required before the milestone is complete.
- The Agent Kernel must depend on the exported billing application service before any paid model adapter can be enabled.
