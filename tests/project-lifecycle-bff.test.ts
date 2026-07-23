import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentSessionToken: vi.fn(),
  requestPlatform: vi.fn(),
}));

vi.mock('../src/platform/session', () => ({ currentSessionToken: mocks.currentSessionToken }));
vi.mock('../src/platform/request', () => ({
  requestPlatform: mocks.requestPlatform,
  safeRequestId: (value: string | null) => value ?? 'generated-request-id',
}));

import { handleProjectLifecycleMutation } from '../src/platform/project-lifecycle-bff';

describe('project lifecycle BFF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentSessionToken.mockResolvedValue('A'.repeat(43));
    mocks.requestPlatform.mockResolvedValue({
      status: 200,
      requestId: 'lifecycle-request-001',
      etag: '"PROJ-ONE:2"',
      idempotencyReplayed: null,
      body: {
        id: 'PROJ-ONE',
        workspaceId: 'WS-ONE',
        name: 'Project One',
        status: 'ARCHIVED',
        graphVersion: 4,
        rowVersion: 2,
        archivedAt: '2026-07-21T00:00:00.000Z',
        createdAt: '2026-07-20T00:00:00.000Z',
        updatedAt: '2026-07-21T00:00:00.000Z',
      },
    });
  });

  it('validates and forwards an exact same-origin lifecycle precondition', async () => {
    const response = await handleProjectLifecycleMutation(
      new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/archive', {
        method: 'POST',
        headers: {
          host: '127.0.0.1',
          origin: 'http://127.0.0.1',
          'if-match': '"PROJ-ONE:1"',
          'x-request-id': 'lifecycle-request-001',
        },
      }),
      { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) },
      'archive',
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('etag')).toBe('"PROJ-ONE:2"');
    expect(mocks.requestPlatform).toHaveBeenCalledWith(
      '/api/v1/organizations/ORG-ONE/projects/PROJ-ONE/archive',
      'A'.repeat(43),
      'lifecycle-request-001',
      { method: 'POST', ifMatch: '"PROJ-ONE:1"' },
    );
  });

  it('rejects cross-origin mutation before reading the session', async () => {
    const response = await handleProjectLifecycleMutation(
      new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/archive', {
        method: 'POST',
        headers: {
          host: '127.0.0.1',
          origin: 'http://attacker.invalid',
          'if-match': '"PROJ-ONE:1"',
        },
      }),
      { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) },
      'archive',
    );

    expect(response.status).toBe(403);
    expect(mocks.currentSessionToken).not.toHaveBeenCalled();
    expect(mocks.requestPlatform).not.toHaveBeenCalled();
  });
});
