import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { generatePlatformClient } from './generate-platform-client';
import { verifyVendoredProvenance } from './sync-platform-openapi';

async function filesUnder(root: string, directory = root): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      for (const [path, content] of await filesUnder(root, absolutePath)) files.set(path, content);
    } else if (entry.isFile()) {
      files.set(relative(root, absolutePath).replaceAll(sep, '/'), await readFile(absolutePath));
    }
  }
  return files;
}

export async function findGeneratedDrift(expectedRoot: string, actualRoot: string): Promise<string[]> {
  const [expected, actual] = await Promise.all([filesUnder(expectedRoot), filesUnder(actualRoot)]);
  const paths = [...new Set([...expected.keys(), ...actual.keys()])].sort();
  return paths.flatMap((path) => {
    if (!expected.has(path)) return [`Unexpected generated file: ${path}`];
    if (!actual.has(path)) return [`Missing generated file: ${path}`];
    return expected.get(path)!.equals(actual.get(path)!) ? [] : [`Changed generated file: ${path}`];
  });
}

async function main(): Promise<void> {
  const provenanceErrors = await verifyVendoredProvenance();
  if (provenanceErrors.length > 0) throw new Error(provenanceErrors.join('\n'));

  const temporaryRoot = await mkdtemp(join(tmpdir(), 'axiom-platform-client-'));
  const temporaryOutput = resolve(temporaryRoot, 'generated');
  try {
    await generatePlatformClient(temporaryOutput);
    const drift = await findGeneratedDrift(resolve(process.cwd(), 'src/platform/generated'), temporaryOutput);
    if (drift.length > 0) throw new Error(`Generated platform client drift detected:\n${drift.join('\n')}`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }

  console.log('Generated platform client matches the reviewed vendored OpenAPI artifact.');
}

const executedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (executedPath === import.meta.url) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
