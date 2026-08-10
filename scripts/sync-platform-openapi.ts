import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const GENERATOR_VERSION = '0.99.0';
const SOURCE_PATH = resolve(process.cwd(), '../axiom-platform/openapi/axiom-platform-v1.json');
const VENDORED_PATH = resolve(process.cwd(), 'openapi/axiom-platform-v1.json');
const PROVENANCE_PATH = resolve(process.cwd(), 'openapi/axiom-platform-v1.provenance.json');

export type PlatformOpenApiProvenance = {
  schemaVersion: 1;
  sourceRepository: 'axiom-platform';
  sourcePath: 'openapi/axiom-platform-v1.json';
  sha256: string;
  bytes: number;
  generator: {
    package: '@hey-api/openapi-ts';
    version: string;
  };
};

export function sha256(content: Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

export async function readVendoredProvenance(root = process.cwd()): Promise<PlatformOpenApiProvenance> {
  return JSON.parse(await readFile(resolve(root, 'openapi/axiom-platform-v1.provenance.json'), 'utf8')) as PlatformOpenApiProvenance;
}

export async function verifyVendoredProvenance(root = process.cwd()): Promise<string[]> {
  const input = await readFile(resolve(root, 'openapi/axiom-platform-v1.json'));
  const provenance = await readVendoredProvenance(root);
  const errors: string[] = [];
  if (provenance.sha256 !== sha256(input)) errors.push('Vendored OpenAPI SHA-256 does not match provenance.');
  if (provenance.bytes !== input.byteLength) errors.push('Vendored OpenAPI byte count does not match provenance.');
  if (provenance.generator.package !== '@hey-api/openapi-ts' || provenance.generator.version !== GENERATOR_VERSION) {
    errors.push('OpenAPI generator provenance does not match the pinned generator.');
  }
  return errors;
}

async function main(): Promise<void> {
  const source = await readFile(SOURCE_PATH);
  const document = JSON.parse(source.toString('utf8')) as { openapi?: unknown };
  if (document.openapi !== '3.1.0') throw new Error('The platform artifact must be OpenAPI 3.1.0.');

  const provenance: PlatformOpenApiProvenance = {
    schemaVersion: 1,
    sourceRepository: 'axiom-platform',
    sourcePath: 'openapi/axiom-platform-v1.json',
    sha256: sha256(source),
    bytes: source.byteLength,
    generator: { package: '@hey-api/openapi-ts', version: GENERATOR_VERSION },
  };

  await mkdir(dirname(VENDORED_PATH), { recursive: true });
  await copyFile(SOURCE_PATH, VENDORED_PATH);
  await writeFile(PROVENANCE_PATH, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');
  console.log(`Synced platform OpenAPI ${provenance.sha256} (${provenance.bytes} bytes).`);
}

const executedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (executedPath === import.meta.url) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
