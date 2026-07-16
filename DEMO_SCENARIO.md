# Axiom Demo Scenario: NotifyFlow

## Demo Goal

Prove one complete lifecycle:

```text
Ambiguous brief
-> gaps and NFRs
-> clarifications
-> architecture options
-> approved decision
-> enterprise artifacts
-> generated API code
-> real test evidence
-> grounded Why / Why Not / Proof answers
```

## Product Brief

Build a multi-tenant customer notification service for a SaaS product. It must support email and SMS, retries, delivery-status tracking, audit logs, and a simple admin dashboard. The first release should run on AWS and remain below USD 1,000 per month. We expect up to one million notifications per month. Customers must not see another tenant's data. The product team wants the first usable release quickly and expects the service to scale later.

## Intended Analysis

The system should identify:

### Functional Areas

- submit notification;
- retrieve status;
- route by email or SMS;
- retry provider failures;
- track status;
- preserve audit history;
- isolate tenants;
- provide an admin dashboard.

### Missing Decisions

- peak request rate;
- delivery latency;
- retry policy;
- delivery semantics;
- idempotency;
- message ordering;
- retention;
- data residency;
- provider choice and outage handling;
- authentication and authorization;
- opt-out and consent behavior;
- dashboard accessibility.

## Demo Answers

Use these answers for a deterministic presentation:

1. Peak load: 100 requests per second, bursts to 300.
2. Delivery: accept request within 250 ms; complete delivery or final failure within 60 seconds, excluding a provider-wide outage.
3. Delivery semantics: at-least-once processing with idempotency key support.
4. Retry: three attempts with exponential backoff, then dead-letter queue.
5. Retention: metadata 90 days, message body 7 days.
6. Tenant identity: derived from authenticated token, not trusted from request body.
7. Initial region: one approved AWS region.

## Architecture Options

### Option A: Serverless Event-Driven

- API Gateway
- Lambda ingestion
- SQS
- provider adapters
- DynamoDB or managed data store
- CloudWatch

Expected recommendation under current assumptions.

### Option B: Containerized Modular Service

- ECS/Fargate
- SQS
- PostgreSQL
- modular service boundaries
- managed monitoring

Viable alternative with more operational baseline but easier long-running workflows.

### Option C: Kafka Microservices

- separate ingestion, routing, delivery, status, and audit services
- Kafka/MSK
- dedicated persistence and observability

Expected rejection for MVP scale and delivery timeline. Reconsider if sustained throughput, cross-system streaming, or ordering needs materially increase.

## Selected Vertical Slice

Implement:

- `POST /notifications`
- `GET /notifications/{id}`
- input validation
- trusted tenant context
- idempotency key
- audit event
- queue/provider abstraction
- initial status
- tenant-isolated retrieval
- unit tests
- API tests

External email and SMS delivery must be mocked.

## Required Real Checks

- TypeScript build or typecheck
- Unit test execution
- API test execution
- Coverage collection
- P1: security scan
- P1: performance benchmark

## Suggested Three-Minute Demo

### 0:00 to 0:25: The Problem

"AI can generate documents and code, but teams still lose the reasoning that connects business intent, architecture, implementation, and proof. Axiom creates a living engineering twin."

### 0:25 to 0:55: Intent and Gaps

Open NotifyFlow. Start analysis. Show functional requirements, NFR gaps, source evidence, and readiness score.

### 0:55 to 1:15: Clarification

Answer two or three blocking questions. Show readiness increase and updated requirements.

### 1:15 to 1:45: Architecture Decision

Compare three options. Open "Why Not Kafka?" Approve serverless event-driven. Show ADR and reconsideration trigger.

### 1:45 to 2:05: Enterprise Artifacts

Show SRS, HLD, OpenAPI, test strategy, backlog, and Engineering Constitution compiled from one graph.

### 2:05 to 2:35: Build and Proof

Generate the API slice. Inspect diff. Run real unit, API, and coverage checks. Show exact command output and metrics.

### 2:35 to 3:00: Why Explorer

Ask:

- Why did we choose a queue?
- Why not Kafka?
- Which requirement caused tenant isolation?
- What proves idempotency works?

End with:

"Axiom does not only generate software artifacts. It preserves why decisions were made, why alternatives were rejected, and what evidence proves the system works."

## Demo Safety

- Use synthetic data only.
- Keep a valid cached analysis for provider outage fallback.
- Clearly label cached output as `Demo Cache`.
- Do not use pre-recorded test results. Verification must execute during the demo or be shown from a timestamped run created by the deployed system.
- Keep one intentionally unresolved item to demonstrate honest uncertainty.
