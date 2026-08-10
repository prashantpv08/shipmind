import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentSessionToken: vi.fn(), requestPlatform: vi.fn() }));
vi.mock('../src/platform/session', () => ({ currentSessionToken: mocks.currentSessionToken }));
vi.mock('../src/platform/request', () => ({ requestPlatform: mocks.requestPlatform }));

import { getBusinessContextPage } from '../src/platform/business-context';
import { PlatformBusinessContextPreviewSchema } from '../src/platform/contracts';

const organization = { id: 'ORG-ONE', slug: 'one', name: 'One', status: 'ACTIVE', role: 'OWNER' } as const;
const project = { id: 'PROJ-ONE', workspaceId: 'WS-ONE', name: 'Invoice Review', status: 'ANALYZED', graphVersion: 2, rowVersion: 4, archivedAt: null, createdAt: '2026-08-03T00:00:00.000Z', updatedAt: '2026-08-03T00:00:00.000Z' } as const;
const preview = {
  schemaVersion: 'business-context-preview-v1', compilerVersion: 'business-context-compiler-v1', projectId: 'PROJ-ONE', sourceGraphVersion: 2,
  contentHash: 'a'.repeat(64), compiledAt: '2026-08-03T00:00:00.000Z',
  applicability: { status: 'APPLICABLE', rationale: 'The graph requires a portal.', sourceEntityIds: ['REQ-PORTAL'], decisionRequired: false },
  outcomes: [{ id: 'BC-OUT-AAAAAAAAAAAAAAAA', kind: 'OUTCOME', statement: 'Reduce review time by 30%.', truthStatus: 'SOURCE_GROUNDED', sourceEntityId: 'DEC-OUTCOME', sourceId: 'SRC-BRIEF' }],
  actors: [{ id: 'BC-ACT-BBBBBBBBBBBBBBBB', kind: 'ACTOR', statement: 'Reviewers approve invoices.', truthStatus: 'SOURCE_GROUNDED', sourceEntityId: 'REQ-PORTAL', sourceId: 'SRC-BRIEF' }],
  workflows: [{ id: 'BC-FLOW-CCCCCCCCCCCCCCCC', kind: 'WORKFLOW', statement: 'Reviewers shall approve invoices in the portal.', truthStatus: 'SOURCE_GROUNDED', sourceEntityId: 'REQ-PORTAL', sourceId: 'SRC-BRIEF' }],
  successMeasures: [{ id: 'BC-MEASURE-DDDDDDDDDDDDDDDD', kind: 'SUCCESS_MEASURE', statement: 'P95 latency is below 500 ms.', truthStatus: 'HUMAN_CONFIRMED', sourceEntityId: 'NFR-LATENCY', sourceId: null }],
  unknowns: [], blockingGapIds: [], coverage: { eligibleEntityCount: 3, classifiedEntityCount: 3, unclassifiedEntityIds: [] },
} as const;
const baseline = { projectId: 'PROJ-ONE', graphVersion: 2, version: null, review: null } as const;

describe('Business Context web platform contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentSessionToken.mockResolvedValue('A'.repeat(43));
    mocks.requestPlatform.mockResolvedValueOnce({ status: 200, body: organization }).mockResolvedValueOnce({ status: 200, body: project }).mockResolvedValueOnce({ status: 200, body: preview }).mockResolvedValueOnce({ status: 200, body: baseline });
  });

  it('loads and validates the exact tenant-scoped preview', async () => {
    const state = await getBusinessContextPage('ORG-ONE', 'PROJ-ONE');
    expect(state).toMatchObject({ status: 'ready', organization, project, preview, baseline });
    expect(mocks.requestPlatform).toHaveBeenNthCalledWith(3, expect.any(Function), 'A'.repeat(43));
    expect(mocks.requestPlatform).toHaveBeenNthCalledWith(4, expect.any(Function), 'A'.repeat(43));
    expect(PlatformBusinessContextPreviewSchema.safeParse(preview).success).toBe(true);
  });

  it('fails closed when the platform returns an ungrounded truth status', async () => {
    mocks.requestPlatform.mockReset().mockResolvedValueOnce({ status: 200, body: organization }).mockResolvedValueOnce({ status: 200, body: project }).mockResolvedValueOnce({ status: 200, body: { ...preview, outcomes: [{ ...preview.outcomes[0], truthStatus: 'AI_SUGGESTED' }] } }).mockResolvedValueOnce({ status: 200, body: baseline });
    await expect(getBusinessContextPage('ORG-ONE', 'PROJ-ONE')).resolves.toMatchObject({ status: 'unavailable' });
  });

  it('shows an honest not-ready state for an unanalyzed graph', async () => {
    mocks.requestPlatform.mockReset().mockResolvedValueOnce({ status: 200, body: organization }).mockResolvedValueOnce({ status: 200, body: { ...project, status: 'DRAFT', graphVersion: 0 } }).mockResolvedValueOnce({ status: 409, body: { error: { code: 'CONFLICT' } } }).mockResolvedValueOnce({ status: 200, body: { projectId: 'PROJ-ONE', graphVersion: 0, version: null, review: null } });
    await expect(getBusinessContextPage('ORG-ONE', 'PROJ-ONE')).resolves.toEqual({ status: 'not-ready' });
  });

  it('rejects malformed scope before reading credentials', async () => {
    await expect(getBusinessContextPage('bad', 'PROJ-ONE')).resolves.toEqual({ status: 'not-found' });
    expect(mocks.currentSessionToken).not.toHaveBeenCalled();
    expect(mocks.requestPlatform).not.toHaveBeenCalled();
  });
});
