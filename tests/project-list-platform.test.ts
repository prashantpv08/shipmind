import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentSessionToken: vi.fn(), requestPlatform: vi.fn() }));
vi.mock('../src/platform/session', () => ({ currentSessionToken: mocks.currentSessionToken }));
vi.mock('../src/platform/request', () => ({ requestPlatform: mocks.requestPlatform }));

import { getOrganizationProjects } from '../src/platform/projects';

const organization = { id: 'ORG-ONE', slug: 'one', name: 'One', status: 'ACTIVE', role: 'OWNER' } as const;
const workspacePage = { workspaces: [{ id: 'WS-ONE', name: 'Delivery', rowVersion: 1, createdAt: '2026-08-12T00:00:00.000Z', updatedAt: '2026-08-12T00:00:00.000Z' }], nextCursor: null } as const;

function project(id: string) {
  return { id, workspaceId: 'WS-ONE', name: id, status: 'ANALYZED', graphVersion: 2, rowVersion: 4, archivedAt: null, createdAt: '2026-08-12T00:00:00.000Z', updatedAt: '2026-08-12T00:00:00.000Z' } as const;
}

function preview(id: string, status: 'APPLICABLE' | 'NEEDS_DECISION') {
  return {
    schemaVersion: 'business-context-preview-v1', compilerVersion: 'business-context-compiler-v1', projectId: id, sourceGraphVersion: 2,
    contentHash: status === 'APPLICABLE' ? 'a'.repeat(64) : 'b'.repeat(64), compiledAt: '2026-08-12T00:00:00.000Z',
    applicability: status === 'APPLICABLE'
      ? { status, rationale: 'The graph requires a portal.', sourceEntityIds: ['REQ-PORTAL'], decisionRequired: false }
      : { status, rationale: 'The graph is silent.', sourceEntityIds: [], decisionRequired: true },
    outcomes: [], actors: [], workflows: [], successMeasures: [],
    unknowns: status === 'NEEDS_DECISION' ? [{ code: 'UNKNOWN_EXPERIENCE_APPLICABILITY', question: 'Does this scope require a user-facing experience?', whyItMatters: 'The decision controls the Experience Baseline gate.' }] : [],
    blockingGapIds: [], coverage: { eligibleEntityCount: 0, classifiedEntityCount: 0, unclassifiedEntityIds: [] },
  } as const;
}

function approvedBaseline(id: string) {
  const payload = preview(id, 'APPLICABLE');
  const version = { id: `BCV-${id}`, projectId: id, version: 1, sourceGraphVersion: 2, contentHash: payload.contentHash, compilerVersion: 'business-context-compiler-v1', payload, generatedByUserId: 'USER-ONE', generatedAt: '2026-08-12T00:01:00.000Z' } as const;
  return {
    projectId: id,
    graphVersion: 2,
    version,
    review: { id: `BCREV-${id}`, projectId: id, sourceGraphVersion: 2, contextVersionId: version.id, contextContentHash: version.contentHash, decision: 'ACCEPT', feedbackCategory: 'APPROVAL', comment: 'The exact current Business Context is approved.', proposedGraphChanges: [], truthStatus: 'HUMAN_APPROVED', reviewedByUserId: 'USER-ONE', reviewedAt: '2026-08-12T00:02:00.000Z' },
  } as const;
}

describe('organization project Business Context migration queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentSessionToken.mockResolvedValue('A'.repeat(43));
  });

  it('distinguishes approved, applicability-decision, and generation work without bulk mutation', async () => {
    const approved = project('PROJ-APPROVED');
    const undecided = project('PROJ-UNDECIDED');
    const ungenerated = project('PROJ-UNGENERATED');
    mocks.requestPlatform
      .mockResolvedValueOnce({ status: 200, body: organization })
      .mockResolvedValueOnce({ status: 200, body: { projects: [approved, undecided, ungenerated], nextCursor: null } })
      .mockResolvedValueOnce({ status: 200, body: workspacePage })
      .mockResolvedValueOnce({ status: 200, body: preview(approved.id, 'APPLICABLE') })
      .mockResolvedValueOnce({ status: 200, body: approvedBaseline(approved.id) })
      .mockResolvedValueOnce({ status: 200, body: preview(undecided.id, 'NEEDS_DECISION') })
      .mockResolvedValueOnce({ status: 200, body: { projectId: undecided.id, graphVersion: 2, version: null, review: null } })
      .mockResolvedValueOnce({ status: 200, body: preview(ungenerated.id, 'APPLICABLE') })
      .mockResolvedValueOnce({ status: 200, body: { projectId: ungenerated.id, graphVersion: 2, version: null, review: null } });

    const state = await getOrganizationProjects('ORG-ONE');

    expect(state).toMatchObject({
      status: 'ready',
      migrationSummary: { complete: 1, pending: 2, unavailable: 0, archived: 0 },
      projects: [
        { id: approved.id, businessContextMigration: { status: 'COMPLETE', applicability: 'APPLICABLE' } },
        { id: undecided.id, businessContextMigration: { status: 'DECISION_REQUIRED', applicability: 'NEEDS_DECISION' } },
        { id: ungenerated.id, businessContextMigration: { status: 'GENERATION_REQUIRED', applicability: 'APPLICABLE' } },
      ],
    });
  });

  it('keeps a single project failure visible without hiding the rest of the queue', async () => {
    const unavailable = project('PROJ-UNAVAILABLE');
    mocks.requestPlatform
      .mockResolvedValueOnce({ status: 200, body: organization })
      .mockResolvedValueOnce({ status: 200, body: { projects: [unavailable], nextCursor: null } })
      .mockResolvedValueOnce({ status: 200, body: workspacePage })
      .mockResolvedValueOnce({ status: 502, body: { error: { code: 'UPSTREAM_FAILURE' } } })
      .mockResolvedValueOnce({ status: 200, body: { projectId: unavailable.id, graphVersion: 2, version: null, review: null } });

    await expect(getOrganizationProjects('ORG-ONE')).resolves.toMatchObject({
      status: 'ready',
      migrationSummary: { complete: 0, pending: 0, unavailable: 1, archived: 0 },
      projects: [{ id: unavailable.id, businessContextMigration: { status: 'UNAVAILABLE' } }],
    });
  });

  it('fails the whole organization view closed when nested reads lose authorization', async () => {
    const denied = project('PROJ-DENIED');
    mocks.requestPlatform
      .mockResolvedValueOnce({ status: 200, body: organization })
      .mockResolvedValueOnce({ status: 200, body: { projects: [denied], nextCursor: null } })
      .mockResolvedValueOnce({ status: 200, body: workspacePage })
      .mockResolvedValueOnce({ status: 403, body: { error: { code: 'FORBIDDEN' } } })
      .mockResolvedValueOnce({ status: 200, body: { projectId: denied.id, graphVersion: 2, version: null, review: null } });

    await expect(getOrganizationProjects('ORG-ONE')).resolves.toEqual({ status: 'forbidden' });
  });
});
