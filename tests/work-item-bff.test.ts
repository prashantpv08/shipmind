import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentSessionToken: vi.fn(), requestPlatform: vi.fn() }));
vi.mock('../src/platform/session', () => ({ currentSessionToken: mocks.currentSessionToken }));
vi.mock('../src/platform/request', () => ({ requestPlatform: mocks.requestPlatform, safeRequestId: (value: string | null) => value ?? 'generated-request-id' }));

import { POST as generateWorkItems } from '../app/api/platform/organizations/[organizationId]/projects/[projectId]/work-item-generations/route';
import { POST as reviewWorkItems } from '../app/api/platform/organizations/[organizationId]/projects/[projectId]/work-item-generations/[generationId]/reviews/route';
import { POST as answerClarification } from '../app/api/platform/organizations/[organizationId]/projects/[projectId]/clarifications/[questionId]/answer/route';

const preview = {
  id: 'WIGEN-ONE', projectId: 'PROJ-ONE', sourceGraphVersion: 2, status: 'DRAFT', contentHash: 'a'.repeat(64),
  generationContentHash: 'a'.repeat(64),
  schemaVersion: 'work-item-v1', evaluatorVersion: 'ticket-quality-v1', promptVersion: 'fixture-grounded-agile-v1', workflowVersion: 'ticket-workflow-v1',
  provenance: null,
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
    const response = await generateWorkItems(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/work-item-generations', { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json', 'idempotency-key': 'work-item-key-001' }, body: JSON.stringify({ sourceGraphVersion: 2, tier: 'BALANCED' }) }), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(201);
    expect(response.headers.get('etag')).toBe(`"WIGEN-ONE:${'a'.repeat(64)}"`);
    expect(mocks.requestPlatform).toHaveBeenCalledWith('/api/v1/organizations/ORG-ONE/projects/PROJ-ONE/work-item-generations', 'A'.repeat(43), 'generated-request-id', { method: 'POST', body: { sourceGraphVersion: 2, tier: 'BALANCED' }, idempotencyKey: 'work-item-key-001' });
  });

  it('rejects cross-origin generation before reading the session', async () => {
    const response = await generateWorkItems(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/work-item-generations', { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://attacker.invalid' } }), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(403);
    expect(mocks.currentSessionToken).not.toHaveBeenCalled();
    expect(mocks.requestPlatform).not.toHaveBeenCalled();
  });

  it('preserves validated clarification guidance from the platform', async () => {
    const blockedBody = {
      error: {
        code: 'CLARIFICATION_REQUIRED',
        message: 'Critical unknowns or contradictions remain open: GAP-AUTH-POLICY.',
        requestId: 'clarification-001',
        retryable: false,
        details: {
          blockers: [{
            gapId: 'GAP-AUTH-POLICY', type: 'CONTRADICTION', category: 'SECURITY_PRIVACY',
            title: 'Conflicting invitation authentication policies',
            description: 'Approved sources require different invitation authentication policies.',
            severity: 'MEDIUM', truthStatus: 'UNKNOWN',
            clarification: {
              id: 'QUESTION-AUTH-POLICY',
              question: 'Which approved authentication policy must govern invitation acceptance?',
              whyItMatters: 'Selecting one without a decision could weaken access controls.',
              affectedEntityIds: ['REQ-ACCESS'],
            },
          }],
        },
      },
    };
    mocks.requestPlatform.mockResolvedValue({ status: 422, requestId: 'clarification-001', body: blockedBody });

    const response = await generateWorkItems(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/work-item-generations', {
      method: 'POST',
      headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json', 'idempotency-key': 'work-item-key-blocked-001' },
      body: JSON.stringify({ sourceGraphVersion: 2, tier: 'ECONOMY' }),
    }), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual(blockedBody);
  });

  it('forwards a clarification answer with project concurrency and idempotency controls', async () => {
    const answered = {
      project: {
        id: 'PROJ-ONE', workspaceId: 'WS-ONE', name: 'Product One', status: 'ANALYZED', graphVersion: 3, rowVersion: 5,
        archivedAt: null, createdAt: '2026-07-23T00:00:00.000Z', updatedAt: '2026-07-24T00:00:00.000Z',
      },
      clarification: {
        id: 'QUESTION-AUTH-POLICY', gapId: 'GAP-AUTH-POLICY', status: 'ANSWERED', truthStatus: 'HUMAN_CONFIRMED', answeredAt: '2026-07-24T00:00:00.000Z',
      },
      previousGraphVersion: 2,
      graphVersion: 3,
      replayed: false,
    };
    mocks.requestPlatform.mockResolvedValue({ status: 200, requestId: 'answer-001', etag: '"PROJ-ONE:5"', idempotencyReplayed: 'false', body: answered });
    const body = { answer: 'Invited users must authenticate with a verified organization identity before acceptance.' };
    const response = await answerClarification(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/clarifications/QUESTION-AUTH-POLICY/answer', {
      method: 'POST',
      headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json', 'idempotency-key': 'clarification-key-001', 'if-match': '"PROJ-ONE:4"' },
      body: JSON.stringify(body),
    }), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE', questionId: 'QUESTION-AUTH-POLICY' }) });

    expect(response.status).toBe(200);
    expect(response.headers.get('etag')).toBe('"PROJ-ONE:5"');
    expect(response.headers.get('idempotency-replayed')).toBe('false');
    expect(mocks.requestPlatform).toHaveBeenCalledWith(
      '/api/v1/organizations/ORG-ONE/projects/PROJ-ONE/clarifications/QUESTION-AUTH-POLICY/answer',
      'A'.repeat(43),
      'generated-request-id',
      { method: 'POST', body, ifMatch: '"PROJ-ONE:4"', idempotencyKey: 'clarification-key-001' },
    );
    await expect(response.json()).resolves.toEqual(answered);
  });

  it('rejects a cross-origin clarification answer before reading the session', async () => {
    const response = await answerClarification(new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/clarifications/QUESTION-AUTH-POLICY/answer', {
      method: 'POST', headers: { host: '127.0.0.1', origin: 'http://attacker.invalid' },
    }), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE', questionId: 'QUESTION-AUTH-POLICY' }) });
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
