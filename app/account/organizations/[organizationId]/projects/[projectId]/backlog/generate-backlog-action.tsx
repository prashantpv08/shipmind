'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import {
  PlatformClarificationAnswerResponseSchema,
  PlatformWorkItemGenerationBlockedResponseSchema,
  type PlatformWorkItemGenerationBlocker,
} from '@/src/platform/contracts';

import { useBacklogEligibility } from './backlog-eligibility-context';

type GenerationState = 'idle' | 'loading' | 'success' | 'blocked' | 'error' | 'unknown';
type AnswerState = 'idle' | 'loading' | 'success' | 'error' | 'unknown';

export function GenerateBacklogAction({ organizationId, projectId, projectRowVersion, sourceGraphVersion, hasPreview }: { organizationId: string; projectId: string; projectRowVersion: number; sourceGraphVersion: number; hasPreview: boolean }) {
  const router = useRouter();
  const { setClarificationBlocked } = useBacklogEligibility();
  const retryKey = useRef<string | null>(null);
  const answerRetry = useRef<{ questionId: string; answer: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const [state, setState] = useState<GenerationState>('idle');
  const [message, setMessage] = useState('');
  const [blockers, setBlockers] = useState<PlatformWorkItemGenerationBlocker[]>([]);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [answerMessage, setAnswerMessage] = useState('');
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [tier, setTier] = useState<'ECONOMY' | 'BALANCED' | 'BEST'>('BALANCED');

  function updateAnswer(questionId: string, answer: string) {
    setAnswerDrafts((current) => ({ ...current, [questionId]: answer }));
    if (answerRetry.current?.questionId === questionId && answerRetry.current.answer !== answer.trim()) answerRetry.current = null;
    if (answerState !== 'idle') {
      setAnswerState('idle');
      setAnswerMessage('');
    }
  }

  async function answerClarification(blocker: PlatformWorkItemGenerationBlocker) {
    if (!blocker.clarification || inFlight.current) return;
    const questionId = blocker.clarification.id;
    const answer = (answerDrafts[questionId] ?? '').trim();
    if (!answer || answer.length > 2_000) {
      setAnswerState('error');
      setAnswerMessage(answer ? 'The answer must be 2,000 characters or fewer.' : 'Enter the confirmed product decision before recording it.');
      return;
    }
    inFlight.current = true;
    const existingRetry = answerRetry.current;
    const key = existingRetry?.questionId === questionId && existingRetry.answer === answer ? existingRetry.key : crypto.randomUUID();
    answerRetry.current = { questionId, answer, key };
    setAnsweringQuestionId(questionId);
    setAnswerState('loading');
    setAnswerMessage('');
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/clarifications/${encodeURIComponent(questionId)}/answer`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'idempotency-key': key,
          'if-match': `"${projectId}:${projectRowVersion}"`,
        },
        body: JSON.stringify({ answer }),
      });
      const body = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        const errorBody = body as { error?: { message?: unknown } } | null;
        const platformMessage = typeof errorBody?.error?.message === 'string' ? errorBody.error.message : null;
        if (response.status === 409 || response.status === 412) answerRetry.current = null;
        setAnswerState('error');
        setAnswerMessage(response.status === 403 ? 'Your current role cannot record product decisions.' : platformMessage ?? 'The answer was not recorded. Retry is safe with the preserved idempotency key.');
        return;
      }
      const parsed = PlatformClarificationAnswerResponseSchema.safeParse(body);
      if (!parsed.success) {
        setAnswerState('unknown');
        setAnswerMessage('The platform response could not be verified. Retry the same answer to resolve the result safely.');
        return;
      }
      answerRetry.current = null;
      retryKey.current = null;
      setAnswerState('success');
      setAnswerMessage(`Answer recorded in graph v${parsed.data.graphVersion}. Documents and architecture must now be regenerated and reapproved.`);
      setBlockers([]);
      setClarificationBlocked(false);
      setState('idle');
      setMessage('');
      router.refresh();
    } catch {
      setAnswerState('unknown');
      setAnswerMessage('The result is unknown. Retry the exact answer so the same idempotency key is reused.');
    } finally {
      inFlight.current = false;
      setAnsweringQuestionId(null);
    }
  }

  async function generate() {
    if (inFlight.current) return;
    inFlight.current = true;
    const key = retryKey.current ?? crypto.randomUUID();
    retryKey.current = key;
    setState('loading');
    setMessage('');
    setBlockers([]);
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/work-item-generations`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'idempotency-key': key },
        body: JSON.stringify({ sourceGraphVersion, tier }),
      });
      const body = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        const errorBody = body as { error?: { message?: unknown } } | null;
        const platformMessage = typeof errorBody?.error?.message === 'string' ? errorBody.error.message : null;
        if (response.status === 422) {
          const clarification = PlatformWorkItemGenerationBlockedResponseSchema.safeParse(body);
          retryKey.current = null;
          setClarificationBlocked(true);
          setState('blocked');
          setMessage(platformMessage ?? 'The approved graph is not ready for backlog generation.');
          setBlockers(clarification.success ? clarification.data.error.details.blockers : []);
        } else {
          setState('error');
          setMessage(response.status === 403 ? 'Your current role cannot generate a backlog.' : platformMessage ?? 'Backlog generation failed. The retry key is preserved for a safe retry.');
        }
        return;
      }
      retryKey.current = null;
      setClarificationBlocked(false);
      setState('success');
      setMessage('The quality-gated draft was persisted. Refreshing the exact preview.');
      router.refresh();
    } catch {
      setState('unknown');
      setMessage('The result is unknown. Retry without changing the graph so the same idempotency key is reused.');
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="backlog-generation-action">
      <label htmlFor="backlog-model-tier">Generation tier</label>
      <select id="backlog-model-tier" value={tier} disabled={state === 'loading'} onChange={(event) => { setTier(event.target.value as typeof tier); retryKey.current = null; }}>
        <option value="ECONOMY">Economy</option>
        <option value="BALANCED">Balanced</option>
        <option value="BEST">Best</option>
      </select>
      <button type="button" onClick={generate} disabled={state === 'loading'} aria-busy={state === 'loading'}>
        {state === 'loading' ? 'Generating and validating…' : hasPreview ? 'Regenerate draft version' : 'Generate draft backlog'}
      </button>
      <small>The organization model policy resolves this tier. Raw provider selection is not available here.</small>
      {state === 'success' ? <p role="status">{message}</p> : null}
      {state === 'blocked' ? <div className="backlog-generation-blocked" role="alert">
        <p>{message}</p>
        {blockers.length > 0 ? <section aria-labelledby="generation-blockers-heading">
          <h2 id="generation-blockers-heading">Resolve these decisions before regenerating</h2>
          <ol>{blockers.map((blocker) => <li key={blocker.gapId}>
            <header><b>{blocker.title}</b><span>{blocker.severity} · {blocker.type.replaceAll('_', ' ')}</span></header>
            <p>{blocker.description}</p>
            {blocker.clarification ? <div className="backlog-clarification-answer">
              <strong>{blocker.clarification.question}</strong>
              <small>{blocker.clarification.whyItMatters}</small>
              <code>{blocker.clarification.id}{blocker.clarification.affectedEntityIds.length ? ` · affects ${blocker.clarification.affectedEntityIds.join(', ')}` : ''}</code>
              <label htmlFor={`answer-${blocker.clarification.id}`}>Confirmed product decision</label>
              <textarea
                id={`answer-${blocker.clarification.id}`}
                value={answerDrafts[blocker.clarification.id] ?? ''}
                maxLength={2_000}
                disabled={answerState === 'loading'}
                onChange={(event) => updateAnswer(blocker.clarification!.id, event.target.value)}
                placeholder="Record only the decision confirmed by an authorized human."
              />
              <div className="backlog-clarification-actions">
                <button type="button" disabled={answerState === 'loading'} aria-busy={answerState === 'loading' && answeringQuestionId === blocker.clarification.id} onClick={() => answerClarification(blocker)}>
                  {answerState === 'loading' && answeringQuestionId === blocker.clarification.id ? 'Recording decision…' : 'Record answer and create graph version'}
                </button>
                <small>{(answerDrafts[blocker.clarification.id] ?? '').length}/2,000</small>
              </div>
            </div> : <small>No clarification question is stored for this gap yet. Resolve <code>{blocker.gapId}</code> in the source-review flow.</small>}
          </li>)}</ol>
        </section> : null}
      </div> : null}
      {answerState === 'success' ? <p role="status">{answerMessage}</p> : null}
      {answerState === 'error' || answerState === 'unknown' ? <p role="alert">{answerMessage}</p> : null}
      {state === 'error' || state === 'unknown' ? <p role="alert">{message}</p> : null}
    </div>
  );
}
