import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { AxiomDatabase } from '../db/client';
import {
  arbDecisions,
  architectureBriefs,
  architectureOptions,
  clarificationQuestions,
  documentApprovals,
  jiraPublications,
  knowledgeEntities,
  notionPublications,
  projectDocuments,
  projectGaps,
  projectGraphs,
  projectSources,
  projects,
  techStackRecommendations,
  wireframeRevisions,
  workspaces,
} from '../db/schema';
import {
  ArbDecision,
  ArchitectureBrief,
  DocumentApproval,
  JiraPublication,
  KnowledgeEntity,
  NotionPublication,
  Project,
  ProjectDocument,
  ProjectGap,
  ProjectKnowledge,
  ProjectSource,
  TechStackRecommendation,
  ClarificationQuestion,
  WireframeRevision,
  Workspace,
  type ArbDecision as ArbDecisionType,
  type ArchitectureBrief as ArchitectureBriefType,
  type DocumentApproval as DocumentApprovalType,
  type JiraPublication as JiraPublicationType,
  type NotionPublication as NotionPublicationType,
  type ProjectDocument as ProjectDocumentType,
  type ProjectKnowledge as ProjectKnowledgeType,
  type ProjectSource as ProjectSourceType,
  type WireframeRevision as WireframeRevisionType,
} from './schemas';
import {
  OptimisticConcurrencyError,
  type OrganizationScope,
  type ProjectAggregate,
  type ProjectRepository,
} from './repository';

type QueryExecutor = Pick<AxiomDatabase, 'select' | 'insert' | 'update' | 'delete'>;

function scopedProject(scope: OrganizationScope, projectId: string) {
  return and(eq(projects.organizationId, scope.organizationId), eq(projects.id, projectId));
}

function isoTimestamp(value: string) {
  return new Date(value).toISOString();
}

function projectFromRow(row: typeof projects.$inferSelect) {
  return Project.parse({
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    status: row.status,
    graphVersion: row.graphVersion,
    createdAt: isoTimestamp(row.createdAt),
    updatedAt: isoTimestamp(row.updatedAt),
  });
}

function workspaceFromRow(row: typeof workspaces.$inferSelect) {
  return Workspace.parse({ id: row.id, name: row.name, createdAt: isoTimestamp(row.createdAt), updatedAt: isoTimestamp(row.updatedAt) });
}

async function requireProjectRow(executor: QueryExecutor, scope: OrganizationScope, projectId: string) {
  const [project] = await executor.select().from(projects).where(scopedProject(scope, projectId)).limit(1);
  if (!project) throw new Error('Project not found');
  return project;
}

async function updateProject(
  executor: QueryExecutor,
  scope: OrganizationScope,
  project: typeof projects.$inferSelect,
  values: Partial<Pick<typeof projects.$inferInsert, 'status' | 'graphVersion' | 'updatedAt'>>,
) {
  const updated = await executor.update(projects).set({
    ...values,
    rowVersion: sql`${projects.rowVersion} + 1`,
  }).where(and(
    scopedProject(scope, project.id),
    eq(projects.rowVersion, project.rowVersion),
  )).returning({ id: projects.id });
  if (updated.length !== 1) throw new OptimisticConcurrencyError('Project');
}

async function persistKnowledge(executor: QueryExecutor, scope: OrganizationScope, knowledge: ProjectKnowledgeType) {
  const graphScope = and(
    eq(projectGraphs.organizationId, scope.organizationId),
    eq(projectGraphs.projectId, knowledge.projectId),
    eq(projectGraphs.graphVersion, knowledge.graphVersion),
  );
  await executor.insert(projectGraphs).values({
    organizationId: scope.organizationId,
    projectId: knowledge.projectId,
    graphVersion: knowledge.graphVersion,
    summary: knowledge.summary,
    readiness: knowledge.readiness,
    analyzer: knowledge.analyzer,
    analyzedAt: knowledge.analyzedAt,
  }).onConflictDoUpdate({
    target: [projectGraphs.projectId, projectGraphs.graphVersion],
    set: {
      summary: knowledge.summary,
      readiness: knowledge.readiness,
      analyzer: knowledge.analyzer,
      analyzedAt: knowledge.analyzedAt,
    },
  });

  await executor.delete(knowledgeEntities).where(and(
    eq(knowledgeEntities.organizationId, scope.organizationId),
    eq(knowledgeEntities.projectId, knowledge.projectId),
    eq(knowledgeEntities.graphVersion, knowledge.graphVersion),
  ));
  await executor.delete(clarificationQuestions).where(and(
    eq(clarificationQuestions.organizationId, scope.organizationId),
    eq(clarificationQuestions.projectId, knowledge.projectId),
    eq(clarificationQuestions.graphVersion, knowledge.graphVersion),
  ));
  await executor.delete(projectGaps).where(and(
    eq(projectGaps.organizationId, scope.organizationId),
    eq(projectGaps.projectId, knowledge.projectId),
    eq(projectGaps.graphVersion, knowledge.graphVersion),
  ));
  await executor.delete(architectureOptions).where(and(
    eq(architectureOptions.organizationId, scope.organizationId),
    eq(architectureOptions.projectId, knowledge.projectId),
    eq(architectureOptions.graphVersion, knowledge.graphVersion),
  ));
  await executor.delete(techStackRecommendations).where(and(
    eq(techStackRecommendations.organizationId, scope.organizationId),
    eq(techStackRecommendations.projectId, knowledge.projectId),
    eq(techStackRecommendations.graphVersion, knowledge.graphVersion),
  ));

  if (knowledge.gaps.length) await executor.insert(projectGaps).values(knowledge.gaps.map((gap, position) => ({
    ...gap,
    organizationId: scope.organizationId,
    graphVersion: knowledge.graphVersion,
    position,
  })));
  if (knowledge.clarificationQuestions.length) await executor.insert(clarificationQuestions).values(knowledge.clarificationQuestions.map((question, position) => ({
    ...question,
    organizationId: scope.organizationId,
    graphVersion: knowledge.graphVersion,
    position,
    answeredAt: question.answeredAt,
  })));
  if (knowledge.entities.length) await executor.insert(knowledgeEntities).values(knowledge.entities.map((entity, position) => ({
    ...entity,
    organizationId: scope.organizationId,
    graphVersion: knowledge.graphVersion,
    position,
  })));
  if (knowledge.architectureOptions.length) await executor.insert(architectureOptions).values(knowledge.architectureOptions.map((option, position) => ({
    id: option.id,
    organizationId: scope.organizationId,
    projectId: knowledge.projectId,
    graphVersion: knowledge.graphVersion,
    position,
    recommended: String(option.recommended),
    payload: option,
  })));
  if (knowledge.techStack.length) await executor.insert(techStackRecommendations).values(knowledge.techStack.map((recommendation, position) => ({
    id: recommendation.id,
    organizationId: scope.organizationId,
    projectId: knowledge.projectId,
    graphVersion: knowledge.graphVersion,
    position,
    layer: recommendation.layer,
    payload: recommendation,
  })));
  return graphScope;
}

function documentRow(scope: OrganizationScope, document: ProjectDocumentType) {
  const { parentVersion, revisedSection, revisionInstruction, revisionProvider } = document;
  return {
    id: document.id,
    organizationId: scope.organizationId,
    projectId: document.projectId,
    type: document.type,
    version: document.version,
    sourceGraphVersion: document.sourceGraphVersion,
    title: document.title,
    content: document.content,
    sha256: document.sha256,
    truthStatus: document.truthStatus,
    metadata: {
      ...(parentVersion === undefined ? {} : { parentVersion }),
      ...(revisedSection === undefined ? {} : { revisedSection }),
      ...(revisionInstruction === undefined ? {} : { revisionInstruction }),
      ...(revisionProvider === undefined ? {} : { revisionProvider }),
    },
    generatedAt: document.generatedAt,
  };
}

function documentFromRow(row: typeof projectDocuments.$inferSelect) {
  return ProjectDocument.parse({
    id: row.id,
    projectId: row.projectId,
    type: row.type,
    version: row.version,
    sourceGraphVersion: row.sourceGraphVersion,
    title: row.title,
    content: row.content,
    sha256: row.sha256,
    truthStatus: row.truthStatus,
    generatedAt: isoTimestamp(row.generatedAt),
    ...row.metadata,
  });
}

export class PostgresProjectRepository implements ProjectRepository {
  constructor(private readonly db: AxiomDatabase) {}

  async listWorkspaces(scope: OrganizationScope) {
    const rows = await this.db.select().from(workspaces).where(eq(workspaces.organizationId, scope.organizationId));
    return rows.map(workspaceFromRow);
  }

  async createProject(scope: OrganizationScope, name: string, workspaceId: string) {
    const [workspace] = await this.db.select({ id: workspaces.id }).from(workspaces).where(and(
      eq(workspaces.organizationId, scope.organizationId),
      eq(workspaces.id, workspaceId),
    )).limit(1);
    if (!workspace) throw new Error('Workspace not found');
    const now = new Date().toISOString();
    const parsed = Project.parse({
      id: `PROJ-${randomUUID()}`,
      workspaceId,
      name,
      status: 'DRAFT',
      graphVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
    await this.db.insert(projects).values({ ...parsed, organizationId: scope.organizationId });
    return parsed;
  }

  async listProjects(scope: OrganizationScope, workspaceId: string) {
    const rows = await this.db.select().from(projects).where(and(
      eq(projects.organizationId, scope.organizationId),
      eq(projects.workspaceId, workspaceId),
    ));
    return rows.map(projectFromRow);
  }

  async getProject(scope: OrganizationScope, projectId: string): Promise<ProjectAggregate | null> {
    const [projectRow] = await this.db.select().from(projects).where(scopedProject(scope, projectId)).limit(1);
    if (!projectRow) return null;
    const project = projectFromRow(projectRow);
    const graphFilter = and(
      eq(projectGraphs.organizationId, scope.organizationId),
      eq(projectGraphs.projectId, projectId),
      eq(projectGraphs.graphVersion, project.graphVersion),
    );
    const childGraphFilter = (table: { organizationId: AnyPgColumn; projectId: AnyPgColumn; graphVersion: AnyPgColumn }) => and(
      eq(table.organizationId, scope.organizationId),
      eq(table.projectId, projectId),
      eq(table.graphVersion, project.graphVersion),
    );
    const [
      workspaceRows,
      sourceRows,
      graphRows,
      entityRows,
      gapRows,
      questionRows,
      optionRows,
      stackRows,
      briefRows,
      decisionRows,
      documentRows,
      approvalRows,
      notionRows,
      jiraRows,
      wireframeRows,
    ] = await Promise.all([
      this.db.select().from(workspaces).where(and(eq(workspaces.organizationId, scope.organizationId), eq(workspaces.id, project.workspaceId))).limit(1),
      this.db.select().from(projectSources).where(and(eq(projectSources.organizationId, scope.organizationId), eq(projectSources.projectId, projectId))),
      this.db.select().from(projectGraphs).where(graphFilter).limit(1),
      this.db.select().from(knowledgeEntities).where(childGraphFilter(knowledgeEntities)).orderBy(asc(knowledgeEntities.position)),
      this.db.select().from(projectGaps).where(childGraphFilter(projectGaps)).orderBy(asc(projectGaps.position)),
      this.db.select().from(clarificationQuestions).where(childGraphFilter(clarificationQuestions)).orderBy(asc(clarificationQuestions.position)),
      this.db.select().from(architectureOptions).where(childGraphFilter(architectureOptions)).orderBy(asc(architectureOptions.position)),
      this.db.select().from(techStackRecommendations).where(childGraphFilter(techStackRecommendations)).orderBy(asc(techStackRecommendations.position)),
      this.db.select().from(architectureBriefs).where(and(eq(architectureBriefs.organizationId, scope.organizationId), eq(architectureBriefs.projectId, projectId), eq(architectureBriefs.graphVersion, project.graphVersion))).limit(1),
      this.db.select().from(arbDecisions).where(and(eq(arbDecisions.organizationId, scope.organizationId), eq(arbDecisions.projectId, projectId))).orderBy(desc(arbDecisions.version)).limit(1),
      this.db.select().from(projectDocuments).where(and(eq(projectDocuments.organizationId, scope.organizationId), eq(projectDocuments.projectId, projectId))),
      this.db.select().from(documentApprovals).where(and(eq(documentApprovals.organizationId, scope.organizationId), eq(documentApprovals.projectId, projectId))).orderBy(desc(documentApprovals.approvedAt)).limit(1),
      this.db.select().from(notionPublications).where(and(eq(notionPublications.organizationId, scope.organizationId), eq(notionPublications.projectId, projectId))).limit(1),
      this.db.select().from(jiraPublications).where(and(eq(jiraPublications.organizationId, scope.organizationId), eq(jiraPublications.projectId, projectId))).limit(1),
      this.db.select().from(wireframeRevisions).where(and(eq(wireframeRevisions.organizationId, scope.organizationId), eq(wireframeRevisions.projectId, projectId))),
    ]);

    const graph = graphRows[0];
    const knowledge = graph ? ProjectKnowledge.parse({
      projectId,
      graphVersion: graph.graphVersion,
      summary: graph.summary,
      entities: entityRows.map((row) => KnowledgeEntity.parse({
        id: row.id,
        projectId: row.projectId,
        category: row.category,
        text: row.text,
        truthStatus: row.truthStatus,
        ...(row.sourceId ? { sourceId: row.sourceId } : {}),
        ...(row.clarificationQuestionId ? { clarificationQuestionId: row.clarificationQuestionId } : {}),
        ...(row.quote ? { quote: row.quote } : {}),
        ...(row.startOffset === null ? {} : { startOffset: row.startOffset }),
        ...(row.endOffset === null ? {} : { endOffset: row.endOffset }),
      })),
      gaps: gapRows.map((row) => ProjectGap.parse({
        id: row.id, projectId: row.projectId, type: row.type, category: row.category,
        title: row.title, description: row.description, severity: row.severity,
        impactAreas: row.impactAreas, affectedEntityIds: row.affectedEntityIds,
        affectedArtifacts: row.affectedArtifacts, rationale: row.rationale,
        status: row.status, truthStatus: row.truthStatus,
      })),
      clarificationQuestions: questionRows.map((row) => ClarificationQuestion.parse({
        id: row.id, projectId: row.projectId, gapId: row.gapId, question: row.question,
        whyItMatters: row.whyItMatters, affectedEntityIds: row.affectedEntityIds,
        options: row.options, status: row.status, truthStatus: row.truthStatus,
        ...(row.answer ? { answer: row.answer } : {}),
        ...(row.answeredAt ? { answeredAt: isoTimestamp(row.answeredAt) } : {}),
      })),
      ...(graph.readiness ? { readiness: graph.readiness } : {}),
      techStack: stackRows.map((row) => TechStackRecommendation.parse(row.payload)),
      architectureOptions: optionRows.map((row) => row.payload),
      analyzedAt: isoTimestamp(graph.analyzedAt),
      analyzer: graph.analyzer,
    }) : null;

    return {
      project,
      workspace: workspaceRows[0] ? workspaceFromRow(workspaceRows[0]) : null,
      sources: sourceRows.map((row) => ProjectSource.parse({
        id: row.id, workspaceId: row.workspaceId, projectId: row.projectId, name: row.name,
        ...(row.relativePath ? { relativePath: row.relativePath } : {}),
        kind: row.kind, mimeType: row.mimeType, size: row.size, sha256: row.sha256,
        extractedText: row.extractedText, rawPath: row.rawPath, status: row.status,
        ...(row.extractionError ? { extractionError: row.extractionError } : {}), createdAt: isoTimestamp(row.createdAt),
      })),
      knowledge,
      architectureBrief: briefRows[0] ? ArchitectureBrief.parse(briefRows[0].payload) : null,
      arbDecision: decisionRows[0] ? ArbDecision.parse(decisionRows[0].payload) : null,
      documents: documentRows.map(documentFromRow),
      documentApproval: approvalRows[0] ? DocumentApproval.parse(approvalRows[0].payload) : null,
      notionPublication: notionRows[0] ? NotionPublication.parse(notionRows[0].payload) : null,
      jiraPublication: jiraRows[0] ? JiraPublication.parse(jiraRows[0].payload) : null,
      wireframeRevisions: wireframeRows.map((row) => WireframeRevision.parse(row.payload)),
    };
  }

  async addSources(scope: OrganizationScope, projectId: string, sources: ProjectSourceType[]) {
    return this.db.transaction(async (tx) => {
      const project = await requireProjectRow(tx, scope, projectId);
      const parsed = sources.map((source) => ProjectSource.parse(source));
      for (const source of parsed) {
        if (source.projectId !== projectId || source.workspaceId !== project.workspaceId) throw new Error('Source project scope mismatch');
      }
      if (parsed.length) await tx.insert(projectSources).values(parsed.map((source) => ({ ...source, organizationId: scope.organizationId })));
      await updateProject(tx, scope, project, { status: 'SOURCES_READY', updatedAt: new Date().toISOString() });
      return parsed;
    });
  }

  async saveKnowledge(scope: OrganizationScope, knowledge: ProjectKnowledgeType) {
    const parsed = ProjectKnowledge.parse(knowledge);
    return this.db.transaction(async (tx) => {
      const project = await requireProjectRow(tx, scope, parsed.projectId);
      await persistKnowledge(tx, scope, parsed);
      await tx.delete(documentApprovals).where(and(
        eq(documentApprovals.organizationId, scope.organizationId),
        eq(documentApprovals.projectId, parsed.projectId),
        ne(documentApprovals.graphVersion, parsed.graphVersion),
      ));
      await updateProject(tx, scope, project, {
        graphVersion: parsed.graphVersion,
        status: parsed.gaps.some((gap) => gap.status === 'OPEN') ? 'NEEDS_CLARIFICATION' : 'ANALYZED',
        updatedAt: new Date().toISOString(),
      });
      return parsed;
    });
  }

  async saveArchitectureBrief(scope: OrganizationScope, brief: ArchitectureBriefType) {
    const parsed = ArchitectureBrief.parse(brief);
    return this.db.transaction(async (tx) => {
      const project = await requireProjectRow(tx, scope, parsed.projectId);
      if (parsed.graphVersion !== project.graphVersion) throw new Error('Architecture brief must reference the current project graph');
      await tx.insert(architectureBriefs).values({
        id: parsed.id, organizationId: scope.organizationId, projectId: parsed.projectId,
        graphVersion: parsed.graphVersion, payload: parsed, updatedAt: parsed.updatedAt,
      }).onConflictDoUpdate({
        target: [architectureBriefs.organizationId, architectureBriefs.projectId, architectureBriefs.graphVersion],
        set: { id: parsed.id, payload: parsed, updatedAt: parsed.updatedAt },
      });
      await updateProject(tx, scope, project, { updatedAt: parsed.updatedAt });
      return parsed;
    });
  }

  async saveDocuments(scope: OrganizationScope, projectId: string, documents: ProjectDocumentType[]) {
    const parsed = documents.map((document) => ProjectDocument.parse(document));
    return this.db.transaction(async (tx) => {
      const project = await requireProjectRow(tx, scope, projectId);
      if (parsed.some((document) => document.projectId !== projectId)) throw new Error('Document project scope mismatch');
      if (parsed.length) await tx.insert(projectDocuments).values(parsed.map((document) => documentRow(scope, document)));
      if (parsed.some((document) => document.revisionInstruction)) {
        await tx.delete(documentApprovals).where(and(eq(documentApprovals.organizationId, scope.organizationId), eq(documentApprovals.projectId, projectId)));
      }
      const status = parsed.some((document) => document.type === 'hld' && document.truthStatus === 'HUMAN_APPROVED')
        ? 'HLD_READY' as const
        : project.status === 'NEEDS_CLARIFICATION' ? 'NEEDS_CLARIFICATION' as const : 'DOCUMENTED' as const;
      await updateProject(tx, scope, project, { status, updatedAt: new Date().toISOString() });
      return parsed;
    });
  }

  async saveKnowledgeAndDocuments(scope: OrganizationScope, knowledge: ProjectKnowledgeType, documents: ProjectDocumentType[]) {
    const parsedKnowledge = ProjectKnowledge.parse(knowledge);
    const parsedDocuments = documents.map((document) => ProjectDocument.parse(document));
    const requiredTypes = ['requirements', 'srs', 'nfr', 'hld'];
    const missingTypes = requiredTypes.filter((type) => !parsedDocuments.some((document) => document.type === type && document.sourceGraphVersion === parsedKnowledge.graphVersion));
    if (missingTypes.length) throw new Error(`Clarification regeneration is incomplete: ${missingTypes.join(', ')}`);
    return this.db.transaction(async (tx) => {
      const project = await requireProjectRow(tx, scope, parsedKnowledge.projectId);
      if (parsedDocuments.some((document) => document.projectId !== project.id)) throw new Error('Document project scope mismatch');
      await persistKnowledge(tx, scope, parsedKnowledge);
      await tx.insert(projectDocuments).values(parsedDocuments.map((document) => documentRow(scope, document)));
      await tx.delete(documentApprovals).where(and(eq(documentApprovals.organizationId, scope.organizationId), eq(documentApprovals.projectId, project.id)));
      await updateProject(tx, scope, project, {
        graphVersion: parsedKnowledge.graphVersion,
        status: parsedKnowledge.gaps.some((gap) => gap.status === 'OPEN') ? 'NEEDS_CLARIFICATION' : 'DOCUMENTED',
        updatedAt: new Date().toISOString(),
      });
      return { knowledge: parsedKnowledge, documents: parsedDocuments };
    });
  }

  async saveDocumentApproval(scope: OrganizationScope, approval: DocumentApprovalType) {
    const parsed = DocumentApproval.parse(approval);
    return this.db.transaction(async (tx) => {
      const project = await requireProjectRow(tx, scope, parsed.projectId);
      if (parsed.graphVersion !== project.graphVersion) throw new Error('Document approval must reference the current project graph');
      await tx.insert(documentApprovals).values({
        id: parsed.id, organizationId: scope.organizationId, projectId: parsed.projectId,
        graphVersion: parsed.graphVersion, payload: parsed, approvedAt: parsed.approvedAt,
      }).onConflictDoUpdate({
        target: [documentApprovals.organizationId, documentApprovals.projectId],
        set: { id: parsed.id, graphVersion: parsed.graphVersion, payload: parsed, approvedAt: parsed.approvedAt },
      });
      await updateProject(tx, scope, project, { status: 'DOCUMENTS_APPROVED', updatedAt: new Date().toISOString() });
      return parsed;
    });
  }

  async deleteProject(scope: OrganizationScope, projectId: string) {
    return this.db.transaction(async (tx) => {
      const project = await tx.select({ id: projects.id }).from(projects).where(scopedProject(scope, projectId)).limit(1);
      if (!project[0]) return { deleted: false, rawPaths: [] };
      const sources = await tx.select({ rawPath: projectSources.rawPath }).from(projectSources).where(and(
        eq(projectSources.organizationId, scope.organizationId), eq(projectSources.projectId, projectId),
      ));
      await tx.delete(projects).where(scopedProject(scope, projectId));
      return { deleted: true, rawPaths: sources.map((source) => source.rawPath) };
    });
  }

  async saveArbDecision(scope: OrganizationScope, decision: ArbDecisionType) {
    const parsed = ArbDecision.parse(decision);
    return this.db.transaction(async (tx) => {
      const project = await requireProjectRow(tx, scope, parsed.projectId);
      if (parsed.graphVersion !== project.graphVersion) throw new Error('ARB graph version must match the current project graph');
      await tx.insert(arbDecisions).values({
        id: parsed.id, organizationId: scope.organizationId, projectId: parsed.projectId,
        graphVersion: parsed.graphVersion, version: parsed.version, payload: parsed, approvedAt: parsed.approvedAt,
      });
      await updateProject(tx, scope, project, { status: 'ARB_APPROVED', updatedAt: new Date().toISOString() });
      return parsed;
    });
  }

  async saveNotionPublication(scope: OrganizationScope, publication: NotionPublicationType) {
    const parsed = NotionPublication.parse(publication);
    return this.db.transaction(async (tx) => {
      const project = await requireProjectRow(tx, scope, parsed.projectId);
      await tx.insert(notionPublications).values({
        id: parsed.id, organizationId: scope.organizationId, projectId: parsed.projectId,
        sourceGraphVersion: parsed.sourceGraphVersion, payload: parsed, publishedAt: parsed.publishedAt,
      }).onConflictDoUpdate({
        target: [notionPublications.organizationId, notionPublications.projectId],
        set: { id: parsed.id, sourceGraphVersion: parsed.sourceGraphVersion, payload: parsed, publishedAt: parsed.publishedAt },
      });
      await updateProject(tx, scope, project, { status: 'PUBLISHED', updatedAt: new Date().toISOString() });
      return parsed;
    });
  }

  async saveJiraPublication(scope: OrganizationScope, publication: JiraPublicationType) {
    const parsed = JiraPublication.parse(publication);
    return this.db.transaction(async (tx) => {
      const project = await requireProjectRow(tx, scope, parsed.projectId);
      if (parsed.sourceGraphVersion !== project.graphVersion) throw new Error('Jira backlog must reference the current project graph');
      await tx.insert(jiraPublications).values({
        id: parsed.id, organizationId: scope.organizationId, projectId: parsed.projectId,
        sourceGraphVersion: parsed.sourceGraphVersion, planHash: parsed.planHash,
        payload: parsed, createdAt: parsed.createdAt,
      }).onConflictDoUpdate({
        target: [jiraPublications.organizationId, jiraPublications.projectId],
        set: { id: parsed.id, sourceGraphVersion: parsed.sourceGraphVersion, planHash: parsed.planHash, payload: parsed, createdAt: parsed.createdAt },
      });
      await updateProject(tx, scope, project, { status: 'BACKLOG_READY', updatedAt: new Date().toISOString() });
      return parsed;
    });
  }

  async saveWireframeRevision(scope: OrganizationScope, revision: WireframeRevisionType) {
    const parsed = WireframeRevision.parse(revision);
    return this.db.transaction(async (tx) => {
      const project = await requireProjectRow(tx, scope, parsed.projectId);
      if (parsed.sourceGraphVersion !== project.graphVersion) throw new Error('Wireframe revision must reference the current project graph');
      await tx.insert(wireframeRevisions).values({
        id: parsed.id, organizationId: scope.organizationId, projectId: parsed.projectId,
        sourceGraphVersion: parsed.sourceGraphVersion, screenId: parsed.screenId,
        revision: parsed.revision, payload: parsed, createdAt: parsed.createdAt,
      });
      await updateProject(tx, scope, project, { updatedAt: new Date().toISOString() });
      return parsed;
    });
  }
}
