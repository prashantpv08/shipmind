import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseHandle, type DatabaseHandle } from '../src/db/client';
import { migrateDatabase } from '../src/db/migrate';
import { applyPrototypeImport, buildPrototypeImportPlan, LOCAL_ORGANIZATION_ID } from '../src/db/prototype-import';
import { PostgresIdempotencyRepository, PostgresOutboxRepository, enqueueOutboxEvent, IdempotencyConflictError } from '../src/db/repositories';
import { organizations, projects, workspaces } from '../src/db/schema';
import { seedLocalDatabase, DEFAULT_WORKSPACE_ID } from '../src/db/seed';
import { PostgresProjectRepository } from '../src/projects/postgres-repository';
import { analyzeProjectSources } from '../src/projects/analyze';
import { ProjectDatabase, ProjectSource } from '../src/projects/schemas';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describePostgres = testDatabaseUrl ? describe : describe.skip;

describePostgres('PostgreSQL commercial foundation', () => {
  let handle: DatabaseHandle;

  async function reset() {
    await handle.pool.query('drop schema if exists public cascade');
    await handle.pool.query('drop schema if exists axiom_internal cascade');
    await handle.pool.query('create schema public');
    await migrateDatabase(handle.db);
  }

  beforeAll(async () => {
    const parsed = new URL(testDatabaseUrl!);
    if (!parsed.pathname.startsWith('/axiom_test')) throw new Error('PostgreSQL integration tests require a dedicated axiom_test database');
    handle = createDatabaseHandle(testDatabaseUrl);
    return async () => handle.pool.end();
  });

  beforeEach(reset);

  it('applies, rolls back, and reapplies the versioned foundation migration', async () => {
    const before = await handle.pool.query<{ table_name: string | null }>("select to_regclass('public.organizations')::text as table_name");
    expect(before.rows[0].table_name).toBe('organizations');

    const downSql = await readFile(resolve('drizzle/0000_slow_weapon_omega.down.sql'), 'utf8');
    await handle.pool.query(downSql);
    const rolledBack = await handle.pool.query<{ table_name: string | null }>("select to_regclass('public.organizations')::text as table_name");
    expect(rolledBack.rows[0].table_name).toBeNull();

    await handle.pool.query('drop schema axiom_internal cascade');
    await migrateDatabase(handle.db);
    const reapplied = await handle.pool.query<{ table_name: string | null }>("select to_regclass('public.outbox_events')::text as table_name");
    expect(reapplied.rows[0].table_name).toBe('outbox_events');
  });

  it('enforces organization scope in repositories and composite foreign keys', async () => {
    await seedLocalDatabase(handle.db);
    const otherScope = { organizationId: 'ORG-OTHER' };
    await handle.db.insert(organizations).values({ id: otherScope.organizationId, slug: 'other', name: 'Other' });
    await handle.db.insert(workspaces).values({ id: 'WS-OTHER', organizationId: otherScope.organizationId, name: 'Other workspace' });
    const repository = new PostgresProjectRepository(handle.db);
    const localProject = await repository.createProject({ organizationId: LOCAL_ORGANIZATION_ID }, 'Local project', DEFAULT_WORKSPACE_ID);
    const otherProject = await repository.createProject(otherScope, 'Other project', 'WS-OTHER');

    expect(await repository.getProject({ organizationId: LOCAL_ORGANIZATION_ID }, localProject.id)).not.toBeNull();
    expect(await repository.getProject({ organizationId: LOCAL_ORGANIZATION_ID }, otherProject.id)).toBeNull();
    expect(await repository.listProjects(otherScope, 'WS-OTHER')).toHaveLength(1);
    await expect(handle.db.insert(projects).values({
      id: 'PROJ-CROSS-SCOPE', organizationId: LOCAL_ORGANIZATION_ID, workspaceId: 'WS-OTHER',
      name: 'Invalid', status: 'DRAFT', graphVersion: 0,
    })).rejects.toThrow();
  });

  it('deduplicates outbox and idempotency records without losing request identity', async () => {
    await seedLocalDatabase(handle.db);
    const scope = { organizationId: LOCAL_ORGANIZATION_ID };
    const outbox = new PostgresOutboxRepository(handle.db);
    const input = {
      aggregateType: 'Project', aggregateId: 'PROJ-1', eventType: 'JiraPublicationRequested',
      idempotencyKey: 'jira:PROJ-1:PLAN-1', payload: { projectId: 'PROJ-1' },
    };
    const first = await handle.db.transaction((tx) => enqueueOutboxEvent(tx, scope, input));
    const repeated = await outbox.enqueue(scope, input);
    expect(repeated.id).toBe(first.id);
    const claimed = await outbox.claimNext();
    expect(claimed).toMatchObject({ id: first.id, status: 'PROCESSING', attempts: 1 });

    const idempotency = new PostgresIdempotencyRepository(handle.db);
    const request = { scope: 'jira.publish', key: 'request-1', requestHash: 'b'.repeat(64), expiresAt: '2026-07-21T10:00:00.000Z' };
    const begun = await idempotency.begin(scope, request);
    const replay = await idempotency.begin(scope, request);
    expect(begun.created).toBe(true);
    expect(replay).toMatchObject({ created: false, record: { id: begun.record.id } });
    await expect(idempotency.begin(scope, { ...request, requestHash: 'c'.repeat(64) })).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  it('round-trips ranked graph children in their canonical order', async () => {
    await seedLocalDatabase(handle.db);
    const scope = { organizationId: LOCAL_ORGANIZATION_ID };
    const repository = new PostgresProjectRepository(handle.db);
    const project = await repository.createProject(scope, 'Ranked graph', DEFAULT_WORKSPACE_ID);
    const source = ProjectSource.parse({
      id: 'SRC-RANKED', workspaceId: DEFAULT_WORKSPACE_ID, projectId: project.id,
      name: 'ranked.txt', kind: 'FILE', mimeType: 'text/plain', size: 92,
      sha256: 'a'.repeat(64), extractedText: 'Customers must submit an application. P95 latency must remain below 300 ms.',
      rawPath: 'uploads/ranked.txt', status: 'EXTRACTED', createdAt: '2026-07-20T10:00:00.000Z',
    });
    await repository.addSources(scope, project.id, [source]);
    const knowledge = analyzeProjectSources(project.id, 1, [source], '2026-07-20T10:01:00.000Z', project.name);
    await repository.saveKnowledge(scope, knowledge);
    const reloaded = await repository.getProject(scope, project.id);

    expect(reloaded?.knowledge?.entities.map((item) => item.id)).toEqual(knowledge.entities.map((item) => item.id));
    expect(reloaded?.knowledge?.gaps.map((item) => item.id)).toEqual(knowledge.gaps.map((item) => item.id));
    expect(reloaded?.knowledge?.clarificationQuestions.map((item) => item.id)).toEqual(knowledge.clarificationQuestions.map((item) => item.id));
    expect(reloaded?.knowledge?.architectureOptions.map((item) => item.id)).toEqual(knowledge.architectureOptions.map((item) => item.id));
    expect(reloaded?.knowledge?.techStack.map((item) => item.id)).toEqual(knowledge.techStack.map((item) => item.id));
  });

  it('imports a validated prototype snapshot once and preserves stable identifiers', async () => {
    const snapshot = ProjectDatabase.parse({
      version: 1,
      workspaces: [{ id: 'WS-IMPORT', name: 'Imported workspace', createdAt: '2026-07-20T10:00:00.000Z', updatedAt: '2026-07-20T10:00:00.000Z' }],
      projects: [{ id: 'PROJ-IMPORT', workspaceId: 'WS-IMPORT', name: 'Imported project', status: 'SOURCES_READY', graphVersion: 0, createdAt: '2026-07-20T10:00:00.000Z', updatedAt: '2026-07-20T10:00:00.000Z' }],
      sources: [{ id: 'SRC-IMPORT', workspaceId: 'WS-IMPORT', projectId: 'PROJ-IMPORT', name: 'brief.txt', kind: 'FILE', mimeType: 'text/plain', size: 7, sha256: 'd'.repeat(64), extractedText: 'Content', rawPath: 'uploads/content.txt', status: 'EXTRACTED', createdAt: '2026-07-20T10:00:00.000Z' }],
      knowledge: [], architectureBriefs: [], arbDecisions: [], documents: [], documentApprovals: [], notionPublications: [], jiraPublications: [], wireframeRevisions: [],
    });
    const plan = buildPrototypeImportPlan(snapshot);
    const first = await applyPrototypeImport(handle.db, plan);
    const repeated = await applyPrototypeImport(handle.db, plan);
    const imported = await new PostgresProjectRepository(handle.db).getProject({ organizationId: LOCAL_ORGANIZATION_ID }, 'PROJ-IMPORT');

    expect(first.alreadyApplied).toBe(false);
    expect(repeated).toMatchObject({ alreadyApplied: true, importId: first.importId });
    expect(imported?.project).toMatchObject({ id: 'PROJ-IMPORT', workspaceId: 'WS-IMPORT', graphVersion: 0 });
    expect(imported?.sources[0]).toMatchObject({ id: 'SRC-IMPORT', sha256: 'd'.repeat(64), rawPath: 'uploads/content.txt' });
    const count = await handle.db.execute(sql`select count(*)::int as count from projects`);
    expect((count.rows[0] as { count: number }).count).toBe(1);
  });
});
