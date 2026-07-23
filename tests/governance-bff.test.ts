import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentSessionToken: vi.fn(), requestPlatform: vi.fn() }));
vi.mock('../src/platform/session', () => ({ currentSessionToken: mocks.currentSessionToken }));
vi.mock('../src/platform/request', () => ({
  requestPlatform: mocks.requestPlatform,
  safeRequestId: (value: string | null) => value ?? 'generated-request-id',
}));

import { POST as createInvitation } from '../app/api/platform/organizations/[organizationId]/invitations/route';
import { POST as revokeInvitation } from '../app/api/platform/organizations/[organizationId]/invitations/[invitationId]/revoke/route';

describe('organization governance BFF', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.currentSessionToken.mockResolvedValue('A'.repeat(43)); });

  it('validates and forwards invitation creation with idempotency and server credentials', async () => {
    mocks.requestPlatform.mockResolvedValue({ status: 201, requestId: 'invite-001', etag: null, idempotencyReplayed: null, body: {
      invitation: { id: 'INV-ONE', email: 'new@example.test', role: 'VIEWER', status: 'PENDING', expiresAt: '2026-07-30T00:00:00.000Z', rowVersion: 1, createdAt: '2026-07-23T00:00:00.000Z', updatedAt: '2026-07-23T00:00:00.000Z' },
      delivery: { mode: 'MANUAL_LOCAL', acceptanceToken: `INV-ONE.${'A'.repeat(43)}` }, replayed: false,
    } });
    const response = await createInvitation(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/invitations', { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json', 'idempotency-key': 'invite-key-001' }, body: JSON.stringify({ email: 'NEW@example.test', role: 'VIEWER' }) }), { params: Promise.resolve({ organizationId: 'ORG-ONE' }) });
    expect(response.status).toBe(201);
    expect(mocks.requestPlatform).toHaveBeenCalledWith('/api/v1/organizations/ORG-ONE/invitations', 'A'.repeat(43), 'generated-request-id', { method: 'POST', body: { email: 'new@example.test', role: 'VIEWER' }, idempotencyKey: 'invite-key-001' });
  });

  it('rejects cross-origin creation before reading the session', async () => {
    const response = await createInvitation(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/invitations', { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://attacker.invalid' } }), { params: Promise.resolve({ organizationId: 'ORG-ONE' }) });
    expect(response.status).toBe(403);
    expect(mocks.currentSessionToken).not.toHaveBeenCalled();
  });

  it('requires and forwards the exact invitation ETag for revocation', async () => {
    mocks.requestPlatform.mockResolvedValue({ status: 200, requestId: 'revoke-001', etag: '"INV-ONE:2"', idempotencyReplayed: null, body: { id: 'INV-ONE', email: 'new@example.test', role: 'VIEWER', status: 'REVOKED', expiresAt: '2026-07-30T00:00:00.000Z', rowVersion: 2, createdAt: '2026-07-23T00:00:00.000Z', updatedAt: '2026-07-23T00:01:00.000Z' } });
    const response = await revokeInvitation(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/invitations/INV-ONE/revoke', { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'if-match': '"INV-ONE:1"' } }), { params: Promise.resolve({ organizationId: 'ORG-ONE', invitationId: 'INV-ONE' }) });
    expect(response.status).toBe(200);
    expect(response.headers.get('etag')).toBe('"INV-ONE:2"');
    expect(mocks.requestPlatform).toHaveBeenCalledWith('/api/v1/organizations/ORG-ONE/invitations/INV-ONE/revoke', 'A'.repeat(43), 'generated-request-id', { method: 'POST', ifMatch: '"INV-ONE:1"' });
  });
});
