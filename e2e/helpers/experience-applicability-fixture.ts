import { createHash } from 'node:crypto';

import { Pool } from 'pg';

const REQUIRED_DATABASE_NAME = 'axiom_test_applicability_e2e';

export const applicabilityFixture = {
  primaryOrganizationId: 'ORG-E2E-APPLICABILITY',
  secondaryOrganizationId: 'ORG-E2E-APPLICABILITY-OTHER',
  ownerToken: 'o'.repeat(43),
  viewerToken: 'v'.repeat(43),
  projects: {
    applicable: 'PROJ-E2E-EXPLICIT-APPLICABLE',
    notApplicable: 'PROJ-E2E-EXPLICIT-NOT-APPLICABLE',
    needsDecision: 'PROJ-E2E-NEEDS-DECISION',
    applicableSuccess: 'PROJ-E2E-DECIDE-APPLICABLE',
    notApplicableRetry: 'PROJ-E2E-DECIDE-NOT-APPLICABLE',
    stale: 'PROJ-E2E-STALE',
    viewer: 'PROJ-E2E-VIEWER',
  },
} as const;

const fixtureOrganizationIds = [
  applicabilityFixture.primaryOrganizationId,
  applicabilityFixture.secondaryOrganizationId,
];
const fixtureUserIds = ['USER-E2E-APPLICABILITY-OWNER', 'USER-E2E-APPLICABILITY-VIEWER'];
const fixtureWorkspaceId = 'WS-E2E-APPLICABILITY';
const analyzedAt = '2026-08-11T08:00:00.000Z';

function databaseUrl(): string {
  const value = process.env.AXIOM_E2E_DATABASE_URL;
  if (!value) throw new Error('AXIOM_E2E_DATABASE_URL is required for the applicability browser fixture.');
  const parsed = new URL(value);
  const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname);
  if (!isLoopback || parsed.pathname !== `/${REQUIRED_DATABASE_NAME}`) {
    throw new Error(`Applicability E2E fixtures require the exact loopback ${REQUIRED_DATABASE_NAME} database.`);
  }
  return value;
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export class ExperienceApplicabilityFixtureDatabase {
  readonly pool = new Pool({ connectionString: databaseUrl(), max: 2 });

  async cleanup(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('delete from business_context_reviews where organization_id = any($1::text[])', [fixtureOrganizationIds]);
      await client.query('delete from business_context_versions where organization_id = any($1::text[])', [fixtureOrganizationIds]);
      await client.query('delete from experience_applicability_decisions where organization_id = any($1::text[])', [fixtureOrganizationIds]);
      const immutableAudits = await client.query<{ count: string }>(
        'select count(*)::text as count from audit_events where organization_id = any($1::text[])',
        [fixtureOrganizationIds],
      );
      if (immutableAudits.rows[0]?.count !== '0') {
        throw new Error('The disposable applicability database contains immutable fixture audit evidence and must be recreated.');
      }
      await client.query('delete from idempotency_records where organization_id = any($1::text[])', [fixtureOrganizationIds]);
      await client.query('delete from projects where organization_id = any($1::text[])', [fixtureOrganizationIds]);
      await client.query('delete from workspaces where organization_id = any($1::text[])', [fixtureOrganizationIds]);
      await client.query('delete from memberships where organization_id = any($1::text[]) or user_id = any($2::text[])', [fixtureOrganizationIds, fixtureUserIds]);
      await client.query('delete from sessions where user_id = any($1::text[])', [fixtureUserIds]);
      await client.query('delete from users where id = any($1::text[])', [fixtureUserIds]);
      await client.query('delete from organizations where id = any($1::text[])', [fixtureOrganizationIds]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async seed(): Promise<void> {
    await this.cleanup();
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query(
        `insert into organizations (id, slug, name) values
          ($1, 'e2e-applicability', 'E2E Applicability'),
          ($2, 'e2e-applicability-other', 'E2E Applicability Other')`,
        fixtureOrganizationIds,
      );
      await client.query(
        `insert into users (id, email, display_name) values
          ($1, 'e2e-applicability-owner@example.test', 'E2E Applicability Owner'),
          ($2, 'e2e-applicability-viewer@example.test', 'E2E Applicability Viewer')`,
        fixtureUserIds,
      );
      await client.query(
        `insert into memberships (organization_id, user_id, role) values
          ($1, $2, 'OWNER'),
          ($1, $3, 'VIEWER')`,
        [applicabilityFixture.primaryOrganizationId, ...fixtureUserIds],
      );
      await client.query(
        `insert into sessions (id, user_id, token_hash, expires_at) values
          ('SESSION-E2E-APPLICABILITY-OWNER', $1, $3, '2099-01-01T00:00:00.000Z'),
          ('SESSION-E2E-APPLICABILITY-VIEWER', $2, $4, '2099-01-01T00:00:00.000Z')`,
        [...fixtureUserIds, tokenHash(applicabilityFixture.ownerToken), tokenHash(applicabilityFixture.viewerToken)],
      );
      await client.query(
        'insert into workspaces (id, organization_id, name) values ($1, $2, $3)',
        [fixtureWorkspaceId, applicabilityFixture.primaryOrganizationId, 'Applicability E2E Workspace'],
      );

      for (const projectId of Object.values(applicabilityFixture.projects)) {
        await client.query(
          `insert into projects (id, organization_id, workspace_id, name, status, graph_version, row_version)
           values ($1, $2, $3, $4, 'ANALYZED', 1, 1)`,
          [projectId, applicabilityFixture.primaryOrganizationId, fixtureWorkspaceId, projectId.replaceAll('-', ' ')],
        );
        await client.query(
          `insert into project_graphs (organization_id, project_id, graph_version, summary, analyzer, analyzed_at)
           values ($1, $2, 1, $3, 'deterministic-browser-fixture', $4)`,
          [applicabilityFixture.primaryOrganizationId, projectId, `Business Context fixture for ${projectId}.`, analyzedAt],
        );

        const workflow = projectId === applicabilityFixture.projects.applicable
          ? 'Finance reviewers shall approve invoices in a browser portal.'
          : projectId === applicabilityFixture.projects.notApplicable
            ? 'The approved delivery is API-only with no user interface.'
            : 'Finance reviewers shall approve invoices.';
        const entities = [
          ['OUTCOME', 'DECISION', 'The product goal is to reduce invoice review time by 30%.'],
          ['WORKFLOW', 'REQUIREMENT', workflow],
          ['MEASURE', 'NFR', 'P95 processing latency shall remain below 500 milliseconds.'],
        ] as const;
        for (const [suffix, category, text] of entities) {
          await client.query(
            `insert into knowledge_entities
              (id, organization_id, project_id, graph_version, category, text, truth_status, position)
             values ($1, $2, $3, 1, $4, $5, 'HUMAN_CONFIRMED', $6)`,
            [
              `ENTITY-${suffix}-${projectId}`,
              applicabilityFixture.primaryOrganizationId,
              projectId,
              category,
              text,
              entities.findIndex(([candidate]) => candidate === suffix),
            ],
          );
        }
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async setProjectRowVersion(projectId: string, rowVersion: number): Promise<void> {
    const result = await this.pool.query(
      'update projects set row_version = $1, updated_at = now() where organization_id = $2 and id = $3',
      [rowVersion, applicabilityFixture.primaryOrganizationId, projectId],
    );
    if (result.rowCount !== 1) throw new Error(`Expected to update fixture project ${projectId}.`);
  }

  async decisionEvidence(projectId: string): Promise<{ decisions: number; audits: number; graphVersion: number; rowVersion: number }> {
    const [decisionResult, auditResult, projectResult] = await Promise.all([
      this.pool.query<{ count: string }>(
        'select count(*)::text as count from experience_applicability_decisions where organization_id = $1 and project_id = $2',
        [applicabilityFixture.primaryOrganizationId, projectId],
      ),
      this.pool.query<{ count: string }>(
        `select count(*)::text as count from audit_events
         where organization_id = $1 and action = 'EXPERIENCE_APPLICABILITY_DECIDED' and metadata->>'projectId' = $2`,
        [applicabilityFixture.primaryOrganizationId, projectId],
      ),
      this.pool.query<{ graph_version: number; row_version: number }>(
        'select graph_version, row_version from projects where organization_id = $1 and id = $2',
        [applicabilityFixture.primaryOrganizationId, projectId],
      ),
    ]);
    const project = projectResult.rows[0];
    if (!project) throw new Error(`Fixture project ${projectId} was not found.`);
    return {
      decisions: Number.parseInt(decisionResult.rows[0]?.count ?? '0', 10),
      audits: Number.parseInt(auditResult.rows[0]?.count ?? '0', 10),
      graphVersion: project.graph_version,
      rowVersion: project.row_version,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
