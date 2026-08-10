import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentSessionToken: vi.fn(), requestPlatform: vi.fn() }));
vi.mock('../src/platform/session', () => ({ currentSessionToken: mocks.currentSessionToken }));
vi.mock('../src/platform/request', () => ({ requestPlatform: mocks.requestPlatform, safeRequestId: (value: string | null) => value ?? 'artifact-request-id' }));

import { POST as approveArtifacts } from '../app/api/platform/organizations/[organizationId]/projects/[projectId]/artifacts/approvals/route';
import { POST as generateArtifacts } from '../app/api/platform/organizations/[organizationId]/projects/[projectId]/artifacts/generations/route';

const hashes = { requirements: 'a'.repeat(64), srs: 'b'.repeat(64), nfr: 'c'.repeat(64) };
const project = {
  id: 'PROJ-ONE', workspaceId: 'WS-ONE', name: 'Product One', status: 'DOCUMENTED', graphVersion: 3, rowVersion: 6,
  archivedAt: null, createdAt: '2026-07-23T00:00:00.000Z', updatedAt: '2026-07-24T00:00:00.000Z',
};
const artifacts = (['requirements', 'srs', 'nfr'] as const).map((type) => ({
  id: `DOC-${type}`, projectId: 'PROJ-ONE', type, version: 1, sourceGraphVersion: 3, title: `${type} artifact`,
  content: `# Exact ${type} artifact`, sha256: hashes[type], truthStatus: 'AI_SUGGESTED',
  provenance: { mode: 'DETERMINISTIC_COMPILER', compilerVersion: 'requirement-baseline-compiler-v1', sourceEntityIds: ['REQ-ONE'], sourceIds: ['SOURCE-ONE'] },
  generatedAt: '2026-07-24T00:00:00.000Z',
}));
const generation = { project, baseline: { projectId: 'PROJ-ONE', graphVersion: 3, artifacts, approval: null }, replayed: false };

function artifactRequest(path: string, body: unknown, idempotencyKey: string) {
  return new Request(`http://127.0.0.1${path}`, {
    method: 'POST',
    headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json', 'idempotency-key': idempotencyKey, 'if-match': '"PROJ-ONE:5"' },
    body: JSON.stringify(body),
  });
}

describe('artifact BFF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentSessionToken.mockResolvedValue('A'.repeat(43));
    mocks.requestPlatform.mockResolvedValue({ status: 201, requestId: 'artifact-001', etag: '"PROJ-ONE:6"', idempotencyReplayed: 'false', body: generation });
  });

  it('forwards deterministic generation with project concurrency and idempotency', async () => {
    const path = '/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/artifacts/generations';
    const response = await generateArtifacts(artifactRequest(path, { sourceGraphVersion: 3 }, 'artifact-generate-001'), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(201);
    expect(response.headers.get('etag')).toBe('"PROJ-ONE:6"');
    expect(mocks.requestPlatform).toHaveBeenCalledWith(expect.any(Function), 'A'.repeat(43), 'artifact-request-id');
  });

  it('forwards approval of the exact three hashes and rationale', async () => {
    const approval = { id: 'DOCAPP-ONE', projectId: 'PROJ-ONE', graphVersion: 3, documentHashes: hashes, comment: 'The exact baseline is source-grounded and complete.', truthStatus: 'HUMAN_APPROVED', approvedByUserId: 'USER-ONE', approvedAt: '2026-07-24T01:00:00.000Z' };
    const approved = { project: { ...project, status: 'DOCUMENTS_APPROVED', rowVersion: 7 }, baseline: { projectId: 'PROJ-ONE', graphVersion: 3, artifacts, approval }, replayed: false };
    mocks.requestPlatform.mockResolvedValue({ status: 201, requestId: 'artifact-002', etag: '"PROJ-ONE:7"', idempotencyReplayed: 'false', body: approved });
    const body = { sourceGraphVersion: 3, documentHashes: hashes, comment: approval.comment };
    const path = '/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/artifacts/approvals';
    const response = await approveArtifacts(artifactRequest(path, body, 'artifact-approve-001'), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(201);
    expect(mocks.requestPlatform).toHaveBeenCalledWith(expect.any(Function), 'A'.repeat(43), 'artifact-request-id');
  });

  it('rejects cross-origin requests before reading the session', async () => {
    const request = new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/artifacts/generations', { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://attacker.invalid' } });
    const response = await generateArtifacts(request, { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(403);
    expect(mocks.currentSessionToken).not.toHaveBeenCalled();
  });

  it('rejects a malformed successful platform response', async () => {
    mocks.requestPlatform.mockResolvedValue({ status: 201, requestId: 'artifact-003', etag: null, idempotencyReplayed: null, body: { baseline: null } });
    const path = '/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/artifacts/generations';
    const response = await generateArtifacts(artifactRequest(path, { sourceGraphVersion: 3 }, 'artifact-generate-002'), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(502);
  });
});
