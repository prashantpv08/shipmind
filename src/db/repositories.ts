import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { AxiomDatabase } from './client';
import { idempotencyRecords, outboxEvents } from './schema';
import type { OrganizationScope } from '../projects/repository';

export type OutboxEventInput = {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  availableAt?: string;
};

export type ClaimedOutboxEvent = typeof outboxEvents.$inferSelect;

type OutboxExecutor = Pick<AxiomDatabase, 'insert' | 'select'>;

export async function enqueueOutboxEvent(executor: OutboxExecutor, scope: OrganizationScope, input: OutboxEventInput) {
  const inserted = await executor.insert(outboxEvents).values({
    id: `OUTBOX-${randomUUID()}`,
    organizationId: scope.organizationId,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    eventType: input.eventType,
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
    ...(input.availableAt ? { availableAt: input.availableAt } : {}),
  }).onConflictDoNothing({
    target: [outboxEvents.organizationId, outboxEvents.idempotencyKey],
  }).returning();
  if (inserted[0]) return inserted[0];
  const [existing] = await executor.select().from(outboxEvents).where(and(
    eq(outboxEvents.organizationId, scope.organizationId),
    eq(outboxEvents.idempotencyKey, input.idempotencyKey),
  )).limit(1);
  if (!existing) throw new Error('Outbox idempotency conflict could not be resolved');
  return existing;
}

export class PostgresOutboxRepository {
  constructor(private readonly db: AxiomDatabase) {}

  async enqueue(scope: OrganizationScope, input: OutboxEventInput) {
    return enqueueOutboxEvent(this.db, scope, input);
  }

  async claimNext(now = new Date().toISOString()): Promise<ClaimedOutboxEvent | null> {
    return this.db.transaction(async (tx) => {
      const result = await tx.execute(sql`
        update outbox_events
        set status = 'PROCESSING', locked_at = ${now}, attempts = attempts + 1, updated_at = ${now}
        where id = (
          select id from outbox_events
          where status in ('PENDING', 'FAILED') and available_at <= ${now}
          order by available_at, created_at
          for update skip locked
          limit 1
        )
        returning id
      `);
      const eventId = (result.rows[0] as { id?: string } | undefined)?.id;
      if (!eventId) return null;
      return (await tx.select().from(outboxEvents).where(eq(outboxEvents.id, eventId)).limit(1))[0] ?? null;
    });
  }

  async markPublished(scope: OrganizationScope, eventId: string, publishedAt = new Date().toISOString()) {
    const rows = await this.db.update(outboxEvents).set({
      status: 'PUBLISHED',
      publishedAt,
      lockedAt: null,
      lastError: null,
      updatedAt: publishedAt,
    }).where(and(eq(outboxEvents.organizationId, scope.organizationId), eq(outboxEvents.id, eventId))).returning();
    if (!rows[0]) throw new Error('Outbox event not found');
    return rows[0];
  }

  async markFailed(scope: OrganizationScope, eventId: string, error: string, availableAt: string) {
    const now = new Date().toISOString();
    const rows = await this.db.update(outboxEvents).set({
      status: 'FAILED',
      lastError: error.slice(0, 2_000),
      lockedAt: null,
      availableAt,
      updatedAt: now,
    }).where(and(eq(outboxEvents.organizationId, scope.organizationId), eq(outboxEvents.id, eventId))).returning();
    if (!rows[0]) throw new Error('Outbox event not found');
    return rows[0];
  }
}

export type BeginIdempotencyInput = {
  scope: string;
  key: string;
  requestHash: string;
  expiresAt: string;
};

export class IdempotencyConflictError extends Error {
  constructor() {
    super('Idempotency key was already used with a different request');
    this.name = 'IdempotencyConflictError';
  }
}

export class PostgresIdempotencyRepository {
  constructor(private readonly db: AxiomDatabase) {}

  async begin(scope: OrganizationScope, input: BeginIdempotencyInput) {
    const inserted = await this.db.insert(idempotencyRecords).values({
      id: `IDEMP-${randomUUID()}`,
      organizationId: scope.organizationId,
      scope: input.scope,
      key: input.key,
      requestHash: input.requestHash,
      expiresAt: input.expiresAt,
    }).onConflictDoNothing({
      target: [idempotencyRecords.organizationId, idempotencyRecords.scope, idempotencyRecords.key],
    }).returning();
    const record = inserted[0] ?? (await this.db.select().from(idempotencyRecords).where(and(
      eq(idempotencyRecords.organizationId, scope.organizationId),
      eq(idempotencyRecords.scope, input.scope),
      eq(idempotencyRecords.key, input.key),
    )).limit(1))[0];
    if (!record) throw new Error('Idempotency record could not be resolved');
    if (record.requestHash !== input.requestHash) throw new IdempotencyConflictError();
    return { record, created: Boolean(inserted[0]) };
  }

  async complete(scope: OrganizationScope, recordId: string, responseStatus: number, responsePayload: Record<string, unknown>) {
    const now = new Date().toISOString();
    const rows = await this.db.update(idempotencyRecords).set({
      status: 'COMPLETED', responseStatus, responsePayload, updatedAt: now,
    }).where(and(eq(idempotencyRecords.organizationId, scope.organizationId), eq(idempotencyRecords.id, recordId))).returning();
    if (!rows[0]) throw new Error('Idempotency record not found');
    return rows[0];
  }

  async fail(scope: OrganizationScope, recordId: string, responseStatus: number, responsePayload: Record<string, unknown>) {
    const now = new Date().toISOString();
    const rows = await this.db.update(idempotencyRecords).set({
      status: 'FAILED', responseStatus, responsePayload, updatedAt: now,
    }).where(and(eq(idempotencyRecords.organizationId, scope.organizationId), eq(idempotencyRecords.id, recordId))).returning();
    if (!rows[0]) throw new Error('Idempotency record not found');
    return rows[0];
  }
}
