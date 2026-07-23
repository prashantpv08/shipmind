# Model catalog foundation

## User outcome

An authenticated organization member can inspect the exact model-provider lifecycle and Economy/Balanced/Best policy used by Axiom. The page makes disabled candidates, missing evidence, and the non-billable local fixture explicit. It cannot configure credentials, change policy, initiate a paid call, or deploy anything.

## Acceptance criteria

- Provider-neutral generation request, structured-output, tool, result, usage-evidence, and error contracts are runtime validated.
- The deterministic fixture is the only executable adapter and reports usage as `NOT_APPLICABLE` rather than inventing tokens or costs.
- PostgreSQL stores providers, immutable model definitions, capabilities, context limits, pricing status, data policy, regions, evaluation status, and one organization tier policy.
- Database and runtime validation reject an enabled candidate or a tier that references a disabled/missing model.
- OpenAI and Groq remain disabled candidates with no guessed model definition.
- Every catalog read is authenticated, permission checked, organization scoped, `no-store`, and validated again by the web BFF.
- Viewer through owner roles can read model availability; no role can mutate it in this slice.
- Local provisioning is restricted to localhost `axiom` databases, does not overwrite a non-fixture policy, and records an immutable audit event on creation.
- Migration rollback succeeds before organization policy exists and refuses to discard an existing policy.

## Platform changes

- `src/agent-kernel/` contains the provider-neutral contract and deterministic fixture adapter.
- `src/model-catalog/` contains the domain response schema, scoped repository, application service, and protected API controller.
- `drizzle/0012_model_catalog.sql` seeds `LOCAL_FIXTURE`, `OPENAI`, and `GROQ` providers plus the sole executable local fixture definition.
- `scripts/provision-local-model-policy.ts` creates the local organization's three-tier fixture policy and audit event.
- `GET /api/v1/organizations/:organizationId/models/catalog` returns the qualified catalog and exact policy.

## Web changes

- `/account/organizations/:organizationId/models` is a dynamic server-rendered view with explicit loading, failure, missing-policy, denied, candidate-disabled, and ready states.
- `/api/platform/organizations/:organizationId/models/catalog` remains a thin same-origin BFF read. It forwards the server-only opaque session and rejects malformed platform responses.
- The account organization list links every authorized member to the model view.

## Local operation

From `axiom-platform`:

```bash
pnpm db:up
pnpm db:migrate
pnpm models:local-provision
pnpm dev
```

From `shipmind` / the current web migration repository:

```bash
AXIOM_PLATFORM_URL=http://127.0.0.1:4100 AXIOM_LOCAL_AUTH_ENABLED=true pnpm dev
```

Then open `/account/organizations/ORG-LOCAL-DEVELOPMENT/models` after local sign-in.

## Verification evidence

The provider contract unit test checks deterministic structured output, cancellation/error boundaries, and non-fabricated usage. PostgreSQL integration tests cover catalog contents, viewer access, cross-tenant denial, enablement constraints, and guarded rollback. The web test covers BFF forwarding, invalid platform-response rejection, and malformed tenant scope. The repository quality commands and visible local flow are recorded in the completion handoff for this milestone.

## Known gaps

- The Agent Kernel router, validator, trace writer, evidence writer, and budget integration are not implemented.
- Ticket generation is not yet connected to this adapter contract.
- No OpenAI or Groq SDK, credential, hosted model, pricing, data-policy approval, evaluation score, or provider call is present.
- Administrator policy mutation, model qualification runs, circuit breakers, retry/fallback, and model-call persistence remain subsequent Milestone 4 slices.

