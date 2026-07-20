import type {
  ArbDecision,
  ArchitectureBrief,
  DocumentApproval,
  JiraPublication,
  NotionPublication,
  Project,
  ProjectDocument,
  ProjectKnowledge,
  ProjectSource,
  WireframeRevision,
  Workspace,
} from './schemas';

export type OrganizationScope = Readonly<{ organizationId: string }>;

export type ProjectAggregate = {
  project: Project;
  workspace: Workspace | null;
  sources: ProjectSource[];
  knowledge: ProjectKnowledge | null;
  architectureBrief: ArchitectureBrief | null;
  arbDecision: ArbDecision | null;
  documents: ProjectDocument[];
  documentApproval: DocumentApproval | null;
  notionPublication: NotionPublication | null;
  jiraPublication: JiraPublication | null;
  wireframeRevisions: WireframeRevision[];
};

export interface ProjectRepository {
  listWorkspaces(scope: OrganizationScope): Promise<Workspace[]>;
  createProject(scope: OrganizationScope, name: string, workspaceId: string): Promise<Project>;
  listProjects(scope: OrganizationScope, workspaceId: string): Promise<Project[]>;
  getProject(scope: OrganizationScope, projectId: string): Promise<ProjectAggregate | null>;
  addSources(scope: OrganizationScope, projectId: string, sources: ProjectSource[]): Promise<ProjectSource[]>;
  saveKnowledge(scope: OrganizationScope, knowledge: ProjectKnowledge): Promise<ProjectKnowledge>;
  saveArchitectureBrief(scope: OrganizationScope, brief: ArchitectureBrief): Promise<ArchitectureBrief>;
  saveDocuments(scope: OrganizationScope, projectId: string, documents: ProjectDocument[]): Promise<ProjectDocument[]>;
  saveKnowledgeAndDocuments(scope: OrganizationScope, knowledge: ProjectKnowledge, documents: ProjectDocument[]): Promise<{ knowledge: ProjectKnowledge; documents: ProjectDocument[] }>;
  saveDocumentApproval(scope: OrganizationScope, approval: DocumentApproval): Promise<DocumentApproval>;
  deleteProject(scope: OrganizationScope, projectId: string): Promise<{ deleted: boolean; rawPaths: string[] }>;
  saveArbDecision(scope: OrganizationScope, decision: ArbDecision): Promise<ArbDecision>;
  saveNotionPublication(scope: OrganizationScope, publication: NotionPublication): Promise<NotionPublication>;
  saveJiraPublication(scope: OrganizationScope, publication: JiraPublication): Promise<JiraPublication>;
  saveWireframeRevision(scope: OrganizationScope, revision: WireframeRevision): Promise<WireframeRevision>;
}

export class OptimisticConcurrencyError extends Error {
  constructor(entity: string) {
    super(`${entity} changed while the operation was in progress`);
    this.name = 'OptimisticConcurrencyError';
  }
}
