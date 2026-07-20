import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDatabaseHandle } from '../src/db/client';
import { applyPrototypeImport, buildPrototypeImportPlan } from '../src/db/prototype-import';

async function main() {
  const apply = process.argv.includes('--apply');
  const explicitPathIndex = process.argv.indexOf('--file');
  const dataRoot = process.env.AXIOM_DATA_DIR ? resolve(process.env.AXIOM_DATA_DIR) : resolve('.axiom-data');
  const sourcePath = explicitPathIndex >= 0 && process.argv[explicitPathIndex + 1]
    ? resolve(process.argv[explicitPathIndex + 1])
    : resolve(dataRoot, 'projects.json');
  const raw = JSON.parse(await readFile(sourcePath, 'utf8')) as unknown;
  const plan = buildPrototypeImportPlan(raw, process.env.AXIOM_IMPORT_ORGANIZATION_ID);
  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    sourcePath,
    organizationId: plan.organizationId,
    sourceHash: plan.sourceHash,
    counts: plan.counts,
    errors: plan.errors,
  };

  if (!apply) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (plan.errors.length) process.exitCode = 1;
  } else {
    const handle = createDatabaseHandle();
    try {
      const result = await applyPrototypeImport(handle.db, plan);
      process.stdout.write(`${JSON.stringify({ ...summary, result }, null, 2)}\n`);
    } finally {
      await handle.pool.end();
    }
  }
}

function safeErrorMessage(cause: unknown) {
  let current = cause;
  while (current instanceof Error && current.cause) current = current.cause;
  return current instanceof Error ? current.message.slice(0, 500) : 'Unknown import failure';
}

void main().catch((cause: unknown) => {
  process.stderr.write(`${JSON.stringify({ status: 'failed', error: safeErrorMessage(cause) }, null, 2)}\n`);
  process.exitCode = 1;
});
