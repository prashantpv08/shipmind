import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentSessionToken: vi.fn(), requestPlatform: vi.fn() }));
vi.mock('../src/platform/session', () => ({ currentSessionToken: mocks.currentSessionToken }));
vi.mock('../src/platform/request', () => ({ requestPlatform: mocks.requestPlatform, safeRequestId: (value: string | null) => value ?? 'generated-request-id' }));

import { POST as generateWorkItems } from '../app/api/platform/organizations/[organizationId]/projects/[projectId]/work-item-generations/route';
import { POST as reviewWorkItems } from '../app/api/platform/organizations/[organizationId]/projects/[projectId]/work-item-generations/[generationId]/reviews/route';

const preview = {
  id: 'WIGEN-ONE', projectId: 'PROJ-ONE', sourceGraphVersion: 2, status: 'DRAFT', contentHash: 'a'.repeat(64),
  generationContentHash: 'a'.repeat(64),
  schemaVersion: 'work-item-v1', evaluatorVersion: 'ticket-quality-v1', promptVersion: 'fixture-grounded-agile-v1', workflowVersion: 'ticket-workflow-v1',
  qualityReport: { evaluatorVersion: 'ticket-quality-v1', passed: true, clarificationRequired: false, findings: [], metrics: { schemaValid: true, workItemCount: 1, implementableWorkItemCount: 0, requiredFieldCompleteness: 1, validSourceReferenceRate: 1, approvedRequirementCoverage: 1, duplicatePairCount: 0, blockingQuestionCount: 0 } },
  workItems: [{ id: 'WI-EPIC-ONE', version: 1, type: 'EPIC', parentId: null, title: 'Approved product delivery', priority: 'P0', estimate: 'L', outcome: 'Deliver the approved product outcome without unsupported scope.', context: 'The approved canonical graph provides the source context for this draft.', scope: ['Deliver the approved behavior represented by child stories.'], outOfScope: ['External publication before explicit approval.'], acceptanceCriteria: [], dependencyIds: [], risks: [], openQuestions: [], evidenceExpectations: [], sourceEntityIds: ['REQ-ONE'], truthStatus: 'AI_SUGGESTED', reviewStatus: 'DRAFT' }],
  generatedAt: '2026-07-23T00:00:00.000Z', review: null, replayed: false,
};

describe('work-item generation BFF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentSessionToken.mockResolvedValue('A'.repeat(43));
    mocks.requestPlatform.mockResolvedValue({ status: 201, requestId: 'work-items-001', etag: `"WIGEN-ONE:${'a'.repeat(64)}"`, idempotencyReplayed: 'false', body: preview });
  });

  it('validates and forwards the current graph version with idempotency', async () => {
    const response = await generateWorkItems(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/work-item-generations', { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json', 'idempotency-key': 'work-item-key-001' }, body: JSON.stringify({ sourceGraphVersion: 2, mode: 'FIXTURE' }) }), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(201);
    expect(response.headers.get('etag')).toBe(`"WIGEN-ONE:${'a'.repeat(64)}"`);
    expect(mocks.requestPlatform).toHaveBeenCalledWith('/api/v1/organizations/ORG-ONE/projects/PROJ-ONE/work-item-generations', 'A'.repeat(43), 'generated-request-id', { method: 'POST', body: { sourceGraphVersion: 2, mode: 'FIXTURE' }, idempotencyKey: 'work-item-key-001' });
  });

  it('rejects cross-origin generation before reading the session', async () => {
    const response = await generateWorkItems(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/work-item-generations', { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://attacker.invalid' } }), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(403);
    expect(mocks.currentSessionToken).not.toHaveBeenCalled();
    expect(mocks.requestPlatform).not.toHaveBeenCalled();
  });

  it('forwards an exact categorized human review with ETag and idempotency', async () => {
    const reviewed = { ...preview, status: 'APPROVED', review: { id: 'WIREVIEW-ONE', generationId: 'WIGEN-ONE', decision: 'ACCEPT', reasonCategory: 'MEETS_REQUIREMENTS', comment: 'The exact grounded backlog is ready for connector preparation.', generationContentHash: 'a'.repeat(64), reviewedContentHash: 'a'.repeat(64), reviewedByUserId: 'USER-ONE', reviewedAt: '2026-07-23T01:00:00.000Z' } };
    mocks.requestPlatform.mockResolvedValue({ status: 201, requestId: 'review-001', etag: `"WIGEN-ONE:${'a'.repeat(64)}"`, idempotencyReplayed: 'false', body: reviewed });
    const body = { decision: 'ACCEPT', reasonCategory: 'MEETS_REQUIREMENTS', comment: 'The exact grounded backlog is ready for connector preparation.' };
    const response = await reviewWorkItems(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/work-item-generations/WIGEN-ONE/reviews', { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json', 'idempotency-key': 'review-key-001', 'if-match': `"WIGEN-ONE:${'a'.repeat(64)}"` }, body: JSON.stringify(body) }), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE', generationId: 'WIGEN-ONE' }) });
    expect(response.status).toBe(201);
    expect(mocks.requestPlatform).toHaveBeenCalledWith('/api/v1/organizations/ORG-ONE/projects/PROJ-ONE/work-item-generations/WIGEN-ONE/reviews', 'A'.repeat(43), 'generated-request-id', { method: 'POST', body, idempotencyKey: 'review-key-001', ifMatch: `"WIGEN-ONE:${'a'.repeat(64)}"` });
  });

  it('rejects a cross-origin review before reading the session', async () => {
    const response = await reviewWorkItems(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/work-item-generations/WIGEN-ONE/reviews', { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://attacker.invalid' } }), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE', generationId: 'WIGEN-ONE' }) });
    expect(response.status).toBe(403);
    expect(mocks.currentSessionToken).not.toHaveBeenCalled();
  });
});
