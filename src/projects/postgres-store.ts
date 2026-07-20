import { getDatabase } from '../db/client';
import { LOCAL_ORGANIZATION_ID } from '../db/prototype-import';
import { DEFAULT_WORKSPACE_ID } from '../db/seed';
import { PostgresProjectRepository } from './postgres-repository';
import type {
  ArbDecision,
  ArchitectureBrief,
  DocumentApproval,
  JiraPublication,
  NotionPublication,
  ProjectDocument,
  ProjectKnowledge,
  ProjectSource,
  WireframeRevision,
} from './schemas';

const scope = { organizationId: LOCAL_ORGANIZATION_ID } as const;
const repository = new PostgresProjectRepository(getDatabase());

export const listWorkspaces = () => repository.listWorkspaces(scope);
export const createProject = (name: string, workspaceId = DEFAULT_WORKSPACE_ID) => repository.createProject(scope, name, workspaceId);
export const listProjects = (workspaceId = DEFAULT_WORKSPACE_ID) => repository.listProjects(scope, workspaceId);
export const getProject = (projectId: string) => repository.getProject(scope, projectId);
export const addSources = (projectId: string, sources: ProjectSource[]) => repository.addSources(scope, projectId, sources);
export const saveKnowledge = (knowledge: ProjectKnowledge) => repository.saveKnowledge(scope, knowledge);
export const saveArchitectureBrief = (brief: ArchitectureBrief) => repository.saveArchitectureBrief(scope, brief);
export const saveDocuments = (projectId: string, documents: ProjectDocument[]) => repository.saveDocuments(scope, projectId, documents);
export const saveKnowledgeAndDocuments = (knowledge: ProjectKnowledge, documents: ProjectDocument[]) => repository.saveKnowledgeAndDocuments(scope, knowledge, documents);
export const saveDocumentApproval = (approval: DocumentApproval) => repository.saveDocumentApproval(scope, approval);
export const deleteProject = (projectId: string) => repository.deleteProject(scope, projectId);
export const saveArbDecision = (decision: ArbDecision) => repository.saveArbDecision(scope, decision);
export const saveNotionPublication = (publication: NotionPublication) => repository.saveNotionPublication(scope, publication);
export const saveJiraPublication = (publication: JiraPublication) => repository.saveJiraPublication(scope, publication);
export const saveWireframeRevision = (revision: WireframeRevision) => repository.saveWireframeRevision(scope, revision);
