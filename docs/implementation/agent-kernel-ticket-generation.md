# Agent Kernel ticket-generation slice

## User outcome

An authorized user chooses Economy, Balanced, or Best and receives an exact quality-gated Agile backlog preview with verifiable generation provenance. No raw provider selection, hosted request, connector write, or cloud deployment occurs.

## Implemented boundary

The Node.js platform now owns this bounded sequence:

1. authorize organization and project access;
2. select the current approved graph context and reject blockers;
3. resolve the requested tier through `ModelPolicy`;
4. fail closed unless the routed provider/model is enabled, structured-output capable, and the allowlisted non-billable fixture;
5. create a running `AgentRun` with context hash, workflow/prompt versions, policy version, actor, and request correlation;
6. invoke the provider-neutral adapter with a 30-second timeout and at most two attempts;
7. append one `ModelCall` for every success or failure;
8. validate `WorkItemBatch v1`, source references, coverage, hierarchy, overlap, dependencies, critical questions, testability, and prohibited evidence claims;
9. complete or fail the run honestly;
10. transactionally persist stable work-item identities, immutable versions, the exact preview, and audit evidence only after validation succeeds.

The exact preview exposes the final run/call IDs, tier, provider, immutable model, prompt/workflow versions, policy version, budget disposition, measured-or-not-applicable usage, attempt count, fallback flag, and latency. Earlier drafts remain readable and are explicitly identified as legacy when this evidence is absent.

## PostgreSQL migration

`0013_agent_kernel_runs` adds immutable prompt and workflow version registries, organization-scoped agent runs, append-only model calls, and an optional run link on work-item generations. Rollback refuses to proceed while run evidence exists; evidence must first follow a future authorized retention workflow.

## Budget integrity

The only executable model has pricing status `NOT_APPLICABLE`. Its run therefore records no reservation and no usage ledger entry. This is intentional: billing records must never imply a charge that did not occur.

A hosted route is rejected before execution. Enabling one requires, in order:

- qualified evaluation evidence and immutable model definition;
- approved provider data policy and region;
- verified price metadata and server-side credentials;
- pre-call product-credit reservation;
- provider-returned usage and cost reconciliation;
- failure, retry, fallback, cancellation, and unknown-outcome tests.

## Local verification

The regression surface includes provider-contract tests, bounded retry tests, work-item/API tests, PostgreSQL tenant and migration tests, web BFF validation, TypeScript, lint, production builds, ticket evaluation, and a local browser flow. These checks make no paid API request.

