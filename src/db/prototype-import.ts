import { createHash, randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { AxiomDatabase } from './client';
import {
  arbDecisions,
  architectureBriefs,
  architectureOptions,
  clarificationQuestions,
  documentApprovals,
  jiraPublications,
  knowledgeEntities,
  notionPublications,
  organizations,
  projectDocuments,
  projectGaps,
  projectGraphs,
  projectSources,
  projects,
  prototypeImports,
  techStackRecommendations,
  wireframeRevisions,
  workspaces,
} from './schema';
import { ProjectDatabase, type ProjectDatabase as ProjectDatabaseType } from '../projects/schemas';

export const LOCAL_ORGANIZATION_ID = 'ORG-LOCAL-DEVELOPMENT';
export const LOCAL_ORGANIZATION_SLUG = 'local-development';

export type PrototypeImportCounts = {
  workspaces: number;
  projects: number;
  sources: number;
  graphVersions: number;
  knowledgeEntities: number;
  gaps: number;
  clarificationQuestions: number;
  architectureOptions: number;
  techStackRecommendations: number;
  architectureBriefs: number;
  arbDecisions: number;
  documents: number;
  documentApprovals: number;
  notionPublications: number;
  jiraPublications: number;
  wireframeRevisions: number;
};

export type PrototypeImportPlan = {
  organizationId: string;
  sourceHash: string;
  counts: PrototypeImportCounts;
  errors: string[];
  database: ProjectDatabaseType;
};

function hashSnapshot(database: ProjectDatabaseType) {
  return createHash('sha256').update(JSON.stringify(database)).digest('hex');
}

function validateReferences(database: ProjectDatabaseType) {
  const errors: string[] = [];
  const workspaceIds = new Set(database.workspaces.map((workspace) => workspace.id));
  const projectsById = new Map(database.projects.map((project) => [project.id, project]));
  const sourcesById = new Map(database.sources.map((source) => [source.id, source]));

  const duplicateKeys = (label: string, keys: string[]) => {
    const seen = new Set<string>();
    for (const key of keys) {
      if (seen.has(key)) errors.push(`Duplicate ${label} key ${key}`);
      seen.add(key);
    }
  };
  duplicateKeys('workspace', database.workspaces.map((item) => item.id));
  duplicateKeys('project', database.projects.map((item) => item.id));
  duplicateKeys('source', database.sources.map((item) => item.id));
  duplicateKeys('graph version', database.knowledge.map((item) => `${item.projectId}:${item.graphVersion}`));
  duplicateKeys('document ID/version', database.documents.map((item) => `${item.id}:${item.version}`));
  duplicateKeys('document project/type/version', database.documents.map((item) => `${item.projectId}:${item.type}:${item.version}`));
  duplicateKeys('architecture brief', database.architectureBriefs.map((item) => item.id));
  duplicateKeys('ARB decision', database.arbDecisions.map((item) => item.id));
  duplicateKeys('document approval', database.documentApprovals.map((item) => item.id));
  duplicateKeys('Notion publication', database.notionPublications.map((item) => item.id));
  duplicateKeys('Jira publication', database.jiraPublications.map((item) => item.id));
  duplicateKeys('wireframe revision', database.wireframeRevisions.map((item) => item.id));

  const entityKeys: string[] = [];
  const gapKeys: string[] = [];
  const questionKeys: string[] = [];
  const optionKeys: string[] = [];
  const stackKeys: string[] = [];
  for (const graph of database.knowledge) {
    entityKeys.push(...graph.entities.map((item) => `${item.id}:${graph.graphVersion}`));
    gapKeys.push(...graph.gaps.map((item) => `${item.id}:${graph.graphVersion}`));
    questionKeys.push(...graph.clarificationQuestions.map((item) => `${item.id}:${graph.graphVersion}`));
    optionKeys.push(...graph.architectureOptions.map((item) => `${item.id}:${graph.graphVersion}`));
    stackKeys.push(...graph.techStack.map((item) => `${item.id}:${graph.graphVersion}`));
  }
  duplicateKeys('knowledge entity ID/version', entityKeys);
  duplicateKeys('gap ID/version', gapKeys);
  duplicateKeys('clarification ID/version', questionKeys);
  duplicateKeys('architecture option ID/version', optionKeys);
  duplicateKeys('technology recommendation ID/version', stackKeys);

  for (const project of database.projects) {
    if (!workspaceIds.has(project.workspaceId)) errors.push(`Project ${project.id} references missing workspace ${project.workspaceId}`);
  }
  for (const source of database.sources) {
    const project = projectsById.get(source.projectId);
    if (!project) errors.push(`Source ${source.id} references missing project ${source.projectId}`);
    else if (project.workspaceId !== source.workspaceId) errors.push(`Source ${source.id} workspace does not match its project`);
  }

  const projectCollections: Array<[string, Array<{ projectId: string; id?: string }>]> = [
    ['knowledge', database.knowledge],
    ['architecture brief', database.architectureBriefs],
    ['ARB decision', database.arbDecisions],
    ['document', database.documents],
    ['document approval', database.documentApprovals],
    ['Notion publication', database.notionPublications],
    ['Jira publication', database.jiraPublications],
    ['wireframe revision', database.wireframeRevisions],
  ];
  for (const [label, records] of projectCollections) {
    for (const record of records) {
      if (!projectsById.has(record.projectId)) errors.push(`${label} ${record.id ?? record.projectId} references missing project ${record.projectId}`);
    }
  }

  for (const knowledge of database.knowledge) {
    const entityIds = new Set(knowledge.entities.map((entity) => entity.id));
    const gapIds = new Set(knowledge.gaps.map((gap) => gap.id));
    for (const entity of knowledge.entities) {
      if (entity.projectId !== knowledge.projectId) errors.push(`Knowledge entity ${entity.id} has a mismatched project`);
      if (entity.truthStatus !== 'SOURCE_GROUNDED') continue;
      const source = entity.sourceId ? sourcesById.get(entity.sourceId) : undefined;
      if (!source || source.projectId !== knowledge.projectId) {
        errors.push(`Grounded entity ${entity.id} references an unavailable source`);
        continue;
      }
      const exactQuote = source.extractedText.slice(entity.startOffset, entity.endOffset);
      if (exactQuote !== entity.quote) errors.push(`Grounded entity ${entity.id} does not match its stored source span`);
    }
    for (const gap of knowledge.gaps) {
      if (gap.projectId !== knowledge.projectId) errors.push(`Gap ${gap.id} has a mismatched project`);
      for (const entityId of gap.affectedEntityIds) {
        if (!entityIds.has(entityId)) errors.push(`Gap ${gap.id} references unknown entity ${entityId}`);
      }
    }
    for (const question of knowledge.clarificationQuestions) {
      if (!gapIds.has(question.gapId)) errors.push(`Clarification ${question.id} references unknown gap ${question.gapId}`);
    }
  }

  for (const approval of database.documentApprovals) {
    const availableHashes = new Set(database.documents.filter((document) => document.projectId === approval.projectId).map((document) => document.sha256));
    for (const hash of Object.values(approval.documentHashes)) {
      if (!availableHashes.has(hash)) errors.push(`Document approval ${approval.id} references unknown document hash ${hash}`);
    }
  }
  return errors;
}

export function buildPrototypeImportPlan(raw: unknown, organizationId = LOCAL_ORGANIZATION_ID): PrototypeImportPlan {
  const database = ProjectDatabase.parse(raw);
  return {
    organizationId,
    sourceHash: hashSnapshot(database),
    counts: {
      workspaces: database.workspaces.length,
      projects: database.projects.length,
      sources: database.sources.length,
      graphVersions: database.knowledge.length,
      knowledgeEntities: database.knowledge.reduce((total, graph) => total + graph.entities.length, 0),
      gaps: database.knowledge.reduce((total, graph) => total + graph.gaps.length, 0),
      clarificationQuestions: database.knowledge.reduce((total, graph) => total + graph.clarificationQuestions.length, 0),
      architectureOptions: database.knowledge.reduce((total, graph) => total + graph.architectureOptions.length, 0),
      techStackRecommendations: database.knowledge.reduce((total, graph) => total + graph.techStack.length, 0),
      architectureBriefs: database.architectureBriefs.length,
      arbDecisions: database.arbDecisions.length,
      documents: database.documents.length,
      documentApprovals: database.documentApprovals.length,
      notionPublications: database.notionPublications.length,
      jiraPublications: database.jiraPublications.length,
      wireframeRevisions: database.wireframeRevisions.length,
    },
    errors: validateReferences(database),
    database,
  };
}

export async function applyPrototypeImport(db: AxiomDatabase, plan: PrototypeImportPlan) {
  if (plan.errors.length) throw new Error(`Prototype import validation failed:\n${plan.errors.join('\n')}`);
  return db.transaction(async (tx) => {
    const [completed] = await tx.select().from(prototypeImports).where(and(
      eq(prototypeImports.organizationId, plan.organizationId),
      eq(prototypeImports.sourceHash, plan.sourceHash),
      eq(prototypeImports.status, 'COMPLETED'),
    )).limit(1);
    if (completed) return { importId: completed.id, alreadyApplied: true, counts: completed.counts };

    const existingProjects = await tx.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, plan.organizationId)).limit(1);
    if (existingProjects.length) throw new Error('Import target organization is not empty; use a clean database or a new organization ID');

    const startedAt = new Date().toISOString();
    const importId = `IMPORT-${randomUUID()}`;
    await tx.insert(organizations).values({
      id: plan.organizationId,
      slug: plan.organizationId === LOCAL_ORGANIZATION_ID ? LOCAL_ORGANIZATION_SLUG : plan.organizationId.toLowerCase(),
      name: plan.organizationId === LOCAL_ORGANIZATION_ID ? 'Local Development' : plan.organizationId,
      createdAt: startedAt,
      updatedAt: startedAt,
    }).onConflictDoNothing({ target: organizations.id });
    await tx.insert(prototypeImports).values({
      id: importId, organizationId: plan.organizationId, sourceHash: plan.sourceHash,
      status: 'RUNNING', counts: plan.counts, startedAt,
    });

    for (const workspace of plan.database.workspaces) {
      await tx.insert(workspaces).values({ ...workspace, organizationId: plan.organizationId }).onConflictDoUpdate({
        target: workspaces.id,
        set: { name: workspace.name, createdAt: workspace.createdAt, updatedAt: workspace.updatedAt },
      });
    }
    if (plan.database.projects.length) await tx.insert(projects).values(plan.database.projects.map((project) => ({
      ...project, organizationId: plan.organizationId,
    })));
    if (plan.database.sources.length) await tx.insert(projectSources).values(plan.database.sources.map((source) => ({
      ...source, organizationId: plan.organizationId,
    })));

    for (const graph of plan.database.knowledge) {
      await tx.insert(projectGraphs).values({
        organizationId: plan.organizationId, projectId: graph.projectId, graphVersion: graph.graphVersion,
        summary: graph.summary, readiness: graph.readiness, analyzer: graph.analyzer,
        analyzedAt: graph.analyzedAt, createdAt: graph.analyzedAt,
      });
      if (graph.gaps.length) await tx.insert(projectGaps).values(graph.gaps.map((gap, position) => ({
        ...gap, organizationId: plan.organizationId, graphVersion: graph.graphVersion, position,
      })));
      if (graph.clarificationQuestions.length) await tx.insert(clarificationQuestions).values(graph.clarificationQuestions.map((question, position) => ({
        ...question, organizationId: plan.organizationId, graphVersion: graph.graphVersion, position,
      })));
      if (graph.entities.length) await tx.insert(knowledgeEntities).values(graph.entities.map((entity, position) => ({
        ...entity, organizationId: plan.organizationId, graphVersion: graph.graphVersion, position,
      })));
      if (graph.architectureOptions.length) await tx.insert(architectureOptions).values(graph.architectureOptions.map((option, position) => ({
        id: option.id, organizationId: plan.organizationId, projectId: graph.projectId,
        graphVersion: graph.graphVersion, position, recommended: String(option.recommended), payload: option,
      })));
      if (graph.techStack.length) await tx.insert(techStackRecommendations).values(graph.techStack.map((recommendation, position) => ({
        id: recommendation.id, organizationId: plan.organizationId, projectId: graph.projectId,
        graphVersion: graph.graphVersion, position, layer: recommendation.layer, payload: recommendation,
      })));
    }

    if (plan.database.architectureBriefs.length) await tx.insert(architectureBriefs).values(plan.database.architectureBriefs.map((brief) => ({
      id: brief.id, organizationId: plan.organizationId, projectId: brief.projectId,
      graphVersion: brief.graphVersion, payload: brief, updatedAt: brief.updatedAt,
    })));
    if (plan.database.arbDecisions.length) await tx.insert(arbDecisions).values(plan.database.arbDecisions.map((decision) => ({
      id: decision.id, organizationId: plan.organizationId, projectId: decision.projectId,
      graphVersion: decision.graphVersion, version: decision.version, payload: decision, approvedAt: decision.approvedAt,
    })));
    for (let start = 0; start < plan.database.documents.length; start += 20) {
      const batch = plan.database.documents.slice(start, start + 20);
      await tx.insert(projectDocuments).values(batch.map((document) => ({
        id: document.id, organizationId: plan.organizationId, projectId: document.projectId,
        type: document.type, version: document.version, sourceGraphVersion: document.sourceGraphVersion,
        title: document.title, content: document.content, sha256: document.sha256,
        truthStatus: document.truthStatus, generatedAt: document.generatedAt,
        metadata: {
          ...(document.parentVersion === undefined ? {} : { parentVersion: document.parentVersion }),
          ...(document.revisedSection === undefined ? {} : { revisedSection: document.revisedSection }),
          ...(document.revisionInstruction === undefined ? {} : { revisionInstruction: document.revisionInstruction }),
          ...(document.revisionProvider === undefined ? {} : { revisionProvider: document.revisionProvider }),
        },
      })));
    }
    if (plan.database.documentApprovals.length) await tx.insert(documentApprovals).values(plan.database.documentApprovals.map((approval) => ({
      id: approval.id, organizationId: plan.organizationId, projectId: approval.projectId,
      graphVersion: approval.graphVersion, payload: approval, approvedAt: approval.approvedAt,
    })));
    if (plan.database.notionPublications.length) await tx.insert(notionPublications).values(plan.database.notionPublications.map((publication) => ({
      id: publication.id, organizationId: plan.organizationId, projectId: publication.projectId,
      sourceGraphVersion: publication.sourceGraphVersion, payload: publication, publishedAt: publication.publishedAt,
    })));
    if (plan.database.jiraPublications.length) await tx.insert(jiraPublications).values(plan.database.jiraPublications.map((publication) => ({
      id: publication.id, organizationId: plan.organizationId, projectId: publication.projectId,
      sourceGraphVersion: publication.sourceGraphVersion, planHash: publication.planHash,
      payload: publication, createdAt: publication.createdAt,
    })));
    if (plan.database.wireframeRevisions.length) await tx.insert(wireframeRevisions).values(plan.database.wireframeRevisions.map((revision) => ({
      id: revision.id, organizationId: plan.organizationId, projectId: revision.projectId,
      sourceGraphVersion: revision.sourceGraphVersion, screenId: revision.screenId,
      revision: revision.revision, payload: revision, createdAt: revision.createdAt,
    })));

    const completedAt = new Date().toISOString();
    await tx.update(prototypeImports).set({ status: 'COMPLETED', completedAt }).where(eq(prototypeImports.id, importId));
    return { importId, alreadyApplied: false, counts: plan.counts };
  });
}

function canonicalRows(rows: unknown[]) {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, normalize(nested)]));
    }
    return value;
  };
  return rows.map((row) => JSON.stringify(normalize(row))).sort();
}

function compareRows(label: string, expected: unknown[], actual: unknown[], errors: string[]) {
  if (JSON.stringify(canonicalRows(expected)) !== JSON.stringify(canonicalRows(actual))) {
    errors.push(`${label} stable fields differ from the validated prototype snapshot`);
  }
}

export async function verifyPrototypeImport(db: AxiomDatabase, plan: PrototypeImportPlan) {
  const organizationId = plan.organizationId;
  const errors: string[] = [];
  const countResult = await db.execute(sql`
    select
      (select count(*)::int from workspaces where organization_id = ${organizationId}) as workspaces,
      (select count(*)::int from projects where organization_id = ${organizationId}) as projects,
      (select count(*)::int from project_sources where organization_id = ${organizationId}) as sources,
      (select count(*)::int from project_graphs where organization_id = ${organizationId}) as graph_versions,
      (select count(*)::int from knowledge_entities where organization_id = ${organizationId}) as knowledge_entities,
      (select count(*)::int from project_gaps where organization_id = ${organizationId}) as gaps,
      (select count(*)::int from clarification_questions where organization_id = ${organizationId}) as clarification_questions,
      (select count(*)::int from architecture_options where organization_id = ${organizationId}) as architecture_options,
      (select count(*)::int from tech_stack_recommendations where organization_id = ${organizationId}) as tech_stack_recommendations,
      (select count(*)::int from architecture_briefs where organization_id = ${organizationId}) as architecture_briefs,
      (select count(*)::int from arb_decisions where organization_id = ${organizationId}) as arb_decisions,
      (select count(*)::int from project_documents where organization_id = ${organizationId}) as documents,
      (select count(*)::int from document_approvals where organization_id = ${organizationId}) as document_approvals,
      (select count(*)::int from notion_publications where organization_id = ${organizationId}) as notion_publications,
      (select count(*)::int from jira_publications where organization_id = ${organizationId}) as jira_publications,
      (select count(*)::int from wireframe_revisions where organization_id = ${organizationId}) as wireframe_revisions
  `);
  const actualCounts = countResult.rows[0] as Record<string, number>;
  const expectedCountEntries: Array<[keyof PrototypeImportCounts, string]> = [
    ['workspaces', 'workspaces'], ['projects', 'projects'], ['sources', 'sources'], ['graphVersions', 'graph_versions'],
    ['knowledgeEntities', 'knowledge_entities'], ['gaps', 'gaps'], ['clarificationQuestions', 'clarification_questions'],
    ['architectureOptions', 'architecture_options'], ['techStackRecommendations', 'tech_stack_recommendations'],
    ['architectureBriefs', 'architecture_briefs'], ['arbDecisions', 'arb_decisions'], ['documents', 'documents'],
    ['documentApprovals', 'document_approvals'], ['notionPublications', 'notion_publications'],
    ['jiraPublications', 'jira_publications'], ['wireframeRevisions', 'wireframe_revisions'],
  ];
  for (const [expectedKey, actualKey] of expectedCountEntries) {
    if (actualCounts[actualKey] !== plan.counts[expectedKey]) {
      errors.push(`${expectedKey} count expected ${plan.counts[expectedKey]} but found ${actualCounts[actualKey]}`);
    }
  }

  const [projectRows, sourceRows, graphRows, entityRows, gapRows, questionRows, optionRows, stackRows, decisionRows, documentRows, approvalRows, notionRows, jiraRows, wireframeRows] = await Promise.all([
    db.select({ id: projects.id, workspaceId: projects.workspaceId, status: projects.status, graphVersion: projects.graphVersion }).from(projects).where(eq(projects.organizationId, organizationId)),
    db.select({ id: projectSources.id, workspaceId: projectSources.workspaceId, projectId: projectSources.projectId, sha256: projectSources.sha256, rawPath: projectSources.rawPath, status: projectSources.status }).from(projectSources).where(eq(projectSources.organizationId, organizationId)),
    db.select({ projectId: projectGraphs.projectId, graphVersion: projectGraphs.graphVersion }).from(projectGraphs).where(eq(projectGraphs.organizationId, organizationId)),
    db.select({ id: knowledgeEntities.id, projectId: knowledgeEntities.projectId, graphVersion: knowledgeEntities.graphVersion, truthStatus: knowledgeEntities.truthStatus, sourceId: knowledgeEntities.sourceId, clarificationQuestionId: knowledgeEntities.clarificationQuestionId, quote: knowledgeEntities.quote, startOffset: knowledgeEntities.startOffset, endOffset: knowledgeEntities.endOffset }).from(knowledgeEntities).where(eq(knowledgeEntities.organizationId, organizationId)),
    db.select({ id: projectGaps.id, projectId: projectGaps.projectId, graphVersion: projectGaps.graphVersion, status: projectGaps.status, truthStatus: projectGaps.truthStatus }).from(projectGaps).where(eq(projectGaps.organizationId, organizationId)),
    db.select({ id: clarificationQuestions.id, projectId: clarificationQuestions.projectId, graphVersion: clarificationQuestions.graphVersion, gapId: clarificationQuestions.gapId, status: clarificationQuestions.status, answer: clarificationQuestions.answer, truthStatus: clarificationQuestions.truthStatus }).from(clarificationQuestions).where(eq(clarificationQuestions.organizationId, organizationId)),
    db.select({ id: architectureOptions.id, projectId: architectureOptions.projectId, graphVersion: architectureOptions.graphVersion }).from(architectureOptions).where(eq(architectureOptions.organizationId, organizationId)),
    db.select({ id: techStackRecommendations.id, projectId: techStackRecommendations.projectId, graphVersion: techStackRecommendations.graphVersion }).from(techStackRecommendations).where(eq(techStackRecommendations.organizationId, organizationId)),
    db.select({ id: arbDecisions.id, projectId: arbDecisions.projectId, graphVersion: arbDecisions.graphVersion, version: arbDecisions.version }).from(arbDecisions).where(eq(arbDecisions.organizationId, organizationId)),
    db.select({ id: projectDocuments.id, projectId: projectDocuments.projectId, type: projectDocuments.type, version: projectDocuments.version, sourceGraphVersion: projectDocuments.sourceGraphVersion, sha256: projectDocuments.sha256, truthStatus: projectDocuments.truthStatus }).from(projectDocuments).where(eq(projectDocuments.organizationId, organizationId)),
    db.select({ id: documentApprovals.id, projectId: documentApprovals.projectId, graphVersion: documentApprovals.graphVersion, payload: documentApprovals.payload }).from(documentApprovals).where(eq(documentApprovals.organizationId, organizationId)),
    db.select({ id: notionPublications.id, projectId: notionPublications.projectId, sourceGraphVersion: notionPublications.sourceGraphVersion, payload: notionPublications.payload }).from(notionPublications).where(eq(notionPublications.organizationId, organizationId)),
    db.select({ id: jiraPublications.id, projectId: jiraPublications.projectId, sourceGraphVersion: jiraPublications.sourceGraphVersion, planHash: jiraPublications.planHash }).from(jiraPublications).where(eq(jiraPublications.organizationId, organizationId)),
    db.select({ id: wireframeRevisions.id, projectId: wireframeRevisions.projectId, sourceGraphVersion: wireframeRevisions.sourceGraphVersion, screenId: wireframeRevisions.screenId, revision: wireframeRevisions.revision }).from(wireframeRevisions).where(eq(wireframeRevisions.organizationId, organizationId)),
  ]);

  compareRows('Projects', plan.database.projects.map(({ id, workspaceId, status, graphVersion }) => ({ id, workspaceId, status, graphVersion })), projectRows, errors);
  compareRows('Sources', plan.database.sources.map(({ id, workspaceId, projectId, sha256, rawPath, status }) => ({ id, workspaceId, projectId, sha256, rawPath, status })), sourceRows, errors);
  compareRows('Graph versions', plan.database.knowledge.map(({ projectId, graphVersion }) => ({ projectId, graphVersion })), graphRows, errors);
  compareRows('Knowledge entities', plan.database.knowledge.flatMap((graph) => graph.entities.map((entity) => ({ id: entity.id, projectId: entity.projectId, graphVersion: graph.graphVersion, truthStatus: entity.truthStatus, sourceId: entity.sourceId ?? null, clarificationQuestionId: entity.clarificationQuestionId ?? null, quote: entity.quote ?? null, startOffset: entity.startOffset ?? null, endOffset: entity.endOffset ?? null }))), entityRows, errors);
  compareRows('Gaps', plan.database.knowledge.flatMap((graph) => graph.gaps.map(({ id, projectId, status, truthStatus }) => ({ id, projectId, graphVersion: graph.graphVersion, status, truthStatus }))), gapRows, errors);
  compareRows('Clarifications', plan.database.knowledge.flatMap((graph) => graph.clarificationQuestions.map(({ id, projectId, gapId, status, answer, truthStatus }) => ({ id, projectId, graphVersion: graph.graphVersion, gapId, status, answer: answer ?? null, truthStatus }))), questionRows, errors);
  compareRows('Architecture options', plan.database.knowledge.flatMap((graph) => graph.architectureOptions.map(({ id, projectId }) => ({ id, projectId, graphVersion: graph.graphVersion }))), optionRows, errors);
  compareRows('Technology recommendations', plan.database.knowledge.flatMap((graph) => graph.techStack.map(({ id }) => ({ id, projectId: graph.projectId, graphVersion: graph.graphVersion }))), stackRows, errors);
  compareRows('ARB decisions', plan.database.arbDecisions.map(({ id, projectId, graphVersion, version }) => ({ id, projectId, graphVersion, version })), decisionRows, errors);
  compareRows('Documents', plan.database.documents.map(({ id, projectId, type, version, sourceGraphVersion, sha256, truthStatus }) => ({ id, projectId, type, version, sourceGraphVersion, sha256, truthStatus })), documentRows, errors);
  compareRows('Document approvals', plan.database.documentApprovals.map((payload) => ({ id: payload.id, projectId: payload.projectId, graphVersion: payload.graphVersion, payload })), approvalRows, errors);
  compareRows('Notion publications', plan.database.notionPublications.map((payload) => ({ id: payload.id, projectId: payload.projectId, sourceGraphVersion: payload.sourceGraphVersion, payload })), notionRows, errors);
  compareRows('Jira publications', plan.database.jiraPublications.map(({ id, projectId, sourceGraphVersion, planHash }) => ({ id, projectId, sourceGraphVersion, planHash })), jiraRows, errors);
  compareRows('Wireframe revisions', plan.database.wireframeRevisions.map(({ id, projectId, sourceGraphVersion, screenId, revision }) => ({ id, projectId, sourceGraphVersion, screenId, revision })), wireframeRows, errors);
  return { valid: errors.length === 0, errors, counts: actualCounts };
}
