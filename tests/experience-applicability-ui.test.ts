// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

import { ExperienceApplicabilityDecisionAction } from '../app/account/organizations/[organizationId]/projects/[projectId]/business-context/experience-applicability-decision-action';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const previewContentHash = 'a'.repeat(64);
const resultingPreview = {
  schemaVersion: 'business-context-preview-v1', compilerVersion: 'business-context-compiler-v1', projectId: 'PROJ-ONE', sourceGraphVersion: 3,
  contentHash: 'b'.repeat(64), compiledAt: '2026-08-11T00:00:00.000Z',
  applicability: { status: 'APPLICABLE', rationale: 'The graph requires a user interface.', sourceEntityIds: ['DECISION-EXPERIENCE-APPLICABILITY-PROJ-ONE'], decisionRequired: false },
  outcomes: [], actors: [], workflows: [], successMeasures: [], unknowns: [], blockingGapIds: [],
  coverage: { eligibleEntityCount: 1, classifiedEntityCount: 0, unclassifiedEntityIds: ['DECISION-EXPERIENCE-APPLICABILITY-PROJ-ONE'] },
} as const;

describe('experience applicability decision UI', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = undefined;
    container?.remove();
    container = undefined;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('previews the exact invalidation and reuses the retry key after an unknown result', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('connection lost'))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        project: { id: 'PROJ-ONE', workspaceId: 'WS-ONE', name: 'Decision project', status: 'ANALYZED', graphVersion: 3, rowVersion: 5, archivedAt: null, createdAt: '2026-08-11T00:00:00.000Z', updatedAt: '2026-08-11T00:00:00.000Z' },
        decision: { id: 'EAD-ONE', projectId: 'PROJ-ONE', previousGraphVersion: 2, graphVersion: 3, decision: 'APPLICABLE', rationale: 'Customers complete this workflow through an authenticated portal.', sourcePreviewContentHash: previewContentHash, truthStatus: 'HUMAN_CONFIRMED', decidedByUserId: 'USER-ONE', decidedAt: '2026-08-11T00:00:00.000Z' },
        preview: resultingPreview,
        replayed: true,
      }), { status: 201, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(createElement(ExperienceApplicabilityDecisionAction, {
      organizationId: 'ORG-ONE', projectId: 'PROJ-ONE', projectRowVersion: 4, graphVersion: 2,
      previewContentHash, canReview: true,
    })));

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
    expect(textarea).not.toBeNull();
    act(() => {
      if (!textarea) return;
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      valueSetter?.call(textarea, 'Customers complete this workflow through an authenticated portal.');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const review = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Review decision');
    act(() => review?.click());
    expect(container.textContent).toContain('Exact decision preview');
    expect(container.textContent).toContain('v2 → v3');
    expect(container.textContent).toContain('current downstream approvals remain historical');

    const confirm = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Confirm applicability decision');
    await act(async () => { confirm?.click(); });
    expect(container.textContent).toContain('The decision result is unknown. Retry unchanged');
    const retry = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Retry unchanged');
    await act(async () => { retry?.click(); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstHeaders = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
    const secondHeaders = (fetchMock.mock.calls[1]?.[1] as RequestInit).headers as Record<string, string>;
    expect(firstHeaders['idempotency-key']).toBeTruthy();
    expect(secondHeaders['idempotency-key']).toBe(firstHeaders['idempotency-key']);
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
});
