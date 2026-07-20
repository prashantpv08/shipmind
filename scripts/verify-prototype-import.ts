import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDatabaseHandle } from '../src/db/client';
import { buildPrototypeImportPlan, verifyPrototypeImport } from '../src/db/prototype-import';
import { PostgresProjectRepository } from '../src/projects/postgres-repository';

function stableJson(value: unknown) {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, normalize(nested)]));
    return item;
  };
  return JSON.stringify(normalize(value));
}

function byId<T extends { id: string }>(items: T[]) {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

async function main() {
  const dataRoot = process.env.AXIOM_DATA_DIR ? resolve(process.env.AXIOM_DATA_DIR) : resolve('.axiom-data');
  const sourcePath = resolve(dataRoot, 'projects.json');
  const raw = JSON.parse(await readFile(sourcePath, 'utf8')) as unknown;
  const plan = buildPrototypeImportPlan(raw, process.env.AXIOM_IMPORT_ORGANIZATION_ID);
  if (plan.errors.length) throw new Error(`Source validation failed with ${plan.errors.length} errors`);
  const handle = createDatabaseHandle();
  try {
    const result = await verifyPrototypeImport(handle.db, plan);
    const repository = new PostgresProjectRepository(handle.db);
    const aggregateErrors: string[] = [];
    for (const project of plan.database.projects) {
      const actual = await repository.getProject({ organizationId: plan.organizationId }, project.id);
      const expected = {
        project,
        workspace: plan.database.workspaces.find((workspace) => workspace.id === project.workspaceId) ?? null,
        sources: byId(plan.database.sources.filter((source) => source.projectId === project.id)),
        knowledge: plan.database.knowledge.find((knowledge) => knowledge.projectId === project.id) ?? null,
        architectureBrief: plan.database.architectureBriefs.find((brief) => brief.projectId === project.id && brief.graphVersion === project.graphVersion) ?? null,
        arbDecision: plan.database.arbDecisions.filter((decision) => decision.projectId === project.id).sort((left, right) => right.version - left.version)[0] ?? null,
        documents: byId(plan.database.documents.filter((document) => document.projectId === project.id)).sort((left, right) => left.id.localeCompare(right.id) || left.version - right.version),
        documentApproval: plan.database.documentApprovals.filter((approval) => approval.projectId === project.id).sort((left, right) => right.approvedAt.localeCompare(left.approvedAt))[0] ?? null,
        notionPublication: plan.database.notionPublications.find((publication) => publication.projectId === project.id) ?? null,
        jiraPublication: plan.database.jiraPublications.find((publication) => publication.projectId === project.id) ?? null,
        wireframeRevisions: byId(plan.database.wireframeRevisions.filter((revision) => revision.projectId === project.id)),
      };
      const normalizedActual = actual ? {
        ...actual,
        sources: byId(actual.sources),
        documents: byId(actual.documents).sort((left, right) => left.id.localeCompare(right.id) || left.version - right.version),
        wireframeRevisions: byId(actual.wireframeRevisions),
      } : null;
      if (stableJson(expected) !== stableJson(normalizedActual)) aggregateErrors.push(`Project aggregate ${project.id} differs from the prototype store`);
    }
    const valid = result.valid && aggregateErrors.length === 0;
    process.stdout.write(`${JSON.stringify({ sourceHash: plan.sourceHash, ...result, valid, aggregateErrors }, null, 2)}\n`);
    if (!valid) process.exitCode = 1;
  } finally {
    await handle.pool.end();
  }
}

void main().catch((cause: unknown) => {
  process.stderr.write(`${JSON.stringify({ status: 'failed', error: cause instanceof Error ? cause.message.slice(0, 500) : 'Unknown verification failure' }, null, 2)}\n`);
  process.exitCode = 1;
});
