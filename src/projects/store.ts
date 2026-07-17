import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import {
  ArbDecision,
  DocumentApproval,
  NotionPublication,
  Project,
  ProjectDatabase,
  ProjectDocument,
  ProjectKnowledge,
  ProjectSource,
  WireframeRevision,
  Workspace,
  type NotionPublication as NotionPublicationType,
  type ProjectDatabase as ProjectDatabaseType,
  type ProjectDocument as ProjectDocumentType,
  type ProjectKnowledge as ProjectKnowledgeType,
  type ProjectSource as ProjectSourceType,
  type ArbDecision as ArbDecisionType,
  type DocumentApproval as DocumentApprovalType,
  type WireframeRevision as WireframeRevisionType,
} from './schemas';

const DEFAULT_WORKSPACE_ID = 'WS-PRODUCT-ENGINEERING';
const dataRoot = process.env.AXIOM_DATA_DIR
  ? resolve(process.env.AXIOM_DATA_DIR)
  : join(/* turbopackIgnore: true */ process.cwd(), '.axiom-data');
const databasePath = join(dataRoot, 'projects.json');

let writeQueue = Promise.resolve();

function emptyDatabase(): ProjectDatabaseType {
  const now = new Date().toISOString();
  return ProjectDatabase.parse({
    version: 1,
    workspaces: [{ id: DEFAULT_WORKSPACE_ID, name: 'Product Engineering', createdAt: now, updatedAt: now }],
    projects: [],
    sources: [],
    knowledge: [],
    arbDecisions: [],
    documents: [],
    documentApprovals: [],
    notionPublications: [],
    wireframeRevisions: [],
  });
}

async function readDatabase() {
  try {
    return ProjectDatabase.parse(JSON.parse(await readFile(databasePath, 'utf8')));
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return emptyDatabase();
    throw cause;
  }
}

async function writeDatabase(database: ProjectDatabaseType) {
  const parsed = ProjectDatabase.parse(database);
  await mkdir(dirname(databasePath), { recursive: true });
  const temporary = `${databasePath}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(parsed, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  await rename(temporary, databasePath);
}

async function mutate<T>(operation: (database: ProjectDatabaseType) => T | Promise<T>): Promise<T> {
  let result!: T;
  const next = writeQueue.then(async () => {
    const database = await readDatabase();
    result = await operation(database);
    await writeDatabase(database);
  });
  writeQueue = next.then(() => undefined, () => undefined);
  await next;
  return result;
}

export function projectDataRoot() {
  return dataRoot;
}

export async function listWorkspaces() {
  return (await readDatabase()).workspaces;
}

export async function createProject(name: string, workspaceId = DEFAULT_WORKSPACE_ID) {
  return mutate((database) => {
    const workspace = database.workspaces.find((item) => item.id === workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    const now = new Date().toISOString();
    const project = Project.parse({
      id: `PROJ-${randomUUID()}`,
      workspaceId,
      name,
      status: 'DRAFT',
      graphVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
    database.projects.push(project);
    return project;
  });
}

export async function listProjects(workspaceId = DEFAULT_WORKSPACE_ID) {
  return (await readDatabase()).projects.filter((project) => project.workspaceId === workspaceId);
}

export async function getProject(projectId: string) {
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === projectId);
  if (!project) return null;
  return {
    project,
    workspace: database.workspaces.find((item) => item.id === project.workspaceId) ?? null,
    sources: database.sources.filter((item) => item.projectId === projectId),
    knowledge: database.knowledge.find((item) => item.projectId === projectId) ?? null,
    arbDecision: database.arbDecisions.filter((item) => item.projectId === projectId).sort((a, b) => b.version - a.version)[0] ?? null,
    documents: database.documents.filter((item) => item.projectId === projectId),
    documentApproval: database.documentApprovals.filter((item) => item.projectId === projectId).sort((a, b) => b.approvedAt.localeCompare(a.approvedAt))[0] ?? null,
    notionPublication: database.notionPublications.find((item) => item.projectId === projectId) ?? null,
    wireframeRevisions: database.wireframeRevisions.filter((item) => item.projectId === projectId),
  };
}

export async function addSources(projectId: string, sources: ProjectSourceType[]) {
  return mutate((database) => {
    const project = database.projects.find((item) => item.id === projectId);
    if (!project) throw new Error('Project not found');
    for (const source of sources) {
      if (source.projectId !== projectId || source.workspaceId !== project.workspaceId) throw new Error('Source project scope mismatch');
      database.sources.push(ProjectSource.parse(source));
    }
    project.status = 'SOURCES_READY';
    project.updatedAt = new Date().toISOString();
    return sources;
  });
}

export async function saveKnowledge(knowledge: ProjectKnowledgeType) {
  return mutate((database) => {
    const project = database.projects.find((item) => item.id === knowledge.projectId);
    if (!project) throw new Error('Project not found');
    const parsed = ProjectKnowledge.parse(knowledge);
    database.knowledge = database.knowledge.filter((item) => item.projectId !== knowledge.projectId);
    database.knowledge.push(parsed);
    project.graphVersion = parsed.graphVersion;
    project.status = parsed.gaps.some((gap) => gap.status === 'OPEN' && gap.severity === 'BLOCKER') ? 'NEEDS_CLARIFICATION' : 'ANALYZED';
    project.updatedAt = new Date().toISOString();
    return parsed;
  });
}

export async function saveDocuments(projectId: string, documents: ProjectDocumentType[]) {
  return mutate((database) => {
    const project = database.projects.find((item) => item.id === projectId);
    if (!project) throw new Error('Project not found');
    const parsed = documents.map((document) => ProjectDocument.parse(document));
    database.documents.push(...parsed);
    if (parsed.some((document) => document.revisionInstruction)) {
      database.documentApprovals = database.documentApprovals.filter((item) => item.projectId !== projectId);
    }
    project.status = parsed.some((document) => document.type === 'hld' && document.truthStatus === 'HUMAN_APPROVED')
      ? 'HLD_READY'
      : project.status === 'NEEDS_CLARIFICATION' ? 'NEEDS_CLARIFICATION' : 'DOCUMENTED';
    project.updatedAt = new Date().toISOString();
    return parsed;
  });
}

export async function saveDocumentApproval(approval: DocumentApprovalType) {
  return mutate((database) => {
    const project = database.projects.find((item) => item.id === approval.projectId);
    if (!project) throw new Error('Project not found');
    const parsed = DocumentApproval.parse(approval);
    if (parsed.graphVersion !== project.graphVersion) throw new Error('Document approval must reference the current project graph');
    database.documentApprovals = database.documentApprovals.filter((item) => item.projectId !== approval.projectId);
    database.documentApprovals.push(parsed);
    project.status = 'DOCUMENTS_APPROVED';
    project.updatedAt = new Date().toISOString();
    return parsed;
  });
}

export async function deleteProject(projectId: string) {
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === projectId);
  if (!project) return false;
  const sourcePaths = database.sources.filter((item) => item.projectId === projectId).map((item) => resolve(item.rawPath));
  await mutate((nextDatabase) => {
    nextDatabase.projects = nextDatabase.projects.filter((item) => item.id !== projectId);
    nextDatabase.sources = nextDatabase.sources.filter((item) => item.projectId !== projectId);
    nextDatabase.knowledge = nextDatabase.knowledge.filter((item) => item.projectId !== projectId);
    nextDatabase.arbDecisions = nextDatabase.arbDecisions.filter((item) => item.projectId !== projectId);
    nextDatabase.documents = nextDatabase.documents.filter((item) => item.projectId !== projectId);
    nextDatabase.documentApprovals = nextDatabase.documentApprovals.filter((item) => item.projectId !== projectId);
    nextDatabase.notionPublications = nextDatabase.notionPublications.filter((item) => item.projectId !== projectId);
    nextDatabase.wireframeRevisions = nextDatabase.wireframeRevisions.filter((item) => item.projectId !== projectId);
  });
  const root = resolve(dataRoot);
  await Promise.all(sourcePaths.filter((path) => path.startsWith(`${root}${sep}`)).map((path) => unlink(path).catch(() => undefined)));
  return true;
}

export async function saveArbDecision(decision: ArbDecisionType) {
  return mutate((database) => {
    const project = database.projects.find((item) => item.id === decision.projectId);
    if (!project) throw new Error('Project not found');
    const parsed = ArbDecision.parse(decision);
    if (parsed.graphVersion !== project.graphVersion) throw new Error('ARB graph version must match the current project graph');
    database.arbDecisions.push(parsed);
    project.status = 'ARB_APPROVED';
    project.updatedAt = new Date().toISOString();
    return parsed;
  });
}

export async function saveNotionPublication(publication: NotionPublicationType) {
  return mutate((database) => {
    const project = database.projects.find((item) => item.id === publication.projectId);
    if (!project) throw new Error('Project not found');
    const parsed = NotionPublication.parse(publication);
    database.notionPublications = database.notionPublications.filter((item) => item.projectId !== publication.projectId);
    database.notionPublications.push(parsed);
    project.status = 'PUBLISHED';
    project.updatedAt = new Date().toISOString();
    return parsed;
  });
}

export async function saveWireframeRevision(revision: WireframeRevisionType) {
  return mutate((database) => {
    const project = database.projects.find((item) => item.id === revision.projectId);
    if (!project) throw new Error('Project not found');
    const parsed = WireframeRevision.parse(revision);
    if (parsed.sourceGraphVersion !== project.graphVersion) throw new Error('Wireframe revision must reference the current project graph');
    database.wireframeRevisions.push(parsed);
    project.updatedAt = new Date().toISOString();
    return parsed;
  });
}

export const validators = { Workspace, Project, ProjectSource, ProjectKnowledge, ProjectDocument, DocumentApproval, ArbDecision, NotionPublication, WireframeRevision };
