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
import { GenerateBacklogAction } from '../app/account/organizations/[organizationId]/projects/[projectId]/backlog/generate-backlog-action';

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
          acceptanceBlockingReason: null,
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

  it('disables backlog generation while exact document or architecture eligibility is closed', () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(createElement(BacklogEligibilityProvider, null,
      createElement(GenerateBacklogAction, {
        organizationId: 'ORG-ONE', projectId: 'PROJ-ONE', projectRowVersion: 4,
        sourceGraphVersion: 2, hasPreview: false, eligible: false,
      }),
    )));

    expect(container.querySelector('button')?.disabled).toBe(true);
    expect(container.querySelector('select')?.disabled).toBe(true);
    expect(container.textContent).toContain('exact current requirement baseline and latest architecture option');
  });

  it('blocks backlog acceptance when Business Context is not approved but preserves rejection', () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(createElement(BacklogEligibilityProvider, null,
      createElement(ReviewBacklogAction, {
        organizationId: 'ORG-ONE', projectId: 'PROJ-ONE', generationId: 'WIGEN-ONE', generationContentHash: 'a'.repeat(64),
        workItems: [], acceptanceBlockingReason: 'Generate and approve the exact current Business Context before downstream planning.',
      }),
    )));

    const accept = container.querySelector<HTMLInputElement>('input[type="radio"]');
    const reject = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="radio"]')).at(-1);
    const submit = container.querySelector<HTMLButtonElement>('section.backlog-review-action > button');
    expect(accept?.disabled).toBe(true);
    expect(submit?.disabled).toBe(true);
    expect(container.textContent).toContain('Acceptance blocked by Business Context');
    act(() => reject?.click());
    expect(submit?.disabled).toBe(false);
    expect(submit?.textContent).toBe('Reject backlog');
  });
});
