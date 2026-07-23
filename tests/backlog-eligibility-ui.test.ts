// @vitest-environment jsdom

import { act, createElement, Fragment } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import {
  BacklogEligibilityProvider,
  useBacklogEligibility,
} from '../app/account/organizations/[organizationId]/projects/[projectId]/backlog/backlog-eligibility-context';
import { ReviewBacklogAction } from '../app/account/organizations/[organizationId]/projects/[projectId]/backlog/review-backlog-action';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function BlockReviewTrigger() {
  const { setClarificationBlocked } = useBacklogEligibility();
  return createElement('button', { type: 'button', onClick: () => setClarificationBlocked(true) }, 'Expose blocker');
}

describe('backlog clarification eligibility UI', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = undefined;
    container?.remove();
    container = undefined;
  });

  it('keeps the draft inspectable but removes review controls after a critical blocker is exposed', () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(createElement(BacklogEligibilityProvider, null,
      createElement(Fragment, null,
        createElement(BlockReviewTrigger),
        createElement(ReviewBacklogAction, {
          organizationId: 'ORG-ONE', projectId: 'PROJ-ONE', generationId: 'WIGEN-ONE', generationContentHash: 'a'.repeat(64),
          workItems: [{
            id: 'WI-ONE', version: 1, type: 'STORY', parentId: null, title: 'Grounded story', priority: 'P0', estimate: 'S',
            outcome: 'Deliver a grounded outcome.', context: 'Approved context.', scope: ['Approved scope.'], outOfScope: [],
            acceptanceCriteria: [], dependencyIds: [], risks: [], openQuestions: [], evidenceExpectations: [],
            sourceEntityIds: ['REQ-ONE'], truthStatus: 'AI_SUGGESTED', reviewStatus: 'DRAFT',
          }],
        }),
      ),
    )));

    expect(container.textContent).toContain('Human review decision');
    expect(container.textContent).toContain('Accept exact backlog');
    const trigger = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Expose blocker');
    expect(trigger).toBeDefined();
    act(() => trigger?.click());
    expect(container.textContent).toContain('Review blocked by a current clarification');
    expect(container.textContent).not.toContain('Accept exact backlog');
  });
});
