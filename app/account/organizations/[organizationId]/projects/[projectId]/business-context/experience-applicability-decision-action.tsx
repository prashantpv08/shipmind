'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { PlatformExperienceApplicabilityDecisionResponseSchema } from '@/src/platform/contracts';

type Decision = 'APPLICABLE' | 'NOT_APPLICABLE';
type ActionState = 'idle' | 'preview' | 'loading' | 'success' | 'error' | 'unknown';

interface ExperienceApplicabilityDecisionActionProps {
  organizationId: string;
  projectId: string;
  projectRowVersion: number;
  graphVersion: number;
  previewContentHash: string;
  canReview: boolean;
}

interface RetryKey {
  fingerprint: string;
  key: string;
}

function platformMessage(body: unknown): string | null {
  const value = body as { error?: { message?: unknown } } | null;
  return typeof value?.error?.message === 'string' ? value.error.message : null;
}

export function ExperienceApplicabilityDecisionAction({ organizationId, projectId, projectRowVersion, graphVersion, previewContentHash, canReview }: ExperienceApplicabilityDecisionActionProps) {
  const router = useRouter();
  const retry = useRef<RetryKey | null>(null);
  const inFlight = useRef(false);
  const [decision, setDecision] = useState<Decision>('APPLICABLE');
  const [rationale, setRationale] = useState('');
  const [state, setState] = useState<ActionState>('idle');
  const [message, setMessage] = useState('');
  const normalizedRationale = rationale.trim();

  function editDecision() {
    retry.current = null;
    setState('idle');
    setMessage('');
  }

  function reviewDecision() {
    if (normalizedRationale.length < 10 || normalizedRationale.length > 2_000) {
      setState('error');
      setMessage('Decision rationale must be between 10 and 2,000 characters.');
      return;
    }
    retry.current = null;
    setState('preview');
    setMessage('');
  }

  async function confirmDecision() {
    if (inFlight.current || !canReview || normalizedRationale.length < 10 || normalizedRationale.length > 2_000) return;
    const body = { sourceGraphVersion: graphVersion, previewContentHash, decision, rationale: normalizedRationale };
    const fingerprint = JSON.stringify(body);
    const key = retry.current?.fingerprint === fingerprint ? retry.current.key : crypto.randomUUID();
    retry.current = { fingerprint, key };
    inFlight.current = true;
    setState('loading');
    setMessage('');
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/business-context/applicability-decisions`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'idempotency-key': key, 'if-match': `"${projectId}:${projectRowVersion}"` },
        body: JSON.stringify(body),
      });
      const responseBody = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        const deterministicFailure = [400, 401, 403, 404, 409, 412, 422, 428].includes(response.status);
        if (deterministicFailure) retry.current = null;
        setState(deterministicFailure ? 'error' : 'unknown');
        setMessage(platformMessage(responseBody) ?? (deterministicFailure
          ? 'The applicability decision was not recorded. Refresh the exact preview and try again.'
          : 'The decision result could not be verified. Retry unchanged so the same idempotency key is reused.'));
        return;
      }
      if (!PlatformExperienceApplicabilityDecisionResponseSchema.safeParse(responseBody).success) {
        setState('unknown');
        setMessage('The decision response could not be verified. Retry unchanged to resolve the result safely.');
        return;
      }
      retry.current = null;
      setState('success');
      setMessage(`Experience applicability is now ${decision.replaceAll('_', ' ')} on graph v${graphVersion + 1}.`);
      router.refresh();
    } catch {
      setState('unknown');
      setMessage('The decision result is unknown. Retry unchanged so the same idempotency key is reused.');
    } finally {
      inFlight.current = false;
    }
  }

  if (!canReview) {
    return <section className="business-context-governance"><div><span>Human decision required</span><h2>Resolve experience applicability</h2><p>An authorized product decision-maker or Reviewer must record whether this scope needs a user-facing experience.</p></div></section>;
  }

  return <section className="business-context-governance" aria-labelledby="experience-decision-heading">
    <div><span>Human decision required</span><h2 id="experience-decision-heading">Resolve experience applicability</h2><p>This decision creates canonical graph v{graphVersion + 1}; current downstream approvals remain historical and must be regenerated for the new graph.</p></div>
    {!['preview', 'loading', 'unknown'].includes(state) ? <form onSubmit={(event) => { event.preventDefault(); reviewDecision(); }}>
      <fieldset><legend>Does this scope require a user-facing experience?</legend>{(['APPLICABLE', 'NOT_APPLICABLE'] as const).map((option) => <label key={option}><input type="radio" name="experience-applicability-decision" value={option} checked={decision === option} onChange={() => { setDecision(option); editDecision(); }} /><span><b>{option.replaceAll('_', ' ')}</b><small>{option === 'APPLICABLE' ? 'Require an approved Experience Baseline before downstream planning.' : 'Record an explicit non-visual decision; Axiom will not invent screens.'}</small></span></label>)}</fieldset>
      <label htmlFor="experience-applicability-rationale">Decision rationale<textarea id="experience-applicability-rationale" value={rationale} minLength={10} maxLength={2_000} required onChange={(event) => { setRationale(event.target.value); editDecision(); }} placeholder="Explain why this exact project scope does or does not require a user-facing experience." /></label>
      <div><button type="submit">Review decision</button><small>{normalizedRationale.length}/2,000</small></div>
      {message ? <p role={state === 'error' || state === 'unknown' ? 'alert' : 'status'}>{message}</p> : null}
    </form> : <div className="business-context-proposed-change" role="region" aria-label="Exact experience applicability decision preview">
      <h3>Exact decision preview</h3>
      <dl><div><dt>Decision</dt><dd>{decision.replaceAll('_', ' ')}</dd></div><div><dt>Graph change</dt><dd>v{graphVersion} → v{graphVersion + 1}</dd></div><div><dt>Truth status</dt><dd>HUMAN CONFIRMED</dd></div></dl>
      <p>{normalizedRationale}</p>
      <code>{previewContentHash}</code>
      <ul><li>A new immutable applicability decision and canonical graph version will be created.</li><li>Current Business Context, architecture, Engineering Plan, and work-item approvals will not apply to the new graph.</li><li>{decision === 'APPLICABLE' ? 'An exact compatible approved Experience Baseline will be required.' : 'Downstream planning may proceed after the new Business Context is generated and approved.'}</li></ul>
      <div><button type="button" onClick={() => { void confirmDecision(); }} disabled={state === 'loading'} aria-busy={state === 'loading'}>{state === 'loading' ? 'Recording decision…' : state === 'unknown' ? 'Retry unchanged' : 'Confirm applicability decision'}</button><button type="button" onClick={editDecision} disabled={state === 'loading'}>Change decision</button></div>
      {message ? <p role={state === 'error' || state === 'unknown' ? 'alert' : 'status'}>{message}</p> : null}
    </div>}
  </section>;
}
