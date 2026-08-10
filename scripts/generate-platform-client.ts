import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function generatePlatformClient(
  outputPath = process.env.AXIOM_PLATFORM_CLIENT_OUTPUT ?? resolve(process.cwd(), 'src/platform/generated'),
): Promise<void> {
  await execFileAsync(resolve(process.cwd(), 'node_modules/.bin/openapi-ts'), [], {
    cwd: process.cwd(),
    env: { ...process.env, AXIOM_PLATFORM_CLIENT_OUTPUT: outputPath },
  });

  const zodPath = resolve(outputPath, 'zod.gen.ts');
  const generated = await readFile(zodPath, 'utf8');
  const strict = generated.replaceAll('z.object(', 'z.strictObject(');
  if (strict === generated || strict.includes('z.object(')) {
    throw new Error('Expected generated OpenAPI objects to require deterministic strict-object correction.');
  }
  await writeFile(zodPath, strict, 'utf8');

  const document = JSON.parse(await readFile(resolve(process.cwd(), 'openapi/axiom-platform-v1.json'), 'utf8')) as {
    paths?: Record<string, { post?: { responses?: Record<string, { content?: Record<string, { schema?: unknown }> }> } }>;
  };
  const clarificationError = document.paths?.['/api/v1/organizations/{organizationId}/projects/{projectId}/work-item-generations']
    ?.post?.responses?.['422']?.content?.['application/json']?.schema;
  if (!clarificationError) throw new Error('The platform OpenAPI artifact must document the 422 clarification response.');
  const errorModule = `/* This file is auto-generated from the reviewed OpenAPI error response. */
/* @hey-api/openapi-ts 0.99.0 does not export Zod validators for error responses. */

import { z } from 'zod';

import type { GenerateWorkItemDraftError } from './types.gen';

const schema = ${JSON.stringify(clarificationError, null, 2)} as const;

export const zGenerateWorkItemDraftError = z.fromJSONSchema(schema as never) as z.ZodType<GenerateWorkItemDraftError>;
`;
  await writeFile(resolve(outputPath, 'errors.gen.ts'), errorModule, 'utf8');
}

const executedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (executedPath === import.meta.url) {
  void generatePlatformClient()
    .then(() => console.log('Generated strict platform client, SDK types, and Zod validators.'))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
