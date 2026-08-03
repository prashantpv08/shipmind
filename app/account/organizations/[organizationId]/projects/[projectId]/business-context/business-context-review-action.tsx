'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import {
  PlatformBusinessContextMutationResponseSchema,
  type PlatformBusinessContextBaseline,
  type PlatformBusinessContextFeedbackCategory,
  type PlatformBusinessContextPreview,
  type PlatformBusinessContextReviewDecision,
} from '@/src/platform/contracts';

type ActionState = 'idle' | 'loading' | 'success' | 'error' | 'unknown';
type ChangeTarget = 'OUTCOME' | 'ACTOR' | 'WORKFLOW' | 'SUCCESS_MEASURE' | 'EXPERIENCE_APPLICABILITY';

interface BusinessContextReviewActionProps {
  organizationId: string;
  projectId: string;
  projectRowVersion: number;
  preview: PlatformBusinessContextPreview;
  baseline: PlatformBusinessContextBaseline;
  canGenerate: boolean;
  canReview: boolean;
}

interface RetryKey {
  fingerprint: string;
  key: string;
}

const REVIEW_CATEGORIES: ReadonlyArray<Exclude<PlatformBusinessContextFeedbackCategory, 'APPROVAL'>> = [
  'BUSINESS_OUTCOME', 'ACTOR', 'WORKFLOW', 'SUCCESS_MEASURE', 'EXPERIENCE_APPLICABILITY', 'SOURCE_GROUNDING', 'OTHER',
];

function platformMessage(body: unknown): string | null {
  const value = body as { error?: { message?: unknown } } | null;
  return typeof value?.error?.message === 'string' ? value.error.message : null;
}

export function BusinessContextReviewAction({ organizationId, projectId, projectRowVersion, preview, baseline, canGenerate, canReview }: BusinessContextReviewActionProps) {
  const router = useRouter();
  const generationRetry = useRef<string | null>(null);
  const reviewRetry = useRef<RetryKey | null>(null);
  const inFlight = useRef(false);
  const [generationState, setGenerationState] = useState<ActionState>('idle');
  const [generationMessage, setGenerationMessage] = useState('');
  const [reviewState, setReviewState] = useState<ActionState>('idle');
  const [reviewMessage, setReviewMessage] = useState('');
  const [decision, setDecision] = useState<PlatformBusinessContextReviewDecision>('ACCEPT');
  const [category, setCategory] = useState<Exclude<PlatformBusinessContextFeedbackCategory, 'APPROVAL'>>('BUSINESS_OUTCOME');
  const [comment, setComment] = useState('');
  const [changeTarget, setChangeTarget] = useState<ChangeTarget>('OUTCOME');
  const [targetItemId, setTargetItemId] = useState(preview.outcomes[0]?.id ?? '');
  const [proposedValue, setProposedValue] = useState('');
  const [changeRationale, setChangeRationale] = useState('');
  const approvalBlocked = preview.unknowns.length > 0 || preview.blockingGapIds.length > 0 || preview.applicability.status === 'NEEDS_DECISION';

  const targetItems = useMemo(() => {
    if (changeTarget === 'OUTCOME') return preview.outcomes;
    if (changeTarget === 'ACTOR') return preview.actors;
    if (changeTarget === 'WORKFLOW') return preview.workflows;
    if (changeTarget === 'SUCCESS_MEASURE') return preview.successMeasures;
    return [];
  }, [changeTarget, preview]);

  function clearReviewResult() {
    reviewRetry.current = null;
    if (reviewState !== 'idle') {
      setReviewState('idle');
      setReviewMessage('');
    }
  }

  function changeDecision(next: PlatformBusinessContextReviewDecision) {
    setDecision(next);
    clearReviewResult();
  }

  function selectTarget(next: ChangeTarget) {
    setChangeTarget(next);
    const candidates = next === 'OUTCOME' ? preview.outcomes : next === 'ACTOR' ? preview.actors : next === 'WORKFLOW' ? preview.workflows : next === 'SUCCESS_MEASURE' ? preview.successMeasures : [];
    setTargetItemId(candidates[0]?.id ?? '');
    clearReviewResult();
  }

  async function generate() {
    if (inFlight.current || !canGenerate) return;
    inFlight.current = true;
    const key = generationRetry.current ?? crypto.randomUUID();
    generationRetry.current = key;
    setGenerationState('loading');
    setGenerationMessage('');
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/business-context/generations`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'idempotency-key': key, 'if-match': `"${projectId}:${projectRowVersion}"` },
        body: JSON.stringify({ sourceGraphVersion: preview.sourceGraphVersion, previewContentHash: preview.contentHash }),
      });
      const body = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        if ([409, 412, 422].includes(response.status)) generationRetry.current = null;
        setGenerationState('error');
        setGenerationMessage(platformMessage(body) ?? 'The exact Business Context version was not generated. Refresh the preview and retry.');
        return;
      }
      if (!PlatformBusinessContextMutationResponseSchema.safeParse(body).success) {
        setGenerationState('unknown');
        setGenerationMessage('The generation response could not be verified. Retry unchanged to resolve the result safely.');
        return;
      }
      generationRetry.current = null;
      reviewRetry.current = null;
      setGenerationState('success');
      setGenerationMessage('The exact preview was stored as a new immutable Business Context version.');
      router.refresh();
    } catch {
      setGenerationState('unknown');
      setGenerationMessage('The generation result is unknown. Retry unchanged so the same idempotency key is reused.');
    } finally {
      inFlight.current = false;
    }
  }

  async function review() {
    const version = baseline.version;
    const normalizedComment = comment.trim();
    if (inFlight.current || !canReview || version === null || baseline.review !== null) return;
    if (normalizedComment.length < 10 || normalizedComment.length > 2_000) {
      setReviewState('error');
      setReviewMessage('Review feedback must be between 10 and 2,000 characters.');
      return;
    }
    if (decision === 'ACCEPT' && approvalBlocked) {
      setReviewState('error');
      setReviewMessage('Exact approval is blocked until all unknowns, critical gaps, and applicability decisions are resolved in canonical truth.');
      return;
    }
    if (decision === 'ACCEPT_WITH_EDITS' && (proposedValue.trim().length === 0 || changeRationale.trim().length < 10)) {
      setReviewState('error');
      setReviewMessage('A proposed value and rationale of at least 10 characters are required.');
      return;
    }
    const proposedGraphChanges = decision === 'ACCEPT_WITH_EDITS' ? [{
      target: changeTarget,
      targetItemId: changeTarget === 'EXPERIENCE_APPLICABILITY' ? null : targetItemId || null,
      proposedValue: proposedValue.trim(),
      rationale: changeRationale.trim(),
    }] : [];
    const body = {
      sourceGraphVersion: preview.sourceGraphVersion,
      contextVersionId: version.id,
      contextContentHash: version.contentHash,
      decision,
      feedbackCategory: decision === 'ACCEPT' ? 'APPROVAL' as const : category,
      comment: normalizedComment,
      proposedGraphChanges,
    };
    inFlight.current = true;
    const fingerprint = JSON.stringify(body);
    const key = reviewRetry.current?.fingerprint === fingerprint ? reviewRetry.current.key : crypto.randomUUID();
    reviewRetry.current = { fingerprint, key };
    setReviewState('loading');
    setReviewMessage('');
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/business-context/reviews`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'idempotency-key': key, 'if-match': `"${projectId}:${projectRowVersion}"` },
        body: JSON.stringify(body),
      });
      const responseBody = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        if ([409, 412, 422].includes(response.status)) reviewRetry.current = null;
        setReviewState('error');
        setReviewMessage(platformMessage(responseBody) ?? 'The exact Business Context review was not recorded. Refresh and retry.');
        return;
      }
      if (!PlatformBusinessContextMutationResponseSchema.safeParse(responseBody).success) {
        setReviewState('unknown');
        setReviewMessage('The review response could not be verified. Retry the unchanged decision to resolve it safely.');
        return;
      }
      reviewRetry.current = null;
      setReviewState('success');
      setReviewMessage(decision === 'ACCEPT' ? 'The exact Business Context version was approved.' : 'The categorized review was recorded without changing canonical truth.');
      router.refresh();
    } catch {
      setReviewState('unknown');
      setReviewMessage('The review result is unknown. Retry unchanged so the same idempotency key is reused.');
    } finally {
      inFlight.current = false;
    }
  }

  return <section className="business-context-governance" aria-labelledby="business-context-governance-heading">
    <div><span>Governed versioning</span><h2 id="business-context-governance-heading">Generate and review the exact context</h2><p>Generation stores this exact hash. A review never edits canonical graph content silently.</p></div>
    {canGenerate ? <div className="business-context-generation-action"><button type="button" onClick={generate} disabled={generationState === 'loading' || reviewState === 'loading'} aria-busy={generationState === 'loading'}>{generationState === 'loading' ? 'Storing exact version…' : baseline.version ? 'Regenerate immutable version' : 'Generate immutable version'}</button><small>Regeneration preserves history and makes an older approval non-current.</small>{generationMessage ? <p role={generationState === 'error' || generationState === 'unknown' ? 'alert' : 'status'}>{generationMessage}</p> : null}</div> : <div className="backlog-notice"><b>Generation is restricted</b><p>Your role can inspect Business Context but cannot create a version.</p></div>}
    {baseline.version !== null && baseline.review === null && canReview ? <form onSubmit={(event) => { event.preventDefault(); void review(); }}>
      <fieldset><legend>Exact human decision</legend>{(['ACCEPT', 'ACCEPT_WITH_EDITS', 'REJECT'] as const).map((option) => <label key={option}><input type="radio" name="business-context-decision" value={option} checked={decision === option} onChange={() => changeDecision(option)} /><span><b>{option.replaceAll('_', ' ')}</b><small>{option === 'ACCEPT' ? 'Approve this exact immutable hash.' : option === 'ACCEPT_WITH_EDITS' ? 'Record a proposed graph change; do not approve yet.' : 'Reject with categorized feedback.'}</small></span></label>)}</fieldset>
      {decision !== 'ACCEPT' ? <label>Feedback category<select value={category} onChange={(event) => { setCategory(event.target.value as typeof category); clearReviewResult(); }}>{REVIEW_CATEGORIES.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label> : null}
      <label htmlFor="business-context-review-comment">Review rationale<textarea id="business-context-review-comment" value={comment} minLength={10} maxLength={2_000} required onChange={(event) => { setComment(event.target.value); clearReviewResult(); }} placeholder="Explain the exact decision and any remaining business risk." /></label>
      {decision === 'ACCEPT_WITH_EDITS' ? <div className="business-context-proposed-change"><h3>Proposed canonical change</h3><label>Target<select value={changeTarget} onChange={(event) => selectTarget(event.target.value as ChangeTarget)}><option value="OUTCOME">Business outcome</option><option value="ACTOR">Actor</option><option value="WORKFLOW">Workflow</option><option value="SUCCESS_MEASURE">Success measure</option><option value="EXPERIENCE_APPLICABILITY">Experience applicability</option></select></label>{changeTarget !== 'EXPERIENCE_APPLICABILITY' ? <label>Exact item<select value={targetItemId} onChange={(event) => { setTargetItemId(event.target.value); clearReviewResult(); }} required>{targetItems.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.statement.slice(0, 80)}</option>)}</select></label> : null}<label>Proposed value<textarea value={proposedValue} maxLength={5_000} required onChange={(event) => { setProposedValue(event.target.value); clearReviewResult(); }} /></label><label>Why this should change<textarea value={changeRationale} minLength={10} maxLength={2_000} required onChange={(event) => { setChangeRationale(event.target.value); clearReviewResult(); }} /></label><small>This is stored as `PROPOSED_GRAPH_MUTATION`; it does not replace source-grounded truth.</small></div> : null}
      {decision === 'ACCEPT' && approvalBlocked ? <p className="business-context-approval-blocked" role="status">Approval is blocked by {preview.blockingGapIds.length} critical gap(s), {preview.unknowns.length} unknown(s), or an unresolved applicability decision. Reject or propose edits instead.</p> : null}
      <div><button type="submit" disabled={reviewState === 'loading' || generationState === 'loading' || (decision === 'ACCEPT' && approvalBlocked)} aria-busy={reviewState === 'loading'}>{reviewState === 'loading' ? 'Recording exact review…' : decision === 'ACCEPT' ? 'Approve exact version' : 'Record categorized review'}</button><small>{comment.trim().length}/2,000</small></div>
      {reviewMessage ? <p role={reviewState === 'error' || reviewState === 'unknown' ? 'alert' : 'status'}>{reviewMessage}</p> : null}
    </form> : null}
    {baseline.version !== null && baseline.review === null && !canReview ? <div className="backlog-notice"><b>Review is restricted</b><p>An authorized product decision-maker or Reviewer must record the exact decision.</p></div> : null}
  </section>;
}
