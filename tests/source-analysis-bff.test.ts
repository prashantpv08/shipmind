import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentSessionToken: vi.fn(), requestPlatform: vi.fn() }));
vi.mock('../src/platform/session', () => ({ currentSessionToken: mocks.currentSessionToken }));
vi.mock('../src/platform/request', () => ({ requestPlatform: mocks.requestPlatform, safeRequestId: (value: string | null) => value ?? 'source-request-id' }));

import { POST as queueAnalysis } from '../app/api/platform/organizations/[organizationId]/projects/[projectId]/analysis-runs/route';
import { POST as uploadSource } from '../app/api/platform/organizations/[organizationId]/projects/[projectId]/sources/route';

const params = { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) };
const source = {
  id: `SRC-${'A'.repeat(24)}`, workspaceId: 'WS-ONE', projectId: 'PROJ-ONE', name: 'brief.md', relativePath: null,
  kind: 'FILE', mimeType: 'text/markdown', size: 25, sha256: 'a'.repeat(64), rawPath: 'ORG-ONE/PROJ-ONE/source/brief.md',
  status: 'EXTRACTED', extractionError: null, sourceKey: 'b'.repeat(64), version: 1, validationStatus: 'VALIDATED',
  validator: 'axiom-bounded-source-validator-v1', extractedAt: '2026-07-24T00:00:00.000Z', createdAt: '2026-07-24T00:00:00.000Z',
};
const run = {
  id: `ANRUN-${'B'.repeat(24)}`, projectId: 'PROJ-ONE', status: 'QUEUED', analyzer: 'axiom-deterministic-grounded-v1',
  sourceSnapshotHash: 'c'.repeat(64), attempts: 0, graphVersion: null, errorCode: null, errorMessage: null,
  startedAt: null, completedAt: null, cancelledAt: null, createdAt: '2026-07-24T00:01:00.000Z', updatedAt: '2026-07-24T00:01:00.000Z',
};

function mutation(path: string, body: unknown, key: string) {
  return new Request(`http://127.0.0.1${path}`, { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify(body) });
}

describe('source and analysis BFF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentSessionToken.mockResolvedValue('A'.repeat(43));
  });

  it('forwards a bounded source with its stable idempotency key', async () => {
    mocks.requestPlatform.mockResolvedValue({ status: 201, requestId: 'source-001', etag: null, idempotencyReplayed: 'false', body: source });
    const body = { name: 'brief.md', kind: 'FILE', mimeType: 'text/markdown', contentBase64: Buffer.from('Administrators shall invite.').toString('base64') };
    const response = await uploadSource(mutation('/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/sources', body, 'source-upload-001'), params);
    expect(response.status).toBe(201);
    expect(mocks.requestPlatform).toHaveBeenCalledWith(expect.any(Function), 'A'.repeat(43), 'source-request-id');
  });

  it('queues analysis and validates the durable run contract', async () => {
    mocks.requestPlatform.mockResolvedValue({ status: 202, requestId: 'analysis-001', etag: null, idempotencyReplayed: 'false', body: run });
    const body = { analyzer: 'axiom-deterministic-grounded-v1' };
    const response = await queueAnalysis(mutation('/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/analysis-runs', body, 'analysis-queue-001'), params);
    expect(response.status).toBe(202);
    expect(mocks.requestPlatform).toHaveBeenCalledWith(expect.any(Function), 'A'.repeat(43), 'source-request-id');
  });

  it('rejects cross-origin source writes before session access', async () => {
    const request = new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/sources', { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://attacker.invalid' } });
    expect((await uploadSource(request, params)).status).toBe(403);
    expect(mocks.currentSessionToken).not.toHaveBeenCalled();
  });

  it('rejects malformed successful platform responses', async () => {
    mocks.requestPlatform.mockResolvedValue({ status: 202, requestId: 'analysis-bad', etag: null, idempotencyReplayed: null, body: { status: 'QUEUED' } });
    const response = await queueAnalysis(mutation('/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/analysis-runs', { analyzer: 'axiom-deterministic-grounded-v1' }, 'analysis-queue-002'), params);
    expect(response.status).toBe(502);
  });
});
