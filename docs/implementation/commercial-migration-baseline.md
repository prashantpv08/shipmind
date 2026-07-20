# Commercial migration baseline

- Date: 2026-07-20
- Scope: Commercial Milestone 0
- Environment: Local macOS workspace; no external writes or deployment
- Authoritative target: `SRS.md` 2.0 and ADR 0010

## Outcome

The prototype is healthy enough to begin the PostgreSQL migration. Its canonical graph, schemas, stable IDs, approval invalidation, fixed-command verification, and traceability boundaries should be preserved. Its JSON/Blob persistence, shared integration credentials, unauthenticated routes, Vercel branches, and Groq-only configuration must not become commercial foundations.

## Current data inventory

The current store is one Zod-validated `ProjectDatabase` version 1 document. Local mode writes `.axiom-data/projects.json` through a serialized in-process mutation queue and atomic file rename. The hosted prototype can instead write the same document to Vercel Blob with ETag preconditions.

Snapshot observed during this baseline:

| Collection | Count |
|---|---:|
| Workspaces | 1 |
| Projects | 24 |
| Sources | 23 |
| Knowledge graphs | 23 |
| Architecture briefs | 0 |
| ARB decisions | 19 |
| Documents | 246 |
| Document approvals | 14 |
| Notion publications | 5 |
| Jira publications | 1 |
| Wireframe revisions | 9 |

The local `.axiom-data` tree contained 30 files totaling approximately 3.3 MB. No local persisted verification report existed under `.axiom-data/verification` at the snapshot time. Counts are evidence for migration planning, not fixed acceptance values.

## Persistence and object boundaries

| Current boundary | Current implementation | Commercial target | Primary migration risk |
|---|---|---|---|
| Project database | One JSON document in local filesystem or Vercel Blob | Normalized PostgreSQL repositories | Preserving stable IDs, graph versions, approval hashes, defaults, and ordering semantics |
| Uploaded sources | Local files or private Blob objects; extracted text duplicated in the database | S3 object reference plus PostgreSQL metadata and bounded extracted content | Orphaned objects, path translation, delete ordering, and content/hash mismatch |
| Verification reports | Local JSON files or Vercel Blob objects | PostgreSQL run/evidence metadata plus immutable S3 raw-output objects | Losing immutable measurements or linking evidence to the wrong generation |
| Generated workspace | Fixed local sandbox or ephemeral Vercel Sandbox | Approved local/customer runner initially; durable job boundary later | Weakening path, manifest, command, timeout, or secret-stripping controls |
| Wireframe revisions | Arrays embedded in the JSON database | Organization/project-scoped PostgreSQL rows; large scene payload policy to be decided | Large rows, revision ordering, and project deletion behavior |

## Integration inventory

| Integration | Current authorization | Current side effect | Commercial replacement |
|---|---|---|---|
| Groq | One server environment key and one configured model | Model calls for analysis, clarification, and revision | Organization policy plus provider-neutral Agent Kernel and model catalog |
| Jira Cloud | Shared base URL, email, API token, and project key | Explicit Epic then Story/Task creation | Organization-scoped installation, field mapping, outbox, reconciliation, and audit |
| Notion | Shared internal token and parent page | Explicit project/document publication | Optional organization-scoped connector after launch priorities |
| Trello | Not implemented | None | Organization-scoped connector using normalized WorkItems |
| Vercel Blob/Sandbox | Environment-selected hosted adapters | Object persistence and fixed verification | S3 and approved runner; remove only after parity evidence |

Integration credentials are not migration data. Existing environment secrets shall not be imported into customer tables. Publication metadata may be migrated as historical references after validation.

## API and authorization inventory

- The application exposes 29 Next.js route handlers.
- Project routes accept project IDs and some workspace IDs directly.
- There is one default workspace and no User, Organization, Membership, Session, or role policy.
- Repository functions validate some project/workspace consistency but do not authorize an actor.
- Project deletion is immediate and unauthenticated; it removes database records first and then attempts source-object deletion.
- Jira publication requires confirmation of the exact plan hash, which is a useful side-effect boundary to preserve.
- Notion publication is explicit but does not have an equivalent immutable client confirmation hash.
- No commercial route versioning or common authenticated request context exists.

No existing workspace identifier shall be treated as proof of organization authorization during migration.

## Route groups

| Group | Routes | Data/side-effect risk |
|---|---:|---|
| Legacy sample analysis, artifact, code, verification, Why, export, and reset | 7 | Fixed sample state, generated workspace, evidence files |
| Workspace and project lifecycle | 4 | Unauthenticated read/create/delete and default workspace assumptions |
| Project analysis, clarification, documents, architecture, and wireframes | 12 | Graph-version transactions, approvals, revision ordering, source uploads |
| Delivery planning and external publication | 4 | Jira side effects and publication idempotency |
| Integration status | 2 | Shared credential configuration metadata |

## Customer-data boundaries

Potential customer data currently includes raw source files, extracted text, exact quotations, project knowledge, answers, documents, architecture decisions, wireframe scenes, Jira/Notion references, generated code, command output, and verification evidence.

Required commercial protections before onboarding customers:

1. Every row and object key belongs to an organization.
2. Every application service receives an authenticated actor and organization context.
3. Repository queries deny unscoped access.
4. Connector secrets use approved encrypted secret storage.
5. Logs, traces, exports, model context, and child processes receive only necessary data.
6. Deletion becomes authorized, auditable, recoverable where policy allows, and reconciled across PostgreSQL and object storage.

## Migration sequence and rollback checkpoints

### Checkpoint 0 — Frozen legacy snapshot

1. Stop local mutations during import.
2. Validate the entire JSON document with `ProjectDatabase`.
3. Record its SHA-256 hash, collection counts, source-object manifest, and application version.
4. Copy the JSON document and source objects to a read-only backup location outside the live data path.

Rollback: continue using the untouched legacy store. No schema or runtime switch has occurred.

### Checkpoint 1 — PostgreSQL schema in shadow mode

1. Add migrations and repository contracts without changing current route behavior.
2. Create organization, project, graph, artifact, publication, audit, outbox, and usage foundations.
3. Test migrations against disposable PostgreSQL databases.

Rollback: remove the unused shadow database. The legacy store remains authoritative.

### Checkpoint 2 — Dry-run importer

1. Parse the frozen JSON snapshot with current schemas.
2. Translate records deterministically into PostgreSQL rows without external side effects.
3. Validate foreign keys, stable IDs, graph versions, document hashes, approvals, and publication references.
4. Produce a comparison report without logging customer content.

Rollback: truncate or recreate only the disposable shadow database. Do not alter the legacy snapshot.

### Checkpoint 3 — Read parity

1. Load representative projects through both repository implementations.
2. Compare normalized bundles, current-version selection, approval invalidation, and compiled artifact hashes.
3. Resolve differences explicitly; do not normalize away unsupported legacy data silently.

Rollback: keep legacy reads active. PostgreSQL remains non-authoritative.

### Checkpoint 4 — Controlled local cutover

1. Pause mutations.
2. Take a final validated snapshot and import it.
3. Enable PostgreSQL reads and writes in local development through one explicit configuration.
4. Run unit, integration, E2E, build, export, deletion, and fixed-verification checks.

Rollback before any PostgreSQL-only write: switch back to the final legacy snapshot. After PostgreSQL-only writes exist, prefer a forward fix or an explicitly tested reverse exporter; never silently discard the new writes.

### Checkpoint 5 — Object-storage and infrastructure replacement

Replace Vercel Blob/Sandbox behavior only after S3 and runner parity tests cover upload, hash verification, deletion, failure, evidence, timeout, and secret boundaries. Remove Vercel dependencies in a separate verified change.

Rollback: retain the last verified local path. Do not re-enable a hosted Vercel deployment.

## Baseline verification

| Command | Result |
|---|---|
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` | Passed: 12 files, 82 tests |
| `pnpm build` | Passed outside the restricted tool sandbox; Turbopack required a local helper port. One existing broad file-tracing warning remains. |
| `pnpm test:e2e` | Passed: 5 tests after updating the test to the current accessible template structure and required architecture-input approval step |
| `pnpm sandbox:build` | Passed |
| `pnpm sandbox:test` | Passed: 2 files, 6 tests |
| `pnpm sandbox:coverage` | Passed: 97.56% lines, 78.57% branches, 100% functions, 91.66% statements |

The first E2E baseline run exposed stale test assumptions: template cards are now articles with accessible controls, and architecture approval correctly requires confirmed architecture inputs. The test now follows those visible requirements and the complete suite passes.

## Known baseline gaps

- The production build reports a broad output-file-tracing warning through the demo-reset import path.
- There are no PostgreSQL migrations or integration-test commands yet.
- There is no commercial authenticated request context or organization authorization.
- Current Jira idempotency is application-state based and cannot safely reconcile a crash after remote creation but before local persistence.
- Notion publication lacks the same exact-plan confirmation boundary as Jira.
- External source deletion is not transactional with database deletion.
- Vercel packages and branches remain in code until their replacements are implemented and verified.

These gaps are inputs to later milestones and do not authorize speculative cleanup during the PostgreSQL foundation slice.
