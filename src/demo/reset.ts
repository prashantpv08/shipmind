import 'server-only';
import { lstat, readdir, rm } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { DemoResetResult, type DemoResetResult as DemoResetResultType } from '../export/schemas';

type DemoResetOptions = {
  repositoryRoot?: string;
  dataRoot?: string;
};

function assertInside(root: string, target: string) {
  const child = relative(root, target);
  if (!child || child.startsWith('..')) throw new Error('Demo reset target escapes its approved root');
}

async function exists(path: string) {
  try {
    await lstat(path);
    return true;
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw cause;
  }
}

async function resetOnce(options: DemoResetOptions = {}): Promise<DemoResetResultType> {
  const startedAt = Date.now();
  const repositoryRoot = resolve(options.repositoryRoot ?? process.cwd());
  const dataRoot = resolve(options.dataRoot ?? process.env.AXIOM_DATA_DIR ?? join(repositoryRoot, '.axiom-data'));
  const sandboxRoot = join(repositoryRoot, 'sandbox/notification-service');
  const verificationRoot = join(dataRoot, 'verification');
  assertInside(repositoryRoot, sandboxRoot);
  assertInside(dataRoot, verificationRoot);

  const removedTargets: string[] = [];
  for (const entry of await readdir(sandboxRoot).catch((cause: NodeJS.ErrnoException) => {
    if (cause.code === 'ENOENT') return [];
    throw cause;
  })) {
    if (entry === 'workspace' || entry.startsWith('.axiom-stage-') || entry.startsWith('workspace.backup-')) {
      const target = join(sandboxRoot, entry);
      assertInside(sandboxRoot, target);
      await rm(target, { recursive: true, force: true });
      removedTargets.push(`sandbox/notification-service/${entry}`);
    }
  }

  if (await exists(verificationRoot)) {
    await rm(verificationRoot, { recursive: true, force: true });
    removedTargets.push('.axiom-data/verification');
  }

  return DemoResetResult.parse({
    resetAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    removedTargets,
    preservedProjectData: true,
    status: 'RESET',
  });
}

let resetQueue: Promise<unknown> = Promise.resolve();

export function resetNotifyFlowDemo(options: DemoResetOptions = {}) {
  const result = resetQueue.then(() => resetOnce(options));
  resetQueue = result.catch(() => undefined);
  return result;
}
