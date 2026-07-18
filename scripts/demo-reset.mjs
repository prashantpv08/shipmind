import { lstat, readdir, rm } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const startedAt = Date.now();
const repositoryRoot = resolve(process.cwd());
const dataRoot = resolve(process.env.AXIOM_DATA_DIR ?? join(repositoryRoot, '.axiom-data'));
const sandboxRoot = join(repositoryRoot, 'sandbox/notification-service');
const verificationRoot = join(dataRoot, 'verification');
const removedTargets = [];

function assertInside(root, target) {
  const child = relative(root, target);
  if (!child || child.startsWith('..')) throw new Error('Demo reset target escapes its approved root');
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (cause) {
    if (cause.code === 'ENOENT') return false;
    throw cause;
  }
}

assertInside(repositoryRoot, sandboxRoot);
assertInside(dataRoot, verificationRoot);
for (const entry of await readdir(sandboxRoot).catch((cause) => {
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

console.log(JSON.stringify({
  status: 'RESET',
  durationMs: Date.now() - startedAt,
  removedTargets,
  preservedProjectData: true,
}));
