import { describe, expect, it } from 'vitest';
import {
  checkArchitectureBoundaries,
  classifyApiRoute,
  type ArchitectureFile,
} from '../scripts/check-architecture-boundaries';

function file(path: string, content: string): ArchitectureFile {
  return { path, content };
}

describe('web architecture boundaries', () => {
  it('classifies the owned API namespaces and rejects an unknown namespace', () => {
    expect(classifyApiRoute('app/api/auth/session/route.ts')).toBe('auth');
    expect(classifyApiRoute('app/api/platform/me/organizations/route.ts')).toBe('platform');
    expect(classifyApiRoute('app/api/projects/route.ts')).toBe('legacy');
    expect(classifyApiRoute('app/api/unclassified/route.ts')).toBeUndefined();

    expect(checkArchitectureBoundaries([
      file('app/api/unclassified/route.ts', 'export function GET() {}'),
    ])).toEqual([expect.objectContaining({ code: 'UNCLASSIFIED_ROUTE' })]);
  });

  it('rejects commercial BFF imports from legacy web modules', () => {
    const violations = checkArchitectureBoundaries([
      file('app/api/platform/me/route.ts', "import { getProject } from '../../../../src/projects/store';"),
      file('app/api/auth/session/route.ts', "import type { Run } from '@/src/runner/schemas';"),
    ]);

    expect(violations.map((violation) => violation.code)).toEqual([
      'BFF_LEGACY_IMPORT',
      'BFF_LEGACY_IMPORT',
    ]);
  });

  it('rejects hosted execution packages in imports and dependency declarations', () => {
    const violations = checkArchitectureBoundaries([
      file('src/example.ts', "import OpenAI from 'openai';\nconst load = () => import('@vercel/sandbox');"),
      file('package.json', JSON.stringify({ dependencies: { openai: '1.0.0', '@vercel/sandbox': '1.0.0' } })),
      file('pnpm-lock.yaml', "  openai@1.0.0:\n  '@vercel/sandbox@1.0.0':\n"),
    ]);

    expect(violations.filter((violation) => violation.code === 'BANNED_PACKAGE')).toHaveLength(6);
  });

  it('allows Blob only in the exact retained migration adapters', () => {
    const allowed = checkArchitectureBoundaries([
      file('src/projects/store.ts', "import { put } from '@vercel/blob';"),
      file('src/runner/store.ts', "const blob = await import('@vercel/blob');"),
    ]);
    const rejected = checkArchitectureBoundaries([
      file('app/api/platform/blob/route.ts', "import { put } from '@vercel/blob';"),
    ]);

    expect(allowed).toEqual([]);
    expect(rejected).toEqual([expect.objectContaining({ code: 'BLOB_IMPORT_LOCATION' })]);
  });

  it('requires workflow actions to use full commit SHAs while allowing local actions', () => {
    const pinnedSha = '0123456789abcdef0123456789abcdef01234567';
    const violations = checkArchitectureBoundaries([
      file('.github/workflows/pinned.yml', `steps:\n  - uses: actions/checkout@${pinnedSha}\n  - uses: ./actions/verify\n`),
      file('.github/workflows/unpinned.yaml', "steps:\n  - uses: actions/setup-node@v4\n  - uses: 'pnpm/action-setup@1234567'\n"),
    ]);

    expect(violations).toEqual([
      expect.objectContaining({ code: 'UNPINNED_WORKFLOW_ACTION', message: expect.stringContaining('actions/setup-node@v4') }),
      expect.objectContaining({ code: 'UNPINNED_WORKFLOW_ACTION', message: expect.stringContaining('pnpm/action-setup@1234567') }),
    ]);
  });

  it('prevents handwritten platform fields and raw commercial endpoint strings', () => {
    const violations = checkArchitectureBoundaries([
      file('src/platform/contracts.ts', "import { z } from 'zod';\nexport const Project = z.object({ id: z.string() });"),
      file('app/api/platform/projects/route.ts', "const path = '/api/v1/organizations/ORG/projects';"),
      file('src/platform/generated/sdk.gen.ts', "export const url = '/api/v1/generated';"),
    ]);

    expect(violations).toEqual([
      expect.objectContaining({ code: 'RAW_PLATFORM_ENDPOINT', file: 'app/api/platform/projects/route.ts' }),
      expect.objectContaining({ code: 'HANDWRITTEN_PLATFORM_CONTRACT', file: 'src/platform/contracts.ts' }),
    ]);
  });
});
