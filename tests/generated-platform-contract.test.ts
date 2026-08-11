import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { findGeneratedDrift } from '../scripts/check-generated-platform-client';
import { readVendoredProvenance, verifyVendoredProvenance } from '../scripts/sync-platform-openapi';
import { zGenerateWorkItemDraftError } from '../src/platform/generated/errors.gen';
import { zCreateProjectBody, zGetProjectResponse } from '../src/platform/generated/zod.gen';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('generated platform contract', () => {
  it('binds the reviewed artifact bytes to immutable provenance', async () => {
    const provenance = await readVendoredProvenance();

    expect(provenance).toMatchObject({
      schemaVersion: 1,
      sourceRepository: 'axiom-platform',
      sourcePath: 'openapi/axiom-platform-v1.json',
      generator: { package: '@hey-api/openapi-ts', version: '0.99.0' },
    });
    expect(provenance.sha256).toBe('457999429f4a172bd1b0bbd4da70d2b64dd8aa5b75bcbd438c935ff5f67bb2fe');
    expect(provenance.bytes).toBe(729_242);
    await expect(verifyVendoredProvenance()).resolves.toEqual([]);
  });

  it('reports missing, unexpected, and changed generated files without git state', async () => {
    const root = await mkdtemp(join(tmpdir(), 'axiom-contract-drift-test-'));
    temporaryDirectories.push(root);
    const expected = resolve(root, 'expected');
    const actual = resolve(root, 'actual');
    await Promise.all([mkdir(expected), mkdir(actual)]);
    await Promise.all([
      writeFile(resolve(expected, 'changed.ts'), 'expected\n'),
      writeFile(resolve(actual, 'changed.ts'), 'actual\n'),
      writeFile(resolve(expected, 'missing.ts'), 'missing\n'),
      writeFile(resolve(actual, 'unexpected.ts'), 'unexpected\n'),
    ]);

    await expect(findGeneratedDrift(expected, actual)).resolves.toEqual([
      'Changed generated file: changed.ts',
      'Missing generated file: missing.ts',
      'Unexpected generated file: unexpected.ts',
    ]);
  });

  it('validates representative generated request and response contracts strictly', () => {
    expect(zCreateProjectBody.safeParse({ workspaceId: 'WS-ONE', name: 'Commercial Axiom' }).success).toBe(true);
    expect(zCreateProjectBody.safeParse({ workspaceId: 'invalid', name: 'x' }).success).toBe(false);
    expect(zCreateProjectBody.safeParse({ workspaceId: 'WS-ONE', name: 'Commercial Axiom', extra: true }).success).toBe(false);

    const project = {
      id: 'PROJ-ONE',
      workspaceId: 'WS-ONE',
      name: 'Commercial Axiom',
      status: 'DRAFT',
      graphVersion: 0,
      rowVersion: 1,
      archivedAt: null,
      createdAt: '2026-08-11T00:00:00.000Z',
      updatedAt: '2026-08-11T00:00:00.000Z',
    };
    expect(zGetProjectResponse.safeParse(project).success).toBe(true);
    expect(zGetProjectResponse.safeParse({ ...project, status: 'UNKNOWN' }).success).toBe(false);

    const clarificationRequired = {
      error: {
        code: 'CLARIFICATION_REQUIRED',
        message: 'Canonical gaps must be answered.',
        requestId: 'request-001',
        retryable: false,
        details: {
          blockers: [{
            category: 'SECURITY',
            clarification: null,
            description: 'Authentication policy is unknown.',
            gapId: 'GAP-AUTH',
            severity: 'BLOCKER',
            title: 'Authentication policy',
            truthStatus: 'UNKNOWN',
            type: 'OPEN_QUESTION',
          }],
        },
      },
    };
    expect(zGenerateWorkItemDraftError.safeParse(clarificationRequired).success).toBe(true);
    expect(zGenerateWorkItemDraftError.safeParse({ ...clarificationRequired, extra: true }).success).toBe(false);
    expect(zGenerateWorkItemDraftError.safeParse({ ...clarificationRequired, error: { ...clarificationRequired.error, retryable: true } }).success).toBe(false);
  });
});
