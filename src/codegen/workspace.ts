import 'server-only';
import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, mkdtemp, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { CodeGenerationDraft, CodeGenerationOutput, type CodeGenerationOutput as CodeGenerationOutputType, type TraceLink } from './schemas';

export const ALLOWED_GENERATED_PATHS = [
  'src/contracts.ts',
  'src/provider.ts',
  'src/notification-service.ts',
  'tests/notification-service.unit.test.ts',
  'tests/notification-service.api.test.ts',
] as const;
export const FIXED_TEMPLATE_FILES = ['package.json', 'tsconfig.json', 'vitest.config.ts'] as const;
const MAX_TOTAL_BYTES = 256 * 1024;

export type WorkspaceOptions = {
  sandboxRoot?: string;
  templateRoot?: string;
  workspaceRoot?: string;
};

function sha256(content: string) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function unifiedCreateDiff(path: string, content: string) {
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return `--- /dev/null\n+++ b/${path}\n@@ -0,0 +1,${lines.length} @@\n${lines.map((line) => `+${line}`).join('\n')}\n`;
}

function assertWithin(root: string, target: string) {
  const child = relative(root, target);
  if (!child || child.startsWith('..') || child.includes('..' + requireSeparator())) {
    throw new Error('Generated target escapes the controlled workspace root');
  }
}

function requireSeparator() {
  return process.platform === 'win32' ? '\\' : '/';
}

async function assertNoSymlinks(path: string): Promise<void> {
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) throw new Error(`Symlinks are not allowed in the controlled workspace: ${path}`);
  if (!stat.isDirectory()) return;
  for (const entry of await readdir(path)) await assertNoSymlinks(join(path, entry));
}

async function copyTree(source: string, destination: string): Promise<void> {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Template symlinks are not allowed: ${from}`);
    if (entry.isDirectory()) await copyTree(from, to);
    else if (entry.isFile()) await copyFile(from, to);
    else throw new Error(`Unsupported template entry: ${from}`);
  }
}

function normalizeDraft(draft: unknown): CodeGenerationOutputType {
  const parsed = CodeGenerationDraft.parse(draft);
  const allowed = new Set<string>(ALLOWED_GENERATED_PATHS);
  const paths = parsed.operations.map((operation) => operation.path);
  if (new Set(paths).size !== paths.length) throw new Error('Generated output contains duplicate file paths');
  if (paths.some((path) => !allowed.has(path))) throw new Error('Generated output contains a path outside the allowlist');
  const totalBytes = parsed.operations.reduce((sum, operation) => sum + Buffer.byteLength(operation.content), 0);
  if (totalBytes > MAX_TOTAL_BYTES) throw new Error(`Generated output exceeds the ${MAX_TOTAL_BYTES}-byte total limit`);

  const files = parsed.operations.map((operation, fileIndex) => ({
    id: `CODE-FILE-${String(fileIndex + 1).padStart(3, '0')}`,
    path: operation.path,
    content: operation.content,
    hash: sha256(operation.content),
    linkedEntityIds: operation.linkedEntityIds,
    generationId: parsed.generationId,
    diff: unifiedCreateDiff(operation.path, operation.content),
  }));
  const ruleIds = new Set(parsed.provenance.ruleIds);
  const traceLinks: TraceLink[] = files.flatMap((file, fileIndex) => file.linkedEntityIds.map((entityId, linkIndex) => ({
    id: `TRACE-CODE-${String(fileIndex + 1).padStart(3, '0')}-${String(linkIndex + 1).padStart(2, '0')}`,
    fromType: ruleIds.has(entityId) ? 'constitution-rule' : entityId.startsWith('ART-') ? 'artifact' : entityId.startsWith('ADR-') ? 'decision' : entityId.startsWith('CQ-') ? 'clarification-question' : 'requirement',
    fromId: entityId,
    relation: file.path.startsWith('tests/') ? 'tests' as const : 'implements' as const,
    toType: 'code-file',
    toId: file.id,
  })));
  return CodeGenerationOutput.parse({
    generationId: parsed.generationId,
    projectId: parsed.projectId,
    sourceGraphVersion: parsed.sourceGraphVersion,
    selectedSliceId: parsed.selectedSliceId,
    generatedAt: parsed.generatedAt,
    provider: parsed.provider,
    provenance: parsed.provenance,
    workspaceRoot: 'sandbox/notification-service/workspace',
    templateFiles: FIXED_TEMPLATE_FILES,
    manifestHash: sha256(files.map((file) => `${file.id}:${file.hash}`).join('|')),
    files,
    traceLinks,
  });
}

async function writeOnce(draft: unknown, options: WorkspaceOptions = {}) {
  const output = normalizeDraft(draft);
  const sandboxRoot = options.sandboxRoot ? resolve(/* turbopackIgnore: true */ options.sandboxRoot) : join(/*turbopackIgnore: true*/ process.cwd(), 'sandbox/notification-service');
  const templateRoot = options.templateRoot ? resolve(/* turbopackIgnore: true */ options.templateRoot) : join(sandboxRoot, 'template');
  const workspaceRoot = options.workspaceRoot ? resolve(/* turbopackIgnore: true */ options.workspaceRoot) : join(sandboxRoot, 'workspace');
  assertWithin(sandboxRoot, templateRoot);
  assertWithin(sandboxRoot, workspaceRoot);
  await assertNoSymlinks(templateRoot);
  try { await assertNoSymlinks(workspaceRoot); } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') throw cause;
  }

  await mkdir(sandboxRoot, { recursive: true });
  const stageRoot = await mkdtemp(join(sandboxRoot, '.axiom-stage-'));
  const backupRoot = `${workspaceRoot}.backup-${Date.now()}`;
  let movedExisting = false;
  try {
    await copyTree(templateRoot, stageRoot);
    for (const file of output.files) {
      const target = join(stageRoot, file.path);
      assertWithin(stageRoot, target);
      await mkdir(dirname(target), { recursive: true });
      const temporary = `${target}.axiom-tmp`;
      await writeFile(temporary, file.content, { encoding: 'utf8', flag: 'wx' });
      await rename(temporary, target);
    }
    try { await rename(workspaceRoot, backupRoot); movedExisting = true; } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== 'ENOENT') throw cause;
    }
    await rename(stageRoot, workspaceRoot);
    if (movedExisting) await rm(backupRoot, { recursive: true, force: true });
    return output;
  } catch (cause) {
    await rm(stageRoot, { recursive: true, force: true });
    if (movedExisting) {
      try { await rename(backupRoot, workspaceRoot); } catch { /* Preserve the original failure. */ }
    }
    throw cause;
  }
}

let writeQueue: Promise<unknown> = Promise.resolve();

export function writeControlledWorkspace(draft: unknown, options: WorkspaceOptions = {}) {
  const result = writeQueue.then(() => writeOnce(draft, options));
  writeQueue = result.catch(() => undefined);
  return result;
}

export function validateCodeGeneration(draft: unknown) {
  return normalizeDraft(draft);
}
