import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentSessionToken: vi.fn(), requestPlatform: vi.fn() }));
vi.mock('../src/platform/session', () => ({ currentSessionToken: mocks.currentSessionToken }));
vi.mock('../src/platform/request', () => ({ requestPlatform: mocks.requestPlatform, safeRequestId: (value: string | null) => value ?? 'business-context-request-id' }));

import { POST as generateBusinessContext } from '../app/api/platform/organizations/[organizationId]/projects/[projectId]/business-context/generations/route';
import { POST as reviewBusinessContext } from '../app/api/platform/organizations/[organizationId]/projects/[projectId]/business-context/reviews/route';

const preview = {
  schemaVersion: 'business-context-preview-v1', compilerVersion: 'business-context-compiler-v1', projectId: 'PROJ-ONE', sourceGraphVersion: 2,
  contentHash: 'a'.repeat(64), compiledAt: '2026-08-04T00:00:00.000Z',
  applicability: { status: 'APPLICABLE', rationale: 'The graph requires a portal.', sourceEntityIds: ['REQ-PORTAL'], decisionRequired: false },
  outcomes: [{ id: 'BC-OUT-AAAAAAAAAAAAAAAA', kind: 'OUTCOME', statement: 'Reduce review time by 30%.', truthStatus: 'SOURCE_GROUNDED', sourceEntityId: 'DEC-OUTCOME', sourceId: 'SRC-BRIEF' }],
  actors: [{ id: 'BC-ACT-BBBBBBBBBBBBBBBB', kind: 'ACTOR', statement: 'Reviewers approve invoices.', truthStatus: 'SOURCE_GROUNDED', sourceEntityId: 'REQ-PORTAL', sourceId: 'SRC-BRIEF' }],
  workflows: [{ id: 'BC-FLOW-CCCCCCCCCCCCCCCC', kind: 'WORKFLOW', statement: 'Reviewers shall approve invoices in the portal.', truthStatus: 'SOURCE_GROUNDED', sourceEntityId: 'REQ-PORTAL', sourceId: 'SRC-BRIEF' }],
  successMeasures: [{ id: 'BC-MEASURE-DDDDDDDDDDDDDDDD', kind: 'SUCCESS_MEASURE', statement: 'P95 latency is below 500 ms.', truthStatus: 'HUMAN_CONFIRMED', sourceEntityId: 'NFR-LATENCY', sourceId: null }],
  unknowns: [], blockingGapIds: [], coverage: { eligibleEntityCount: 3, classifiedEntityCount: 3, unclassifiedEntityIds: [] },
} as const;
const project = { id: 'PROJ-ONE', workspaceId: 'WS-ONE', name: 'Invoice Review', status: 'ANALYZED', graphVersion: 2, rowVersion: 5, archivedAt: null, createdAt: '2026-08-04T00:00:00.000Z', updatedAt: '2026-08-04T00:00:00.000Z' } as const;
const version = { id: 'BCV-CONTEXT-ONE', projectId: 'PROJ-ONE', version: 1, sourceGraphVersion: 2, contentHash: preview.contentHash, compilerVersion: 'business-context-compiler-v1', payload: preview, generatedByUserId: 'USER-ONE', generatedAt: '2026-08-04T01:00:00.000Z' } as const;
const generated = { project, baseline: { projectId: 'PROJ-ONE', graphVersion: 2, version, review: null }, replayed: false } as const;

function mutationRequest(path: string, body: unknown, key: string) {
  return new Request(`http://127.0.0.1${path}`, {
    method: 'POST',
    headers: { host: '127.0.0.1', origin: 'http://127.0.0.1', 'content-type': 'application/json', 'idempotency-key': key, 'if-match': '"PROJ-ONE:4"' },
    body: JSON.stringify(body),
  });
}

describe('Business Context BFF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentSessionToken.mockResolvedValue('A'.repeat(43));
    mocks.requestPlatform.mockResolvedValue({ status: 201, requestId: 'business-context-001', etag: '"PROJ-ONE:5"', idempotencyReplayed: 'false', body: generated });
  });

  it('forwards exact preview generation with concurrency and idempotency', async () => {
    const body = { sourceGraphVersion: 2, previewContentHash: preview.contentHash };
    const path = '/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/business-context/generations';
    const response = await generateBusinessContext(mutationRequest(path, body, 'business-context-generate-001'), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(201);
    expect(response.headers.get('etag')).toBe('"PROJ-ONE:5"');
    expect(mocks.requestPlatform).toHaveBeenCalledWith(expect.any(Function), 'A'.repeat(43), 'business-context-request-id');
  });

  it('forwards a proposed edit without representing it as approval', async () => {
    const body = {
      sourceGraphVersion: 2, contextVersionId: version.id, contextContentHash: version.contentHash,
      decision: 'ACCEPT_WITH_EDITS', feedbackCategory: 'WORKFLOW', comment: 'Recovery behavior must be confirmed in canonical truth.',
      proposedGraphChanges: [{ target: 'WORKFLOW', targetItemId: preview.workflows[0].id, proposedValue: 'Reviewers can retry safely.', rationale: 'The current graph leaves recovery behavior unspecified.' }],
    } as const;
    const review = { id: 'BCREV-REVIEW-ONE', projectId: 'PROJ-ONE', sourceGraphVersion: 2, contextVersionId: version.id, contextContentHash: version.contentHash, decision: 'ACCEPT_WITH_EDITS', feedbackCategory: 'WORKFLOW', comment: body.comment, proposedGraphChanges: [{ ...body.proposedGraphChanges[0], status: 'PROPOSED_GRAPH_MUTATION' }], truthStatus: 'HUMAN_REVIEWED', reviewedByUserId: 'USER-REVIEWER', reviewedAt: '2026-08-04T02:00:00.000Z' } as const;
    mocks.requestPlatform.mockResolvedValue({ status: 201, requestId: 'business-context-002', etag: '"PROJ-ONE:6"', idempotencyReplayed: 'false', body: { ...generated, project: { ...project, rowVersion: 6 }, baseline: { ...generated.baseline, review } } });
    const path = '/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/business-context/reviews';
    const response = await reviewBusinessContext(mutationRequest(path, body, 'business-context-review-001'), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(201);
    expect(mocks.requestPlatform).toHaveBeenCalledWith(expect.any(Function), 'A'.repeat(43), 'business-context-request-id');
  });

  it('rejects cross-origin mutation before reading credentials', async () => {
    const request = new Request('http://127.0.0.1/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/business-context/generations', { method: 'POST', headers: { host: '127.0.0.1', origin: 'http://attacker.invalid' } });
    const response = await generateBusinessContext(request, { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(403);
    expect(mocks.currentSessionToken).not.toHaveBeenCalled();
  });

  it('rejects an edit proposal mislabeled as approval before forwarding credentials', async () => {
    const path = '/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/business-context/reviews';
    const body = {
      sourceGraphVersion: 2, contextVersionId: version.id, contextContentHash: version.contentHash,
      decision: 'ACCEPT_WITH_EDITS', feedbackCategory: 'APPROVAL', comment: 'This malformed decision must not be forwarded.',
      proposedGraphChanges: [{ target: 'WORKFLOW', targetItemId: preview.workflows[0].id, proposedValue: 'Reviewers retry.', rationale: 'Recovery must be explicit in canonical truth.' }],
    };
    const response = await reviewBusinessContext(mutationRequest(path, body, 'business-context-invalid-review'), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(400);
    expect(mocks.currentSessionToken).not.toHaveBeenCalled();
    expect(mocks.requestPlatform).not.toHaveBeenCalled();
  });

  it('fails closed on a malformed successful platform response', async () => {
    mocks.requestPlatform.mockResolvedValue({ status: 201, requestId: 'business-context-003', etag: null, idempotencyReplayed: null, body: { baseline: null } });
    const path = '/api/platform/organizations/ORG-ONE/projects/PROJ-ONE/business-context/generations';
    const response = await generateBusinessContext(mutationRequest(path, { sourceGraphVersion: 2, previewContentHash: preview.contentHash }, 'business-context-generate-002'), { params: Promise.resolve({ organizationId: 'ORG-ONE', projectId: 'PROJ-ONE' }) });
    expect(response.status).toBe(502);
  });
});
