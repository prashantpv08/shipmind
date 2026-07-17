import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const sandboxRoot = join(process.cwd(), 'sandbox/notification-service');
for (const entry of await readdir(sandboxRoot).catch(() => [])) {
  if (entry === 'workspace' || entry.startsWith('.axiom-stage-') || entry.startsWith('workspace.backup-')) {
    await rm(join(sandboxRoot, entry), { recursive: true, force: true });
  }
}
console.log('NotifyFlow demo reset: reload the app; the controlled generated workspace was removed.');
