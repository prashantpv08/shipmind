'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import type { PlatformWorkItem } from '@/src/platform/contracts';

import { useBacklogEligibility } from './backlog-eligibility-context';

type ReviewMode = 'ACCEPT' | 'ACCEPT_WITH_EDITS' | 'REJECT';
type ReviewState = 'idle' | 'loading' | 'success' | 'blocked' | 'stale' | 'error' | 'unknown';
type EditableWorkItem = Pick<PlatformWorkItem, 'title' | 'priority' | 'estimate' | 'outcome' | 'context'> & { scope: string; outOfScope: string };

const editReasonOptions = [
  ['SCOPE_ADJUSTMENT', 'Scope adjustment'],
  ['TECHNICAL_CORRECTION', 'Technical correction'],
  ['PRIORITY_OR_ESTIMATE', 'Priority or estimate'],
  ['OTHER', 'Other'],
] as const;
const rejectionReasonOptions = [
  ['MISSING_REQUIREMENT', 'Missing requirement'],
  ['UNGROUNDED', 'Ungrounded content'],
  ['UNTESTABLE', 'Untestable criteria'],
  ['DUPLICATE_OR_OVERLAP', 'Duplicate or overlap'],
  ['DEPENDENCY_ERROR', 'Dependency error'],
  ['CRITICAL_UNKNOWN', 'Critical unknown'],
  ['OTHER', 'Other'],
] as const;

function splitLines(value: string): string[] {
  return value.split('\n').map((line) => line.trim()).filter(Boolean);
}

export function ReviewBacklogAction({
  organizationId,
  projectId,
  generationId,
  generationContentHash,
  workItems,
}: {
  organizationId: string;
  projectId: string;
  generationId: string;
  generationContentHash: string;
  workItems: PlatformWorkItem[];
}) {
  const router = useRouter();
  const { clarificationBlocked } = useBacklogEligibility();
  const retryKey = useRef<string | null>(null);
  const inFlight = useRef(false);
  const [mode, setMode] = useState<ReviewMode>('ACCEPT');
  const [reasonCategory, setReasonCategory] = useState('MEETS_REQUIREMENTS');
  const [comment, setComment] = useState('');
  const [state, setState] = useState<ReviewState>('idle');
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState<Record<string, EditableWorkItem>>(() => Object.fromEntries(workItems.map((item) => [item.id, {
    title: item.title,
    priority: item.priority,
    estimate: item.estimate,
    outcome: item.outcome,
    context: item.context,
    scope: item.scope.join('\n'),
    outOfScope: item.outOfScope.join('\n'),
  }])));

  function chooseMode(nextMode: ReviewMode) {
    retryKey.current = null;
    setMode(nextMode);
    setReasonCategory(nextMode === 'ACCEPT' ? 'MEETS_REQUIREMENTS' : nextMode === 'ACCEPT_WITH_EDITS' ? 'SCOPE_ADJUSTMENT' : 'MISSING_REQUIREMENT');
    setState('idle');
    setMessage('');
  }

  function updateDraft(id: string, field: keyof EditableWorkItem, value: string) {
    retryKey.current = null;
    setDrafts((current) => ({ ...current, [id]: { ...current[id]!, [field]: value } }));
  }

  function buildEdits() {
    return workItems.flatMap((item) => {
      const draft = drafts[item.id]!;
      const scope = splitLines(draft.scope);
      const outOfScope = splitLines(draft.outOfScope);
      const patch: Record<string, unknown> = {};
      if (draft.title.trim() !== item.title) patch.title = draft.title.trim();
      if (draft.priority !== item.priority) patch.priority = draft.priority;
      if (draft.estimate !== item.estimate) patch.estimate = draft.estimate;
      if (draft.outcome.trim() !== item.outcome) patch.outcome = draft.outcome.trim();
      if (draft.context.trim() !== item.context) patch.context = draft.context.trim();
      if (JSON.stringify(scope) !== JSON.stringify(item.scope)) patch.scope = scope;
      if (JSON.stringify(outOfScope) !== JSON.stringify(item.outOfScope)) patch.outOfScope = outOfScope;
      return Object.keys(patch).length === 0 ? [] : [{ workItemId: item.id, expectedVersion: item.version, ...patch }];
    });
  }

  async function submitReview() {
    if (inFlight.current) return;
    const trimmedComment = comment.trim();
    if (trimmedComment.length < 10) {
      setState('error');
      setMessage('Explain the review decision in at least 10 characters.');
      return;
    }
    const edits = mode === 'ACCEPT_WITH_EDITS' ? buildEdits() : [];
    if (mode === 'ACCEPT_WITH_EDITS' && edits.length === 0) {
      setState('error');
      setMessage('Change at least one editable work-item field before accepting with edits.');
      return;
    }
    inFlight.current = true;
    const key = retryKey.current ?? crypto.randomUUID();
    retryKey.current = key;
    setState('loading');
    setMessage('');
    const body = mode === 'ACCEPT_WITH_EDITS'
      ? { decision: mode, reasonCategory, comment: trimmedComment, edits }
      : { decision: mode, reasonCategory, comment: trimmedComment };
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/work-item-generations/${encodeURIComponent(generationId)}/reviews`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'idempotency-key': key,
          'if-match': `"${generationId}:${generationContentHash}"`,
        },
        body: JSON.stringify(body),
      });
      const responseBody = await response.json().catch(() => null) as { error?: { message?: unknown } } | null;
      if (!response.ok) {
        const platformMessage = typeof responseBody?.error?.message === 'string' ? responseBody.error.message : null;
        if (response.status === 409) {
          retryKey.current = null;
          setState('stale');
          setMessage(platformMessage ?? 'This exact preview is stale. Refresh before reviewing again.');
        } else if (response.status === 422) {
          retryKey.current = null;
          setState('blocked');
          setMessage(platformMessage ?? 'This decision is blocked by current graph or quality requirements.');
        } else {
          setState('error');
          setMessage(response.status === 403 ? 'Your current role cannot submit backlog reviews.' : platformMessage ?? 'Review submission failed. The retry key is preserved for a safe retry.');
        }
        return;
      }
      retryKey.current = null;
      setState('success');
      setMessage('The immutable human review was recorded. Refreshing the exact reviewed version.');
      router.refresh();
    } catch {
      setState('unknown');
      setMessage('The result is unknown. Retry the unchanged decision so the same idempotency key is reused.');
    } finally {
      inFlight.current = false;
    }
  }

  const reasons = mode === 'ACCEPT_WITH_EDITS' ? editReasonOptions : rejectionReasonOptions;
  if (clarificationBlocked) return <div className="backlog-notice" role="status"><b>Review blocked by a current clarification</b><p>The previous draft remains visible as evidence, but it cannot be accepted or edited while a critical graph decision is unresolved.</p></div>;
  return (
    <section className="backlog-review-action" aria-labelledby="human-review-heading">
      <div><h2 id="human-review-heading">Human review decision</h2><p>Review the exact versions below. This decision does not publish anything externally.</p></div>
      <fieldset className="backlog-review-modes"><legend>Decision</legend>
        <label><input type="radio" name="review-decision" checked={mode === 'ACCEPT'} onChange={() => chooseMode('ACCEPT')} /> Accept exact draft</label>
        <label><input type="radio" name="review-decision" checked={mode === 'ACCEPT_WITH_EDITS'} onChange={() => chooseMode('ACCEPT_WITH_EDITS')} /> Accept with edits</label>
        <label><input type="radio" name="review-decision" checked={mode === 'REJECT'} onChange={() => chooseMode('REJECT')} /> Reject draft</label>
      </fieldset>
      {mode !== 'ACCEPT' ? <label className="backlog-review-field"><span>Reason category</span><select value={reasonCategory} onChange={(event) => { retryKey.current = null; setReasonCategory(event.target.value); }}>{reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : null}
      {mode === 'ACCEPT_WITH_EDITS' ? <div className="backlog-edit-list"><h3>Editable work-item fields</h3><p>Only changed items receive a new immutable version. Source links, hierarchy, acceptance criteria, dependencies, risks, and evidence expectations remain protected in this slice.</p>{workItems.map((item) => {
        const draft = drafts[item.id]!;
        return <details key={item.id}><summary><span>{item.type}</span> {item.title}<code>{item.id} · v{item.version}</code></summary><div className="backlog-edit-grid">
          <label><span>Title</span><input value={draft.title} onChange={(event) => updateDraft(item.id, 'title', event.target.value)} /></label>
          <label><span>Priority</span><select value={draft.priority} onChange={(event) => updateDraft(item.id, 'priority', event.target.value)}>{['P0', 'P1', 'P2', 'P3'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span>Estimate</span><select value={draft.estimate} onChange={(event) => updateDraft(item.id, 'estimate', event.target.value)}>{['XS', 'S', 'M', 'L', 'XL', 'UNKNOWN'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="wide"><span>Outcome</span><textarea value={draft.outcome} onChange={(event) => updateDraft(item.id, 'outcome', event.target.value)} /></label>
          <label className="wide"><span>Context</span><textarea value={draft.context} onChange={(event) => updateDraft(item.id, 'context', event.target.value)} /></label>
          <label><span>Scope · one item per line</span><textarea value={draft.scope} onChange={(event) => updateDraft(item.id, 'scope', event.target.value)} /></label>
          <label><span>Out of scope · one item per line</span><textarea value={draft.outOfScope} onChange={(event) => updateDraft(item.id, 'outOfScope', event.target.value)} /></label>
        </div></details>;
      })}</div> : null}
      <label className="backlog-review-field"><span>{mode === 'ACCEPT' ? 'Approval explanation' : 'Decision explanation'}</span><textarea value={comment} maxLength={2_000} onChange={(event) => { retryKey.current = null; setComment(event.target.value); }} placeholder="Explain why this exact backlog should be accepted or rejected." /></label>
      <button type="button" onClick={submitReview} disabled={state === 'loading'} aria-busy={state === 'loading'}>{state === 'loading' ? 'Validating and recording…' : mode === 'ACCEPT' ? 'Accept exact backlog' : mode === 'ACCEPT_WITH_EDITS' ? 'Validate edits and accept' : 'Reject backlog'}</button>
      {state === 'success' ? <p role="status">{message}</p> : null}
      {['blocked', 'stale', 'error', 'unknown'].includes(state) ? <p role="alert">{message}</p> : null}
    </section>
  );
}
