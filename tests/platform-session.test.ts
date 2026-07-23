import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST as installLocalSession } from '../app/api/auth/local-session/route';
import {
  CurrentUserOrganizationsSchema,
  PlatformCreateProjectRequestSchema,
  PlatformProjectEtagSchema,
  PlatformProjectListQuerySchema,
  PlatformProjectListSchema,
  PlatformWorkspaceListSchema,
} from '../src/platform/contracts';
import { requestPlatform, safeRequestId } from '../src/platform/request';
import { validatedSessionToken } from '../src/platform/session';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

async function privateTokenFile(): Promise<{ path: string; token: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'axiom-session-'));
  temporaryDirectories.push(directory);
  const path = join(directory, 'session-token');
  const token = 'A'.repeat(43);
  await writeFile(path, `${token}\n`, { mode: 0o600 });
  return { path, token };
}

describe('platform session boundary', () => {
  it('accepts only 256-bit base64url session tokens', () => {
    expect(validatedSessionToken('A'.repeat(43))).toBe('A'.repeat(43));
    expect(validatedSessionToken('short')).toBeNull();
    expect(validatedSessionToken(`${'A'.repeat(42)}+`)).toBeNull();
  });

  it('accepts the platform organization contract with stable hyphenated IDs', () => {
    expect(CurrentUserOrganizationsSchema.safeParse({
      organizations: [{
        id: 'ORG-LOCAL-DEVELOPMENT',
        slug: 'local-development',
        name: 'Local Development',
        status: 'ACTIVE',
        role: 'OWNER',
      }],
    }).success).toBe(true);
    expect(CurrentUserOrganizationsSchema.safeParse({
      organizations: [{
        id: 'ORG-ENTERPRISE',
        slug: 'enterprise',
        name: 'Enterprise',
        status: 'ACTIVE',
        role: 'ADMINISTRATOR',
      }],
    }).success).toBe(true);
  });

  it('validates bounded project pages and rejects unknown query fields', () => {
    expect(PlatformProjectListSchema.safeParse({
      projects: [{
        id: 'PROJ-LOCAL-1',
        workspaceId: 'WS-PRODUCT-ENGINEERING',
        name: 'Commercial project',
        status: 'ANALYZED',
        graphVersion: 2,
        rowVersion: 1,
        archivedAt: null,
        createdAt: '2026-07-20T00:00:00.000Z',
        updatedAt: '2026-07-21T00:00:00.000Z',
      }],
      nextCursor: null,
    }).success).toBe(true);
    expect(PlatformProjectEtagSchema.safeParse('"PROJ-LOCAL-1:7"').success).toBe(true);
    expect(PlatformProjectEtagSchema.safeParse('"PROJ-LOCAL-1:0"').success).toBe(false);
    expect(PlatformProjectListQuerySchema.safeParse({ limit: '25', unscoped: 'true' }).success).toBe(false);
    expect(PlatformCreateProjectRequestSchema.safeParse({ name: ' New project ', workspaceId: 'WS-TEAM' }).success).toBe(true);
    expect(PlatformWorkspaceListSchema.safeParse({
      workspaces: [{
        id: 'WS-TEAM',
        name: 'Team',
        rowVersion: 1,
        createdAt: '2026-07-20T00:00:00.000Z',
        updatedAt: '2026-07-21T00:00:00.000Z',
      }],
      nextCursor: null,
    }).success).toBe(true);
  });

  it('forwards a bounded project creation request with server-side credentials and idempotency', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ created: true }), {
      status: 201,
      headers: { 'content-type': 'application/json', etag: '"PROJ-ONE:1"', 'idempotency-replayed': 'false' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('AXIOM_PLATFORM_URL', 'http://127.0.0.1:4100');

    const response = await requestPlatform(
      '/api/v1/organizations/ORG-ONE/projects',
      'A'.repeat(43),
      'project-request-001',
      {
        method: 'POST',
        body: { name: 'New project', workspaceId: 'WS-TEAM' },
        idempotencyKey: 'project-create-001',
      },
    );

    expect(response).toMatchObject({ status: 201, etag: '"PROJ-ONE:1"', idempotencyReplayed: 'false' });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:4100/api/v1/organizations/ORG-ONE/projects'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'New project', workspaceId: 'WS-TEAM' }),
        headers: expect.objectContaining({
          authorization: `Bearer ${'A'.repeat(43)}`,
          'idempotency-key': 'project-create-001',
        }),
      }),
    );
  });

  it('forwards project lifecycle preconditions without exposing credentials to the browser', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ARCHIVED' }), {
      status: 200,
      headers: { 'content-type': 'application/json', etag: '"PROJ-ONE:2"' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('AXIOM_PLATFORM_URL', 'http://127.0.0.1:4100');

    const response = await requestPlatform(
      '/api/v1/organizations/ORG-ONE/projects/PROJ-ONE/archive',
      'A'.repeat(43),
      'project-archive-001',
      { method: 'POST', ifMatch: '"PROJ-ONE:1"' },
    );

    expect(response).toMatchObject({ status: 200, etag: '"PROJ-ONE:2"' });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('http://127.0.0.1:4100/api/v1/organizations/ORG-ONE/projects/PROJ-ONE/archive'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: `Bearer ${'A'.repeat(43)}`,
          'if-match': '"PROJ-ONE:1"',
        }),
      }),
    );
  });

  it('preserves a safe request ID and replaces untrusted values', () => {
    expect(safeRequestId('request_123')).toBe('request_123');
    expect(safeRequestId('unsafe request id')).not.toBe('unsafe request id');
  });

  it('installs a private local token as an HTTP-only same-site cookie without returning it', async () => {
    const { path, token } = await privateTokenFile();
    vi.stubEnv('AXIOM_LOCAL_AUTH_ENABLED', 'true');
    vi.stubEnv('AXIOM_LOCAL_SESSION_TOKEN_FILE', path);

    const response = await installLocalSession(new Request('http://127.0.0.1/api/auth/local-session', {
      method: 'POST',
      headers: { host: '127.0.0.1', origin: 'http://127.0.0.1' },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')?.toLowerCase()).toContain('samesite=strict');
    expect(await response.text()).not.toContain(token);
  });

  it('rejects cross-origin installation and non-private token files', async () => {
    const { path } = await privateTokenFile();
    vi.stubEnv('AXIOM_LOCAL_AUTH_ENABLED', 'true');
    vi.stubEnv('AXIOM_LOCAL_SESSION_TOKEN_FILE', path);

    const crossOrigin = await installLocalSession(new Request('http://127.0.0.1/api/auth/local-session', {
      method: 'POST',
      headers: { host: '127.0.0.1', origin: 'http://attacker.invalid' },
    }));
    expect(crossOrigin.status).toBe(403);

    await chmod(path, 0o644);
    const unsafeFile = await installLocalSession(new Request('http://127.0.0.1/api/auth/local-session', {
      method: 'POST',
      headers: { host: '127.0.0.1', origin: 'http://127.0.0.1' },
    }));
    expect(unsafeFile.status).toBe(503);
  });
});
