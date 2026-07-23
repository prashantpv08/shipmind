import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentSessionToken: vi.fn(), requestPlatform: vi.fn() }));
vi.mock('../src/platform/session', () => ({ currentSessionToken: mocks.currentSessionToken }));
vi.mock('../src/platform/request', () => ({
  requestPlatform: mocks.requestPlatform,
  safeRequestId: (value: string | null) => value ?? 'generated-request-id',
}));

import { GET } from '../app/api/platform/organizations/[organizationId]/billing/overview/route';
import { PlatformBillingOverviewSchema } from '../src/platform/contracts';

const overview = {
  plan: { id: 'PLAN-LOCAL-DEVELOPMENT', code: 'LOCAL_DEVELOPMENT', name: 'Local development', currency: 'USD' },
  subscription: { id: 'SUB-LOCAL-202607', status: 'TRIALING', billingPeriodStart: '2026-07-01T00:00:00.000Z', billingPeriodEnd: '2026-08-01T00:00:00.000Z' },
  entitlements: { aiUsageEnabled: true, maxCreditsPerRequest: 10_000 },
  balance: { id: 'BAL-LOCAL-202607', allocatedCreditUnits: 100_000, reservedCreditUnits: 0, consumedCreditUnits: 0, remainingCreditUnits: 100_000, committedPercent: 0, alertThresholdPercent: 80, status: 'AVAILABLE', rowVersion: 1 },
  recentUsage: [],
} as const;

describe('billing BFF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentSessionToken.mockResolvedValue('A'.repeat(43));
    mocks.requestPlatform.mockResolvedValue({ status: 200, body: overview, requestId: 'billing-001', etag: null, idempotencyReplayed: null });
  });

  it('validates and forwards the tenant-scoped overview read with server credentials', async () => {
    const response = await GET(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/billing/overview'), { params: Promise.resolve({ organizationId: 'ORG-ONE' }) });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual(overview);
    expect(mocks.requestPlatform).toHaveBeenCalledWith('/api/v1/organizations/ORG-ONE/billing/overview', 'A'.repeat(43), 'generated-request-id');
  });

  it('fails closed when the platform returns an invalid cost record', async () => {
    mocks.requestPlatform.mockResolvedValue({ status: 200, body: { ...overview, balance: { ...overview.balance, remainingCreditUnits: -1 } }, requestId: 'billing-invalid', etag: null, idempotencyReplayed: null });
    const response = await GET(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/billing/overview'), { params: Promise.resolve({ organizationId: 'ORG-ONE' }) });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ error: { code: 'INVALID_PLATFORM_RESPONSE' } });
  });

  it('rejects malformed organization scope before forwarding', async () => {
    const response = await GET(new Request('http://127.0.0.1/api/platform/organizations/bad/billing/overview'), { params: Promise.resolve({ organizationId: 'bad' }) });
    expect(response.status).toBe(404);
    expect(mocks.requestPlatform).not.toHaveBeenCalled();
  });

  it('accepts immutable raw usage and product-credit fields together', () => {
    expect(PlatformBillingOverviewSchema.safeParse({
      ...overview,
      recentUsage: [{
        id: 'ULED-ONE', reservationId: 'URES-ONE', eventType: 'RECONCILIATION', reservedCreditUnits: 0,
        chargedCreditUnits: 12, releasedCreditUnits: 8, inputTokens: 100, outputTokens: 20,
        toolChargeMicros: 5, providerCostMicros: 40, currency: 'USD', outcome: 'SUCCEEDED', retryCount: 1,
        fallbackUsed: false, cacheHit: true, projectId: null, userId: 'USER-ONE', workflow: 'ticket-generation',
        workflowVersion: 'v1', provider: 'provider', model: 'model', generationId: null, runId: 'run-1',
        occurredAt: '2026-07-24T00:00:00.000Z',
      }],
    }).success).toBe(true);
  });
});
