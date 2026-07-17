import { CodeGenerationDraft, type CodeGenerationRequest, type CodeFileOperation } from './schemas';

export interface CodeGenerator {
  generate(input: CodeGenerationRequest): Promise<CodeGenerationDraft>;
}

const contracts = `import { z } from 'zod';

export const NotificationChannel = z.enum(['email', 'sms']);
export const NotificationStatus = z.enum(['accepted', 'queued', 'sending', 'delivered', 'failed']);
export const CreateNotificationRequest = z.object({
  channel: NotificationChannel,
  recipient: z.string().trim().min(3).max(320),
  message: z.string().trim().min(1).max(5000),
}).strict();

export type CreateNotificationInput = z.infer<typeof CreateNotificationRequest>;
export type Notification = CreateNotificationInput & {
  id: string;
  tenantId: string;
  status: z.infer<typeof NotificationStatus>;
  correlationId: string;
  createdAt: string;
};
`;

const provider = `import type { Notification } from './contracts';

export interface DeliveryProvider {
  enqueue(notification: Notification): Promise<void>;
}

export class MockDeliveryProvider implements DeliveryProvider {
  readonly deliveries: Notification[] = [];

  async enqueue(notification: Notification) {
    this.deliveries.push(notification);
  }
}
`;

const service = `import { CreateNotificationRequest, type Notification } from './contracts';
import { MockDeliveryProvider, type DeliveryProvider } from './provider';

export type TrustedRequestContext = { tenantId?: string };
export type AuditEvent = { type: 'notification.accepted'; tenantId: string; notificationId: string; at: string };

function json(status: number, body: unknown, correlationId?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...(correlationId ? { 'x-correlation-id': correlationId } : {}) },
  });
}

function publicNotification(notification: Notification) {
  const { id, channel, status, correlationId } = notification;
  return { id, channel, status, correlationId };
}

export function retryDelaysMs(attempts = 3) {
  return Array.from({ length: attempts }, (_, index) => 1000 * (2 ** index));
}

export function createNotificationService(provider: DeliveryProvider = new MockDeliveryProvider()) {
  const notifications = new Map<string, Notification>();
  const idempotency = new Map<string, string>();
  const auditEvents: AuditEvent[] = [];
  let sequence = 0;

  async function handle(request: Request, context: TrustedRequestContext) {
    const tenantId = context.tenantId?.trim();
    if (!tenantId) return json(401, { code: 'UNTRUSTED_TENANT', message: 'Trusted tenant context is required' });

    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/notifications') {
      const key = request.headers.get('idempotency-key')?.trim();
      if (!key) return json(400, { code: 'IDEMPOTENCY_REQUIRED', message: 'Idempotency-Key header is required' });

      let body: unknown;
      try { body = await request.json(); } catch { return json(400, { code: 'INVALID_JSON', message: 'Request body must be valid JSON' }); }
      const parsed = CreateNotificationRequest.safeParse(body);
      if (!parsed.success) return json(400, { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid notification' });

      const dedupeKey = tenantId + ':' + key;
      const existingId = idempotency.get(dedupeKey);
      if (existingId) {
        const existing = notifications.get(tenantId + ':' + existingId);
        if (existing) return json(202, publicNotification(existing), existing.correlationId);
      }

      sequence += 1;
      const correlationId = request.headers.get('x-correlation-id')?.trim() || 'corr_' + String(sequence).padStart(6, '0');
      const notification: Notification = {
        ...parsed.data,
        id: 'ntf_' + String(sequence).padStart(6, '0'),
        tenantId,
        status: 'queued',
        correlationId,
        createdAt: new Date().toISOString(),
      };
      notifications.set(tenantId + ':' + notification.id, notification);
      idempotency.set(dedupeKey, notification.id);
      auditEvents.push({ type: 'notification.accepted', tenantId, notificationId: notification.id, at: notification.createdAt });
      await provider.enqueue(notification);
      return json(202, publicNotification(notification), correlationId);
    }

    const match = request.method === 'GET' ? url.pathname.match(/^\\/notifications\\/([^/]+)$/) : null;
    if (match) {
      const notification = notifications.get(tenantId + ':' + decodeURIComponent(match[1]));
      return notification ? json(200, publicNotification(notification), notification.correlationId) : json(404, { code: 'NOT_FOUND', message: 'Notification not found' });
    }

    return json(404, { code: 'ROUTE_NOT_FOUND', message: 'Route not found' });
  }

  return { handle, auditEvents, provider };
}
`;

const unitTests = `import { describe, expect, it } from 'vitest';
import { CreateNotificationRequest } from '../src/contracts';
import { retryDelaysMs } from '../src/notification-service';

describe('NotifyFlow notification domain', () => {
  it('FR-001 validates supported notification channels and required content', () => {
    expect(CreateNotificationRequest.safeParse({ channel: 'email', recipient: 'a@example.com', message: 'hello' }).success).toBe(true);
    expect(CreateNotificationRequest.safeParse({ channel: 'push', recipient: 'a', message: '' }).success).toBe(false);
  });

  it('FR-001 CQ-DELIVERY defines three bounded exponential retry delays', () => {
    expect(retryDelaysMs()).toEqual([1000, 2000, 4000]);
  });
});
`;

const apiTests = `import { describe, expect, it } from 'vitest';
import { createNotificationService } from '../src/notification-service';

const request = (path: string, init?: RequestInit) => new Request('http://notifyflow.local' + path, init);

describe('NotifyFlow notification API', () => {
  it('FR-001 accepts and retrieves a notification within trusted tenant context', async () => {
    const service = createNotificationService();
    const created = await service.handle(request('/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'key-1' },
      body: JSON.stringify({ channel: 'sms', recipient: '+15550001111', message: 'hello' }),
    }), { tenantId: 'tenant-a' });
    expect(created.status).toBe(202);
    const body = await created.json() as { id: string; tenantId?: string };
    expect(body.tenantId).toBeUndefined();
    const fetched = await service.handle(request('/notifications/' + body.id), { tenantId: 'tenant-a' });
    expect(fetched.status).toBe(200);
    expect(service.auditEvents).toHaveLength(1);
  });

  it('NFR-SEC-001 denies cross-tenant retrieval without revealing existence', async () => {
    const service = createNotificationService();
    const created = await service.handle(request('/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'key-2' },
      body: JSON.stringify({ channel: 'email', recipient: 'a@example.com', message: 'hello' }),
    }), { tenantId: 'tenant-a' });
    const body = await created.json() as { id: string };
    expect((await service.handle(request('/notifications/' + body.id), { tenantId: 'tenant-b' })).status).toBe(404);
  });

  it('FR-001 rejects invalid input and missing idempotency keys', async () => {
    const service = createNotificationService();
    const response = await service.handle(request('/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ channel: 'push', recipient: '', message: '' }),
    }), { tenantId: 'tenant-a' });
    expect(response.status).toBe(400);
  });

  it('FR-001 CQ-DELIVERY returns the original notification for an idempotent retry', async () => {
    const service = createNotificationService();
    const create = () => service.handle(request('/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'same-key' },
      body: JSON.stringify({ channel: 'email', recipient: 'a@example.com', message: 'hello' }),
    }), { tenantId: 'tenant-a' });
    const first = await (await create()).json() as { id: string };
    const second = await (await create()).json() as { id: string };
    expect(second.id).toBe(first.id);
    expect(service.auditEvents).toHaveLength(1);
  });
});
`;

function operations(): CodeFileOperation[] {
  return [
    { operation: 'write', path: 'src/contracts.ts', content: contracts, linkedEntityIds: ['FR-001', 'ART-OPENAPI-001', 'SEC-001'] },
    { operation: 'write', path: 'src/provider.ts', content: provider, linkedEntityIds: ['FR-001', 'ARCH-001', 'DEL-001'] },
    { operation: 'write', path: 'src/notification-service.ts', content: service, linkedEntityIds: ['FR-001', 'FR-002', 'NFR-SEC-001', 'ADR-001', 'ART-OPENAPI-001'] },
    { operation: 'write', path: 'tests/notification-service.unit.test.ts', content: unitTests, linkedEntityIds: ['FR-001', 'CQ-DELIVERY', 'TEST-001'] },
    { operation: 'write', path: 'tests/notification-service.api.test.ts', content: apiTests, linkedEntityIds: ['FR-001', 'FR-002', 'NFR-SEC-001', 'TEST-001'] },
  ];
}

export class FixtureCodeGenerator implements CodeGenerator {
  async generate(input: CodeGenerationRequest): Promise<CodeGenerationDraft> {
    const ruleIds = input.artifactPack.constitution.rules.map((rule) => rule.id);
    return CodeGenerationDraft.parse({
      generationId: `GEN-CODE-${String(input.analysis.graphVersion).padStart(3, '0')}`,
      projectId: input.analysis.projectId,
      sourceGraphVersion: input.analysis.graphVersion,
      selectedSliceId: input.selectedSliceId,
      generatedAt: new Date().toISOString(),
      provider: { mode: 'fixture', name: 'notifyflow-controlled-code-fixture' },
      provenance: {
        artifactIds: input.artifactPack.artifacts.map((artifact) => artifact.id),
        decisionId: input.decision.id,
        constitutionId: input.artifactPack.constitution.id,
        requirementIds: [...input.analysis.functionalRequirements, ...input.analysis.nonFunctionalRequirements].map((requirement) => requirement.id),
        ruleIds,
      },
      operations: operations(),
    });
  }
}
