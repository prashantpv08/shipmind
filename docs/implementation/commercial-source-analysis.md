# Commercial source ingestion and durable analysis

## Outcome

A newly created organization project can upload a bounded product source through the web, retain an immutable local content reference and exact SHA-256 provenance, queue analysis without tying work to the browser request, and receive a canonical graph plus deterministic readiness from a separately runnable Node worker.

## Platform boundary

The authoritative implementation is in `axiom-platform/src/sources`. Next.js only validates its browser-facing contract, forwards the HTTP-only session, and renders states. The old `/api/projects/:id/sources` and `/analyze` prototype routes remain temporarily for non-commercial prototype parity and are not called by the new account project flow.

Supported bounded inputs are PDF, DOCX, Markdown, plain text, CSV, JSON, and YAML, with a 10 MB per-source limit and 250,000 extracted-character limit. Local raw bytes are written with create-only semantics beneath the configured source root. PostgreSQL stores stable source identity, logical version, uploader, content hash, extraction result, validator, and immutable relative reference.

`axiom-bounded-source-validator-v1` validates supported type, non-empty content, name safety, and size. It is not labeled as an antivirus or malware scan. A qualified scanning adapter and production object-storage adapter remain launch work.

## Durable analysis

The API returns HTTP 202 with an `ANRUN` ID. PostgreSQL permits only one queued or running analysis per organization project. The worker leases with `FOR UPDATE SKIP LOCKED`, records attempts, rechecks the exact ordered source snapshot before commit, and persists graph, entities, gaps, clarification questions, readiness, project lifecycle, run result, and audit evidence transactionally.

Visible states are `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, and `CANCELLED`. Cancellation prevents graph commit when observed before the transaction. A changed source snapshot fails honestly and must be requeued. Uploading a new source returns the project to `SOURCES_READY`, blocking stale artifact and architecture generation until a new graph is committed.

The current `axiom-deterministic-grounded-v1` compiler extracts exact source spans and creates explicit UNKNOWN gaps with deterministic readiness. It is a non-billable local workflow fixture, not a promoted AI model and not evidence of production accuracy.

## Verification evidence

- Platform lint and strict typecheck pass.
- Platform unit tests pass, including exact span and unsupported-type behavior.
- PostgreSQL source/analysis integration tests cover idempotency, versioning, role denial, tenant denial, one-active-run enforcement, cancellation, worker commit, graph/readiness persistence, and audit actions.
- The full platform PostgreSQL suite passes 68/68 after migration `0016_source_analysis_runs`, including executable rollback.
- The platform production TypeScript build passes.
- Web BFF tests cover bounded forwarding, same-origin protection, idempotency, durable-run validation, and malformed provider responses.

No Vercel or AWS deployment, paid model call, connector write, or cloud resource was created.
