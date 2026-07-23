import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentSessionToken: vi.fn(), requestPlatform: vi.fn() }));
vi.mock('../src/platform/session', () => ({ currentSessionToken: mocks.currentSessionToken }));
vi.mock('../src/platform/request', () => ({
  requestPlatform: mocks.requestPlatform,
  safeRequestId: (value: string | null) => value ?? 'generated-request-id',
}));

import { GET } from '../app/api/platform/organizations/[organizationId]/models/catalog/route';

const catalog = {
  providers: [{ id: 'MPROV-LOCAL-FIXTURE', code: 'LOCAL_FIXTURE', displayName: 'Axiom local fixture', lifecycleStatus: 'LOCAL_ONLY', executionStatus: 'ENABLED', dataPolicyStatus: 'NO_EXTERNAL_TRANSFER', allowedRegions: ['LOCAL'], updatedAt: '2026-07-24T00:00:00.000Z' }],
  models: [{ id: 'MODEL-AXIOM-STRUCTURED-FIXTURE-V1', providerId: 'MPROV-LOCAL-FIXTURE', immutableModelId: 'axiom-structured-fixture-v1', displayName: 'Axiom deterministic structured fixture', lifecycleStatus: 'LOCAL_ONLY', executionStatus: 'ENABLED', capabilities: { structuredOutput: true, tools: false, vision: false }, contextWindowTokens: null, maxOutputTokens: null, pricing: { status: 'NOT_APPLICABLE' }, dataPolicyStatus: 'NO_EXTERNAL_TRANSFER', allowedRegions: ['LOCAL'], evaluation: { status: 'LOCAL_FIXTURE_ONLY', scores: {}, evaluationRunId: null, evaluatedAt: null }, updatedAt: '2026-07-24T00:00:00.000Z' }],
  policy: { id: 'MPOL-LOCAL', organizationId: 'ORG-ONE', economyModelDefinitionId: 'MODEL-AXIOM-STRUCTURED-FIXTURE-V1', balancedModelDefinitionId: 'MODEL-AXIOM-STRUCTURED-FIXTURE-V1', bestModelDefinitionId: 'MODEL-AXIOM-STRUCTURED-FIXTURE-V1', rowVersion: 1, updatedAt: '2026-07-24T00:00:00.000Z' },
} as const;

describe('model catalog BFF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentSessionToken.mockResolvedValue('A'.repeat(43));
    mocks.requestPlatform.mockResolvedValue({ status: 200, body: catalog, requestId: 'models-001', etag: null, idempotencyReplayed: null });
  });

  it('validates and forwards the tenant-scoped catalog read with server credentials', async () => {
    const response = await GET(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/models/catalog'), { params: Promise.resolve({ organizationId: 'ORG-ONE' }) });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual(catalog);
    expect(mocks.requestPlatform).toHaveBeenCalledWith('/api/v1/organizations/ORG-ONE/models/catalog', 'A'.repeat(43), 'generated-request-id');
  });

  it('fails closed when a candidate is falsely reported as executable', async () => {
    mocks.requestPlatform.mockResolvedValue({ status: 200, body: { ...catalog, providers: [{ ...catalog.providers[0], lifecycleStatus: 'CANDIDATE', executionStatus: 'ENABLED' }] }, requestId: 'models-invalid', etag: null, idempotencyReplayed: null });
    const response = await GET(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/models/catalog'), { params: Promise.resolve({ organizationId: 'ORG-ONE' }) });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: { code: 'INVALID_PLATFORM_RESPONSE' } });
  });

  it('rejects malformed organization scope before forwarding', async () => {
    const response = await GET(new Request('http://127.0.0.1/api/platform/organizations/bad/models/catalog'), { params: Promise.resolve({ organizationId: 'bad' }) });
    expect(response.status).toBe(404);
    expect(mocks.requestPlatform).not.toHaveBeenCalled();
  });
});
