import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentSessionToken: vi.fn(), requestPlatform: vi.fn() }));
vi.mock('../src/platform/session', () => ({ currentSessionToken: mocks.currentSessionToken }));
vi.mock('../src/platform/request', () => ({
  requestPlatform: mocks.requestPlatform,
  safeRequestId: (value: string | null) => value ?? 'generated-request-id',
}));

import { GET } from '../app/api/platform/organizations/[organizationId]/billing/overview/route';
import { POST as updatePolicy } from '../app/api/platform/organizations/[organizationId]/billing/policy/[policyId]/route';
import { POST as recoverExpired } from '../app/api/platform/organizations/[organizationId]/billing/reservations/recover-expired/route';
import { PlatformBillingOverviewSchema } from '../src/platform/contracts';

const overview = {
  plan: { id: 'PLAN-LOCAL-DEVELOPMENT', code: 'LOCAL_DEVELOPMENT', name: 'Local development', currency: 'USD' },
  subscription: { id: 'SUB-LOCAL-202607', status: 'TRIALING', billingPeriodStart: '2026-07-01T00:00:00.000Z', billingPeriodEnd: '2026-08-01T00:00:00.000Z' },
  entitlements: { aiUsageEnabled: true, maxCreditsPerRequest: 10_000, maxDailyCredits: 50_000, maxUserDailyCredits: 25_000, maxProjectDailyCredits: 40_000 },
  policy: { id: 'BPOL-LOCAL', dailyCreditLimit: 50_000, userDailyCreditLimit: 25_000, projectDailyCreditLimit: 40_000, alertThresholdPercent: 80, rowVersion: 1, updatedAt: '2026-07-24T00:00:00.000Z' },
  balance: { id: 'BAL-LOCAL-202607', allocatedCreditUnits: 100_000, reservedCreditUnits: 0, consumedCreditUnits: 0, remainingCreditUnits: 100_000, committedPercent: 0, alertThresholdPercent: 80, status: 'AVAILABLE', rowVersion: 1 },
  dailyUsage: { committedCreditUnits: 0, remainingCreditUnits: 50_000 },
  expiredReservations: { count: 0, reservedCreditUnits: 0 },
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

  it('validates an exact same-origin policy mutation and forwards concurrency and retry headers', async () => {
    const updated = { ...overview.policy, dailyCreditLimit: 45_000, rowVersion: 2, replayed: false };
    mocks.requestPlatform.mockResolvedValue({ status: 200, body: updated, requestId: 'billing-policy-001', etag: '"BPOL-LOCAL:2"', idempotencyReplayed: 'false' });
    const response = await updatePolicy(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/billing/policy/BPOL-LOCAL', {
      method: 'POST',
      headers: {
        host: '127.0.0.1',
        origin: 'http://127.0.0.1',
        'content-type': 'application/json',
        'if-match': '"BPOL-LOCAL:1"',
        'idempotency-key': 'budget-policy-test-001',
      },
      body: JSON.stringify({ dailyCreditLimit: 45_000, userDailyCreditLimit: 25_000, projectDailyCreditLimit: 40_000, alertThresholdPercent: 80 }),
    }), { params: Promise.resolve({ organizationId: 'ORG-ONE', policyId: 'BPOL-LOCAL' }) });

    expect(response.status).toBe(200);
    expect(response.headers.get('etag')).toBe('"BPOL-LOCAL:2"');
    expect(response.headers.get('idempotency-replayed')).toBe('false');
    expect(mocks.requestPlatform).toHaveBeenCalledWith(
      '/api/v1/organizations/ORG-ONE/billing/policy/BPOL-LOCAL',
      'A'.repeat(43),
      'generated-request-id',
      {
        method: 'POST',
        body: { dailyCreditLimit: 45_000, userDailyCreditLimit: 25_000, projectDailyCreditLimit: 40_000, alertThresholdPercent: 80 },
        ifMatch: '"BPOL-LOCAL:1"',
        idempotencyKey: 'budget-policy-test-001',
      },
    );
  });

  it('rejects cross-origin policy mutation before reading credentials', async () => {
    const response = await updatePolicy(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/billing/policy/BPOL-LOCAL', {
      method: 'POST',
      headers: { host: '127.0.0.1', origin: 'https://attacker.example' },
    }), { params: Promise.resolve({ organizationId: 'ORG-ONE', policyId: 'BPOL-LOCAL' }) });
    expect(response.status).toBe(403);
    expect(mocks.currentSessionToken).not.toHaveBeenCalled();
    expect(mocks.requestPlatform).not.toHaveBeenCalled();
  });

  it('forwards idempotent expired-reservation recovery and validates its result', async () => {
    mocks.requestPlatform.mockResolvedValue({ status: 200, body: { releasedReservations: 2, releasedCreditUnits: 700 }, requestId: 'billing-recovery-001', etag: null, idempotencyReplayed: null });
    const response = await recoverExpired(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/billing/reservations/recover-expired', {
      method: 'POST', headers: { host: '127.0.0.1', origin: 'http://127.0.0.1' },
    }), { params: Promise.resolve({ organizationId: 'ORG-ONE' }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ releasedReservations: 2, releasedCreditUnits: 700 });
    expect(mocks.requestPlatform).toHaveBeenCalledWith(
      '/api/v1/organizations/ORG-ONE/billing/reservations/recover-expired',
      'A'.repeat(43),
      'generated-request-id',
      { method: 'POST' },
    );
  });
});
