# Architecture and hosting automation boundary

## Decision

Axiom captures a human-confirmed architecture brief covering product surface, budget, monthly hosting ceiling, team skills, expected scale, hosting ownership, provider preference, and mobile capabilities. It compiles three comparable technology and hosting packages and records the selected package in the approved ADR and HLD.

Hosting validation uses conservative planning floors based on currency, product surface, selected package, and expected scale. A static lean site may use a zero-cost CDN tier; dynamic, managed, mobile, growing, and scale-ready workloads require progressively higher ceilings. These floors are planning guardrails rather than provider quotes and exclude promotional discounts, taxes, domains, email, app-store fees, and measured usage charges.

The MVP generates an approval-ready deployment blueprint, connection checklist, environment manifest, CI/CD plan, backup policy, monitoring plan, and rollback expectations. It does not create billable cloud resources, accept production credentials, deploy production workloads, or submit mobile applications to an app store.

## Why

The product contract places real AWS/Azure/GCP provisioning and mobile application generation in P2. Presenting those actions as completed in the P0 MVP would violate the evidence model and cross a financial and operational approval boundary.

## Reconsider when

Add provider adapters only after account authorization, resource allowlists, cost-plan approval, idempotent provisioning, rollback behavior, secret isolation, and real provisioning evidence are implemented and tested.
