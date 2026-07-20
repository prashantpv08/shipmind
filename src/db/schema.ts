import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type {
  ArchitectureOption,
  ArchitectureBrief,
  DocumentApproval,
  JiraPublication,
  NotionPublication,
  Project,
  ProjectGap,
  ProjectReadiness,
  TechStackRecommendation,
  WireframeRevision,
} from '../projects/schemas';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
};

const optimisticConcurrency = {
  rowVersion: integer('row_version').notNull().default(1),
};

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  ...optimisticConcurrency,
  ...timestamps,
}, (table) => [
  uniqueIndex('organizations_slug_uidx').on(table.slug),
  check('organizations_status_check', sql`${table.status} in ('ACTIVE', 'SUSPENDED', 'DELETED')`),
  check('organizations_row_version_check', sql`${table.rowVersion} > 0`),
]);

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  ...optimisticConcurrency,
  ...timestamps,
}, (table) => [
  uniqueIndex('workspaces_organization_id_id_uidx').on(table.organizationId, table.id),
  index('workspaces_organization_id_idx').on(table.organizationId),
  check('workspaces_row_version_check', sql`${table.rowVersion} > 0`),
]);

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  status: text('status').$type<Project['status']>().notNull(),
  graphVersion: integer('graph_version').notNull().default(0),
  ...optimisticConcurrency,
  ...timestamps,
}, (table) => [
  uniqueIndex('projects_organization_id_id_uidx').on(table.organizationId, table.id),
  index('projects_organization_workspace_idx').on(table.organizationId, table.workspaceId),
  foreignKey({
    name: 'projects_organization_workspace_fk',
    columns: [table.organizationId, table.workspaceId],
    foreignColumns: [workspaces.organizationId, workspaces.id],
  }).onDelete('cascade'),
  check('projects_graph_version_check', sql`${table.graphVersion} >= 0`),
  check('projects_row_version_check', sql`${table.rowVersion} > 0`),
  check('projects_status_check', sql`${table.status} in ('DRAFT', 'SOURCES_READY', 'ANALYZED', 'NEEDS_CLARIFICATION', 'DOCUMENTED', 'DOCUMENTS_APPROVED', 'DESIGN_READY', 'ARB_APPROVED', 'HLD_READY', 'PUBLISHED', 'BACKLOG_READY')`),
]);

export const projectSources = pgTable('project_sources', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  workspaceId: text('workspace_id').notNull(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  relativePath: text('relative_path'),
  kind: text('kind').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  sha256: text('sha256').notNull(),
  extractedText: text('extracted_text').notNull(),
  rawPath: text('raw_path').notNull(),
  status: text('status').notNull(),
  extractionError: text('extraction_error'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
  uniqueIndex('project_sources_organization_id_id_uidx').on(table.organizationId, table.id),
  index('project_sources_organization_project_idx').on(table.organizationId, table.projectId),
  index('project_sources_sha256_idx').on(table.organizationId, table.sha256),
  foreignKey({
    name: 'project_sources_organization_project_fk',
    columns: [table.organizationId, table.projectId],
    foreignColumns: [projects.organizationId, projects.id],
  }).onDelete('cascade'),
  foreignKey({
    name: 'project_sources_organization_workspace_fk',
    columns: [table.organizationId, table.workspaceId],
    foreignColumns: [workspaces.organizationId, workspaces.id],
  }).onDelete('cascade'),
  check('project_sources_size_check', sql`${table.size} >= 0`),
  check('project_sources_kind_check', sql`${table.kind} in ('FILE', 'FOLDER_FILE', 'MEETING_TRANSCRIPT')`),
  check('project_sources_status_check', sql`${table.status} in ('EXTRACTED', 'FAILED')`),
  check('project_sources_sha256_check', sql`${table.sha256} ~ '^[a-f0-9]{64}$'`),
]);

export const projectGraphs = pgTable('project_graphs', {
  organizationId: text('organization_id').notNull(),
  projectId: text('project_id').notNull(),
  graphVersion: integer('graph_version').notNull(),
  summary: text('summary').notNull(),
  readiness: jsonb('readiness').$type<ProjectReadiness>(),
  analyzer: text('analyzer').notNull(),
  analyzedAt: timestamp('analyzed_at', { withTimezone: true, mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ name: 'project_graphs_pk', columns: [table.projectId, table.graphVersion] }),
  uniqueIndex('project_graphs_organization_project_version_uidx').on(table.organizationId, table.projectId, table.graphVersion),
  index('project_graphs_organization_project_idx').on(table.organizationId, table.projectId),
  foreignKey({
    name: 'project_graphs_organization_project_fk',
    columns: [table.organizationId, table.projectId],
    foreignColumns: [projects.organizationId, projects.id],
  }).onDelete('cascade'),
  check('project_graphs_version_check', sql`${table.graphVersion} > 0`),
]);

export const projectGaps = pgTable('project_gaps', {
  id: text('id').notNull(),
  organizationId: text('organization_id').notNull(),
  projectId: text('project_id').notNull(),
  graphVersion: integer('graph_version').notNull(),
  position: integer('position').notNull(),
  type: text('type').$type<ProjectGap['type']>().notNull(),
  category: text('category').$type<ProjectGap['category']>().notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  severity: text('severity').$type<ProjectGap['severity']>().notNull(),
  impactAreas: jsonb('impact_areas').$type<string[]>().notNull(),
  affectedEntityIds: jsonb('affected_entity_ids').$type<string[]>().notNull(),
  affectedArtifacts: jsonb('affected_artifacts').$type<ProjectGap['affectedArtifacts']>().notNull(),
  rationale: text('rationale').notNull(),
  status: text('status').$type<ProjectGap['status']>().notNull(),
  truthStatus: text('truth_status').$type<ProjectGap['truthStatus']>().notNull(),
}, (table) => [
  primaryKey({ name: 'project_gaps_pk', columns: [table.id, table.graphVersion] }),
  uniqueIndex('project_gaps_scope_id_version_uidx').on(table.organizationId, table.projectId, table.graphVersion, table.id),
  index('project_gaps_organization_project_graph_idx').on(table.organizationId, table.projectId, table.graphVersion),
  foreignKey({
    name: 'project_gaps_graph_fk',
    columns: [table.organizationId, table.projectId, table.graphVersion],
    foreignColumns: [projectGraphs.organizationId, projectGraphs.projectId, projectGraphs.graphVersion],
  }).onDelete('cascade'),
  check('project_gaps_position_check', sql`${table.position} >= 0`),
]);

export const clarificationQuestions = pgTable('clarification_questions', {
  id: text('id').notNull(),
  organizationId: text('organization_id').notNull(),
  projectId: text('project_id').notNull(),
  graphVersion: integer('graph_version').notNull(),
  position: integer('position').notNull(),
  gapId: text('gap_id').notNull(),
  question: text('question').notNull(),
  whyItMatters: text('why_it_matters').notNull(),
  affectedEntityIds: jsonb('affected_entity_ids').$type<string[]>().notNull(),
  options: jsonb('options').$type<Array<{ id: string; label: string; value: string }>>().notNull(),
  status: text('status').notNull(),
  answer: text('answer'),
  answeredAt: timestamp('answered_at', { withTimezone: true, mode: 'string' }),
  truthStatus: text('truth_status').notNull(),
}, (table) => [
  primaryKey({ name: 'clarification_questions_pk', columns: [table.id, table.graphVersion] }),
  uniqueIndex('clarification_questions_scope_id_version_uidx').on(table.organizationId, table.projectId, table.graphVersion, table.id),
  index('clarification_questions_organization_project_graph_idx').on(table.organizationId, table.projectId, table.graphVersion),
  foreignKey({
    name: 'clarification_questions_graph_fk',
    columns: [table.organizationId, table.projectId, table.graphVersion],
    foreignColumns: [projectGraphs.organizationId, projectGraphs.projectId, projectGraphs.graphVersion],
  }).onDelete('cascade'),
  foreignKey({
    name: 'clarification_questions_gap_fk',
    columns: [table.organizationId, table.projectId, table.graphVersion, table.gapId],
    foreignColumns: [projectGaps.organizationId, projectGaps.projectId, projectGaps.graphVersion, projectGaps.id],
  }).onDelete('cascade'),
  check('clarification_questions_status_check', sql`${table.status} in ('OPEN', 'ANSWERED')`),
  check('clarification_questions_truth_status_check', sql`${table.truthStatus} in ('UNKNOWN', 'HUMAN_CONFIRMED')`),
  check('clarification_questions_position_check', sql`${table.position} >= 0`),
]);

export const knowledgeEntities = pgTable('knowledge_entities', {
  id: text('id').notNull(),
  organizationId: text('organization_id').notNull(),
  projectId: text('project_id').notNull(),
  graphVersion: integer('graph_version').notNull(),
  position: integer('position').notNull(),
  category: text('category').notNull(),
  text: text('text').notNull(),
  truthStatus: text('truth_status').notNull(),
  sourceId: text('source_id').references(() => projectSources.id),
  clarificationQuestionId: text('clarification_question_id'),
  quote: text('quote'),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
}, (table) => [
  primaryKey({ name: 'knowledge_entities_pk', columns: [table.id, table.graphVersion] }),
  uniqueIndex('knowledge_entities_scope_id_version_uidx').on(table.organizationId, table.projectId, table.graphVersion, table.id),
  index('knowledge_entities_organization_project_graph_idx').on(table.organizationId, table.projectId, table.graphVersion),
  index('knowledge_entities_source_idx').on(table.organizationId, table.sourceId),
  foreignKey({
    name: 'knowledge_entities_graph_fk',
    columns: [table.organizationId, table.projectId, table.graphVersion],
    foreignColumns: [projectGraphs.organizationId, projectGraphs.projectId, projectGraphs.graphVersion],
  }).onDelete('cascade'),
  foreignKey({
    name: 'knowledge_entities_clarification_fk',
    columns: [table.organizationId, table.projectId, table.graphVersion, table.clarificationQuestionId],
    foreignColumns: [clarificationQuestions.organizationId, clarificationQuestions.projectId, clarificationQuestions.graphVersion, clarificationQuestions.id],
  }),
  check('knowledge_entities_offsets_check', sql`(${table.startOffset} is null and ${table.endOffset} is null) or (${table.startOffset} >= 0 and ${table.endOffset} > ${table.startOffset})`),
  check('knowledge_entities_truth_status_check', sql`${table.truthStatus} in ('SOURCE_GROUNDED', 'HUMAN_CONFIRMED', 'UNKNOWN')`),
  check('knowledge_entities_position_check', sql`${table.position} >= 0`),
]);

export const architectureOptions = pgTable('architecture_options', {
  id: text('id').notNull(),
  organizationId: text('organization_id').notNull(),
  projectId: text('project_id').notNull(),
  graphVersion: integer('graph_version').notNull(),
  position: integer('position').notNull(),
  recommended: text('recommended').notNull(),
  payload: jsonb('payload').$type<ArchitectureOption>().notNull(),
}, (table) => [
  primaryKey({ name: 'architecture_options_pk', columns: [table.id, table.graphVersion] }),
  uniqueIndex('architecture_options_scope_id_version_uidx').on(table.organizationId, table.projectId, table.graphVersion, table.id),
  index('architecture_options_organization_project_graph_idx').on(table.organizationId, table.projectId, table.graphVersion),
  foreignKey({
    name: 'architecture_options_graph_fk',
    columns: [table.organizationId, table.projectId, table.graphVersion],
    foreignColumns: [projectGraphs.organizationId, projectGraphs.projectId, projectGraphs.graphVersion],
  }).onDelete('cascade'),
  check('architecture_options_recommended_check', sql`${table.recommended} in ('true', 'false')`),
  check('architecture_options_position_check', sql`${table.position} >= 0`),
]);

export const techStackRecommendations = pgTable('tech_stack_recommendations', {
  id: text('id').notNull(),
  organizationId: text('organization_id').notNull(),
  projectId: text('project_id').notNull(),
  graphVersion: integer('graph_version').notNull(),
  position: integer('position').notNull(),
  layer: text('layer').notNull(),
  payload: jsonb('payload').$type<TechStackRecommendation>().notNull(),
}, (table) => [
  primaryKey({ name: 'tech_stack_recommendations_pk', columns: [table.id, table.graphVersion] }),
  uniqueIndex('tech_stack_recommendations_scope_id_version_uidx').on(table.organizationId, table.projectId, table.graphVersion, table.id),
  index('tech_stack_recommendations_organization_project_graph_idx').on(table.organizationId, table.projectId, table.graphVersion),
  foreignKey({
    name: 'tech_stack_recommendations_graph_fk',
    columns: [table.organizationId, table.projectId, table.graphVersion],
    foreignColumns: [projectGraphs.organizationId, projectGraphs.projectId, projectGraphs.graphVersion],
  }).onDelete('cascade'),
  check('tech_stack_recommendations_position_check', sql`${table.position} >= 0`),
]);

export const architectureBriefs = pgTable('architecture_briefs', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  projectId: text('project_id').notNull(),
  graphVersion: integer('graph_version').notNull(),
  payload: jsonb('payload').$type<ArchitectureBrief>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
  uniqueIndex('architecture_briefs_project_graph_uidx').on(table.organizationId, table.projectId, table.graphVersion),
  foreignKey({
    name: 'architecture_briefs_organization_project_fk',
    columns: [table.organizationId, table.projectId],
    foreignColumns: [projects.organizationId, projects.id],
  }).onDelete('cascade'),
]);

export const arbDecisions = pgTable('arb_decisions', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  projectId: text('project_id').notNull(),
  graphVersion: integer('graph_version').notNull(),
  version: integer('version').notNull(),
  payload: jsonb('payload').notNull(),
  approvedAt: timestamp('approved_at', { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
  uniqueIndex('arb_decisions_project_version_uidx').on(table.organizationId, table.projectId, table.version),
  index('arb_decisions_project_approved_idx').on(table.organizationId, table.projectId, table.approvedAt),
  foreignKey({
    name: 'arb_decisions_organization_project_fk',
    columns: [table.organizationId, table.projectId],
    foreignColumns: [projects.organizationId, projects.id],
  }).onDelete('cascade'),
  check('arb_decisions_version_check', sql`${table.version} > 0 and ${table.graphVersion} > 0`),
]);

export const projectDocuments = pgTable('project_documents', {
  id: text('id').notNull(),
  organizationId: text('organization_id').notNull(),
  projectId: text('project_id').notNull(),
  type: text('type').notNull(),
  version: integer('version').notNull(),
  sourceGraphVersion: integer('source_graph_version').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  sha256: text('sha256').notNull(),
  truthStatus: text('truth_status').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  generatedAt: timestamp('generated_at', { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
  primaryKey({ name: 'project_documents_pk', columns: [table.id, table.version] }),
  uniqueIndex('project_documents_project_type_version_uidx').on(table.organizationId, table.projectId, table.type, table.version),
  index('project_documents_project_graph_idx').on(table.organizationId, table.projectId, table.sourceGraphVersion),
  foreignKey({
    name: 'project_documents_organization_project_fk',
    columns: [table.organizationId, table.projectId],
    foreignColumns: [projects.organizationId, projects.id],
  }).onDelete('cascade'),
  check('project_documents_version_check', sql`${table.version} > 0 and ${table.sourceGraphVersion} > 0`),
  check('project_documents_sha256_check', sql`${table.sha256} ~ '^[a-f0-9]{64}$'`),
  check('project_documents_type_check', sql`${table.type} in ('requirements', 'srs', 'nfr', 'hld', 'adr')`),
]);

export const documentApprovals = pgTable('document_approvals', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  projectId: text('project_id').notNull(),
  graphVersion: integer('graph_version').notNull(),
  payload: jsonb('payload').$type<DocumentApproval>().notNull(),
  approvedAt: timestamp('approved_at', { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
  uniqueIndex('document_approvals_project_uidx').on(table.organizationId, table.projectId),
  foreignKey({
    name: 'document_approvals_organization_project_fk',
    columns: [table.organizationId, table.projectId],
    foreignColumns: [projects.organizationId, projects.id],
  }).onDelete('cascade'),
]);

export const notionPublications = pgTable('notion_publications', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  projectId: text('project_id').notNull(),
  sourceGraphVersion: integer('source_graph_version').notNull(),
  payload: jsonb('payload').$type<NotionPublication>().notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
  uniqueIndex('notion_publications_project_uidx').on(table.organizationId, table.projectId),
  foreignKey({
    name: 'notion_publications_organization_project_fk',
    columns: [table.organizationId, table.projectId],
    foreignColumns: [projects.organizationId, projects.id],
  }).onDelete('cascade'),
]);

export const jiraPublications = pgTable('jira_publications', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  projectId: text('project_id').notNull(),
  sourceGraphVersion: integer('source_graph_version').notNull(),
  planHash: text('plan_hash').notNull(),
  payload: jsonb('payload').$type<JiraPublication>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
  uniqueIndex('jira_publications_project_uidx').on(table.organizationId, table.projectId),
  uniqueIndex('jira_publications_plan_hash_uidx').on(table.organizationId, table.projectId, table.planHash),
  foreignKey({
    name: 'jira_publications_organization_project_fk',
    columns: [table.organizationId, table.projectId],
    foreignColumns: [projects.organizationId, projects.id],
  }).onDelete('cascade'),
]);

export const wireframeRevisions = pgTable('wireframe_revisions', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  projectId: text('project_id').notNull(),
  sourceGraphVersion: integer('source_graph_version').notNull(),
  screenId: text('screen_id').notNull(),
  revision: integer('revision').notNull(),
  payload: jsonb('payload').$type<WireframeRevision>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
  uniqueIndex('wireframe_revisions_project_screen_revision_uidx').on(table.organizationId, table.projectId, table.screenId, table.revision),
  foreignKey({
    name: 'wireframe_revisions_organization_project_fk',
    columns: [table.organizationId, table.projectId],
    foreignColumns: [projects.organizationId, projects.id],
  }).onDelete('cascade'),
  check('wireframe_revisions_revision_check', sql`${table.revision} > 0 and ${table.sourceGraphVersion} > 0`),
]);

export const outboxEvents = pgTable('outbox_events', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  aggregateType: text('aggregate_type').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  eventType: text('event_type').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  status: text('status').notNull().default('PENDING'),
  attempts: integer('attempts').notNull().default(0),
  availableAt: timestamp('available_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  lockedAt: timestamp('locked_at', { withTimezone: true, mode: 'string' }),
  publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('outbox_events_organization_idempotency_uidx').on(table.organizationId, table.idempotencyKey),
  index('outbox_events_dispatch_idx').on(table.status, table.availableAt),
  check('outbox_events_status_check', sql`${table.status} in ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED')`),
  check('outbox_events_attempts_check', sql`${table.attempts} >= 0`),
]);

export const idempotencyRecords = pgTable('idempotency_records', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  scope: text('scope').notNull(),
  key: text('key').notNull(),
  requestHash: text('request_hash').notNull(),
  status: text('status').notNull().default('PROCESSING'),
  responseStatus: integer('response_status'),
  responsePayload: jsonb('response_payload').$type<Record<string, unknown>>(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex('idempotency_records_organization_scope_key_uidx').on(table.organizationId, table.scope, table.key),
  index('idempotency_records_expiry_idx').on(table.expiresAt),
  check('idempotency_records_status_check', sql`${table.status} in ('PROCESSING', 'COMPLETED', 'FAILED')`),
  check('idempotency_records_request_hash_check', sql`${table.requestHash} ~ '^[a-f0-9]{64}$'`),
]);

export const prototypeImports = pgTable('prototype_imports', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  sourceHash: text('source_hash').notNull(),
  status: text('status').notNull(),
  counts: jsonb('counts').$type<Record<string, number>>().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
  uniqueIndex('prototype_imports_organization_source_hash_uidx').on(table.organizationId, table.sourceHash),
  check('prototype_imports_status_check', sql`${table.status} in ('RUNNING', 'COMPLETED', 'FAILED')`),
]);
