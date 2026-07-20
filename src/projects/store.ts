import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { BlobPreconditionFailedError, del, get, put } from '@vercel/blob';
import {
  ArbDecision,
  ArchitectureBrief,
  DocumentApproval,
  JiraPublication,
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
  type ArchitectureBrief as ArchitectureBriefType,
  type DocumentApproval as DocumentApprovalType,
  type JiraPublication as JiraPublicationType,
  type WireframeRevision as WireframeRevisionType,
} from './schemas';

const DEFAULT_WORKSPACE_ID = 'WS-PRODUCT-ENGINEERING';
const isVercelRuntime = Boolean(process.env.VERCEL);
const blobStorageConfigured = Boolean(
  process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID),
);
const useBlobStorage = process.env.AXIOM_STORAGE_MODE === 'vercel-blob' || (isVercelRuntime && blobStorageConfigured);
const databaseBlobPath = 'axiom/projects.json';
const dataRoot = isVercelRuntime
  ? join(tmpdir(), 'axiom-data')
  : process.env.AXIOM_DATA_DIR
  ? resolve(process.env.AXIOM_DATA_DIR)
  : join(/* turbopackIgnore: true */ process.cwd(), '.axiom-data');
const databasePath = join(dataRoot, 'projects.json');
const usePostgresStorage = process.env.AXIOM_PROJECT_STORE === 'postgres';

let writeQueue = Promise.resolve();

function isBlobPreconditionFailure(cause: unknown) {
  return cause instanceof BlobPreconditionFailedError
    || (cause instanceof Error && (
      cause.name === 'BlobPreconditionFailedError'
      || /precondition failed.*etag mismatch/i.test(cause.message)
    ));
}

function waitForBlobConsistency(attempt: number) {
  return new Promise((resolveWait) => setTimeout(resolveWait, 50 * (2 ** attempt)));
}

function emptyDatabase(): ProjectDatabaseType {
  const now = new Date().toISOString();
  return ProjectDatabase.parse({
    version: 1,
    workspaces: [{ id: DEFAULT_WORKSPACE_ID, name: 'Product Engineering', createdAt: now, updatedAt: now }],
    projects: [],
    sources: [],
    knowledge: [],
    architectureBriefs: [],
    arbDecisions: [],
    documents: [],
    documentApprovals: [],
    notionPublications: [],
    jiraPublications: [],
    wireframeRevisions: [],
  });
}

function strongBlobEtag(etag: string) {
  return etag.startsWith('W/') ? etag.slice(2) : etag;
}

async function readBlobDatabase() {
  if (!blobStorageConfigured) {
    throw new Error('Vercel Blob is not connected. Configure BLOB_STORE_ID with Vercel OIDC or BLOB_READ_WRITE_TOKEN.');
  }
  const result = await get(databaseBlobPath, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) return { database: emptyDatabase(), etag: undefined };
  const content = await new Response(result.stream).text();
  return { database: ProjectDatabase.parse(JSON.parse(content)), etag: strongBlobEtag(result.blob.etag) };
}

async function readLocalDatabase() {
  try {
    return { database: ProjectDatabase.parse(JSON.parse(await readFile(databasePath, 'utf8'))), etag: undefined };
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return { database: emptyDatabase(), etag: undefined };
    throw cause;
  }
}

async function readDatabaseVersion() {
  if (isVercelRuntime && !useBlobStorage) {
    throw new Error('Axiom requires a connected Vercel Blob store for durable hosted project data.');
  }
  return useBlobStorage ? readBlobDatabase() : readLocalDatabase();
}

async function readDatabase() {
  return (await readDatabaseVersion()).database;
}

async function writeDatabase(database: ProjectDatabaseType, etag?: string) {
  const parsed = ProjectDatabase.parse(database);
  if (useBlobStorage) {
    await put(databaseBlobPath, JSON.stringify(parsed), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      contentType: 'application/json',
      ...(etag ? { ifMatch: etag } : {}),
    });
    return;
  }
  await mkdir(dirname(databasePath), { recursive: true });
  const temporary = `${databasePath}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(parsed, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  await rename(temporary, databasePath);
}

async function mutate<T>(operation: (database: ProjectDatabaseType) => T | Promise<T>): Promise<T> {
  let result!: T;
  const next = writeQueue.then(async () => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { database, etag } = await readDatabaseVersion();
      result = await operation(database);
      try {
        await writeDatabase(database, etag);
        return;
      } catch (cause) {
        if (!isBlobPreconditionFailure(cause) || attempt === 5) throw cause;
        await waitForBlobConsistency(attempt);
      }
    }
  });
  writeQueue = next.then(() => undefined, () => undefined);
  await next;
  return result;
}

export function projectDataRoot() {
  return dataRoot;
}

export function projectUsesBlobStorage() {
  return useBlobStorage;
}

export async function listWorkspaces() {
  if (usePostgresStorage) return (await import('./postgres-store')).listWorkspaces();
  return (await readDatabase()).workspaces;
}

export async function createProject(name: string, workspaceId = DEFAULT_WORKSPACE_ID) {
  if (usePostgresStorage) return (await import('./postgres-store')).createProject(name, workspaceId);
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
  if (usePostgresStorage) return (await import('./postgres-store')).listProjects(workspaceId);
  return (await readDatabase()).projects.filter((project) => project.workspaceId === workspaceId);
}

export async function getProject(projectId: string) {
  if (usePostgresStorage) return (await import('./postgres-store')).getProject(projectId);
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === projectId);
  if (!project) return null;
  return {
    project,
    workspace: database.workspaces.find((item) => item.id === project.workspaceId) ?? null,
    sources: database.sources.filter((item) => item.projectId === projectId),
    knowledge: database.knowledge.find((item) => item.projectId === projectId) ?? null,
    architectureBrief: database.architectureBriefs.find((item) => item.projectId === projectId && item.graphVersion === project.graphVersion) ?? null,
    arbDecision: database.arbDecisions.filter((item) => item.projectId === projectId).sort((a, b) => b.version - a.version)[0] ?? null,
    documents: database.documents.filter((item) => item.projectId === projectId),
    documentApproval: database.documentApprovals.filter((item) => item.projectId === projectId).sort((a, b) => b.approvedAt.localeCompare(a.approvedAt))[0] ?? null,
    notionPublication: database.notionPublications.find((item) => item.projectId === projectId) ?? null,
    jiraPublication: database.jiraPublications.find((item) => item.projectId === projectId) ?? null,
    wireframeRevisions: database.wireframeRevisions.filter((item) => item.projectId === projectId),
  };
}

export async function addSources(projectId: string, sources: ProjectSourceType[]) {
  if (usePostgresStorage) return (await import('./postgres-store')).addSources(projectId, sources);
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
  if (usePostgresStorage) return (await import('./postgres-store')).saveKnowledge(knowledge);
  return mutate((database) => {
    const project = database.projects.find((item) => item.id === knowledge.projectId);
    if (!project) throw new Error('Project not found');
    const parsed = ProjectKnowledge.parse(knowledge);
    database.knowledge = database.knowledge.filter((item) => item.projectId !== knowledge.projectId);
    database.knowledge.push(parsed);
    database.documentApprovals = database.documentApprovals.filter((item) => item.projectId !== knowledge.projectId || item.graphVersion === parsed.graphVersion);
    project.graphVersion = parsed.graphVersion;
    project.status = parsed.gaps.some((gap) => gap.status === 'OPEN') ? 'NEEDS_CLARIFICATION' : 'ANALYZED';
    project.updatedAt = new Date().toISOString();
    return parsed;
  });
}

export async function saveArchitectureBrief(brief: ArchitectureBriefType) {
  if (usePostgresStorage) return (await import('./postgres-store')).saveArchitectureBrief(brief);
  return mutate((database) => {
    const project = database.projects.find((item) => item.id === brief.projectId);
    if (!project) throw new Error('Project not found');
    const parsed = ArchitectureBrief.parse(brief);
    if (parsed.graphVersion !== project.graphVersion) throw new Error('Architecture brief must reference the current project graph');
    database.architectureBriefs = database.architectureBriefs.filter((item) => item.projectId !== brief.projectId || item.graphVersion !== brief.graphVersion);
    database.architectureBriefs.push(parsed);
    project.updatedAt = parsed.updatedAt;
    return parsed;
  });
}

export async function saveDocuments(projectId: string, documents: ProjectDocumentType[]) {
  if (usePostgresStorage) return (await import('./postgres-store')).saveDocuments(projectId, documents);
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

export async function saveKnowledgeAndDocuments(knowledge: ProjectKnowledgeType, documents: ProjectDocumentType[]) {
  if (usePostgresStorage) return (await import('./postgres-store')).saveKnowledgeAndDocuments(knowledge, documents);
  return mutate((database) => {
    const project = database.projects.find((item) => item.id === knowledge.projectId);
    if (!project) throw new Error('Project not found');
    const parsedKnowledge = ProjectKnowledge.parse(knowledge);
    const parsedDocuments = documents.map((document) => ProjectDocument.parse(document));
    const requiredTypes = ['requirements', 'srs', 'nfr', 'hld'];
    const missingTypes = requiredTypes.filter((type) => !parsedDocuments.some((document) => document.type === type && document.sourceGraphVersion === parsedKnowledge.graphVersion));
    if (missingTypes.length) throw new Error(`Clarification regeneration is incomplete: ${missingTypes.join(', ')}`);

    database.knowledge = database.knowledge.filter((item) => item.projectId !== knowledge.projectId);
    database.knowledge.push(parsedKnowledge);
    database.documents.push(...parsedDocuments);
    database.documentApprovals = database.documentApprovals.filter((item) => item.projectId !== knowledge.projectId);
    project.graphVersion = parsedKnowledge.graphVersion;
    project.status = parsedKnowledge.gaps.some((gap) => gap.status === 'OPEN') ? 'NEEDS_CLARIFICATION' : 'DOCUMENTED';
    project.updatedAt = new Date().toISOString();
    return { knowledge: parsedKnowledge, documents: parsedDocuments };
  });
}

export async function saveDocumentApproval(approval: DocumentApprovalType) {
  if (usePostgresStorage) return (await import('./postgres-store')).saveDocumentApproval(approval);
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
  if (usePostgresStorage) {
    const result = await (await import('./postgres-store')).deleteProject(projectId);
    if (!result.deleted) return false;
    if (useBlobStorage) {
      if (result.rawPaths.length) await del(result.rawPaths);
    } else {
      const root = resolve(dataRoot);
      const sourcePaths = result.rawPaths.map((path) => resolve(dataRoot, path));
      await Promise.all(sourcePaths.filter((path) => path.startsWith(`${root}${sep}`)).map((path) => unlink(path).catch(() => undefined)));
    }
    return true;
  }
  const database = await readDatabase();
  const project = database.projects.find((item) => item.id === projectId);
  if (!project) return false;
  const storedSourcePaths = database.sources.filter((item) => item.projectId === projectId).map((item) => item.rawPath);
  await mutate((nextDatabase) => {
    nextDatabase.projects = nextDatabase.projects.filter((item) => item.id !== projectId);
    nextDatabase.sources = nextDatabase.sources.filter((item) => item.projectId !== projectId);
    nextDatabase.knowledge = nextDatabase.knowledge.filter((item) => item.projectId !== projectId);
    nextDatabase.architectureBriefs = nextDatabase.architectureBriefs.filter((item) => item.projectId !== projectId);
    nextDatabase.arbDecisions = nextDatabase.arbDecisions.filter((item) => item.projectId !== projectId);
    nextDatabase.documents = nextDatabase.documents.filter((item) => item.projectId !== projectId);
    nextDatabase.documentApprovals = nextDatabase.documentApprovals.filter((item) => item.projectId !== projectId);
    nextDatabase.notionPublications = nextDatabase.notionPublications.filter((item) => item.projectId !== projectId);
    nextDatabase.jiraPublications = nextDatabase.jiraPublications.filter((item) => item.projectId !== projectId);
    nextDatabase.wireframeRevisions = nextDatabase.wireframeRevisions.filter((item) => item.projectId !== projectId);
  });
  if (useBlobStorage) {
    if (storedSourcePaths.length) await del(storedSourcePaths);
  } else {
    const root = resolve(dataRoot);
    const sourcePaths = storedSourcePaths.map((path) => resolve(dataRoot, path));
    await Promise.all(sourcePaths.filter((path) => path.startsWith(`${root}${sep}`)).map((path) => unlink(path).catch(() => undefined)));
  }
  return true;
}

export async function saveArbDecision(decision: ArbDecisionType) {
  if (usePostgresStorage) return (await import('./postgres-store')).saveArbDecision(decision);
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
  if (usePostgresStorage) return (await import('./postgres-store')).saveNotionPublication(publication);
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

export async function saveJiraPublication(publication: JiraPublicationType) {
  if (usePostgresStorage) return (await import('./postgres-store')).saveJiraPublication(publication);
  return mutate((database) => {
    const project = database.projects.find((item) => item.id === publication.projectId);
    if (!project) throw new Error('Project not found');
    const parsed = JiraPublication.parse(publication);
    if (parsed.sourceGraphVersion !== project.graphVersion) throw new Error('Jira backlog must reference the current project graph');
    database.jiraPublications = database.jiraPublications.filter((item) => item.projectId !== publication.projectId);
    database.jiraPublications.push(parsed);
    project.status = 'BACKLOG_READY';
    project.updatedAt = new Date().toISOString();
    return parsed;
  });
}

export async function saveWireframeRevision(revision: WireframeRevisionType) {
  if (usePostgresStorage) return (await import('./postgres-store')).saveWireframeRevision(revision);
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

export const validators = { Workspace, Project, ProjectSource, ProjectKnowledge, ProjectDocument, DocumentApproval, ArbDecision, NotionPublication, JiraPublication, WireframeRevision };
