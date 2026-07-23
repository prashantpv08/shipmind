'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  PlatformBudgetPolicySchema,
  type PlatformBillingOverview,
  type PlatformUpdateBudgetPolicyRequest,
} from '@/src/platform/contracts';

type Draft = Record<keyof PlatformUpdateBudgetPolicyRequest, string>;
type PendingUpdate = { request: PlatformUpdateBudgetPolicyRequest; idempotencyKey: string };
type SubmissionState =
  | { phase: 'idle' }
  | { phase: 'confirming'; pending: PendingUpdate }
  | { phase: 'saving'; pending: PendingUpdate }
  | { phase: 'success'; message: string }
  | { phase: 'stale'; message: string }
  | { phase: 'error'; message: string }
  | { phase: 'unknown'; message: string; pending: PendingUpdate };

const integer = new Intl.NumberFormat('en-US');

function draftFromPolicy(policy: PlatformBillingOverview['policy']): Draft {
  return {
    dailyCreditLimit: String(policy.dailyCreditLimit),
    userDailyCreditLimit: String(policy.userDailyCreditLimit),
    projectDailyCreditLimit: String(policy.projectDailyCreditLimit),
    alertThresholdPercent: String(policy.alertThresholdPercent),
  };
}

function parseDraft(draft: Draft): PlatformUpdateBudgetPolicyRequest | null {
  if (Object.values(draft).some((value) => value.trim() === '')) return null;
  const values = {
    dailyCreditLimit: Number(draft.dailyCreditLimit),
    userDailyCreditLimit: Number(draft.userDailyCreditLimit),
    projectDailyCreditLimit: Number(draft.projectDailyCreditLimit),
    alertThresholdPercent: Number(draft.alertThresholdPercent),
  };
  return Object.values(values).every(Number.isSafeInteger) ? values : null;
}

function errorMessage(value: unknown): string {
  if (typeof value !== 'object' || value === null || !('error' in value)) return 'The platform did not return a usable error.';
  const error = value.error;
  if (typeof error !== 'object' || error === null || !('message' in error) || typeof error.message !== 'string') {
    return 'The platform did not return a usable error.';
  }
  return error.message;
}

export function BudgetPolicyForm({
  organizationId,
  policy,
  planLimits,
}: {
  organizationId: string;
  policy: PlatformBillingOverview['policy'];
  planLimits: Pick<PlatformUpdateBudgetPolicyRequest, 'dailyCreditLimit' | 'userDailyCreditLimit' | 'projectDailyCreditLimit'>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft>(() => draftFromPolicy(policy));
  const [submission, setSubmission] = useState<SubmissionState>({ phase: 'idle' });
  const parsed = parseDraft(draft);
  const validationMessage = parsed === null
    ? 'Enter whole numbers for every control.'
    : parsed.dailyCreditLimit < 0 || parsed.userDailyCreditLimit < 0 || parsed.projectDailyCreditLimit < 0
      ? 'Credit limits cannot be negative.'
      : parsed.dailyCreditLimit > planLimits.dailyCreditLimit
      || parsed.userDailyCreditLimit > planLimits.userDailyCreditLimit
      || parsed.projectDailyCreditLimit > planLimits.projectDailyCreditLimit
      ? 'A control cannot exceed its plan ceiling.'
      : parsed.userDailyCreditLimit > parsed.dailyCreditLimit || parsed.projectDailyCreditLimit > parsed.dailyCreditLimit
        ? 'User and project limits cannot exceed the organization daily limit.'
        : parsed.alertThresholdPercent < 1 || parsed.alertThresholdPercent > 100
          ? 'Alert threshold must be between 1 and 100.'
          : null;

  function change(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setSubmission({ phase: 'idle' });
  }

  function review() {
    if (parsed === null || validationMessage !== null) return;
    setSubmission({
      phase: 'confirming',
      pending: { request: parsed, idempotencyKey: `budget-policy-${crypto.randomUUID()}` },
    });
  }

  async function save(pending: PendingUpdate) {
    setSubmission({ phase: 'saving', pending });
    try {
      const response = await fetch(
        `/api/platform/organizations/${encodeURIComponent(organizationId)}/billing/policy/${encodeURIComponent(policy.id)}`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'idempotency-key': pending.idempotencyKey,
            'if-match': `"${policy.id}:${policy.rowVersion}"`,
          },
          body: JSON.stringify(pending.request),
        },
      );
      const body: unknown = await response.json().catch(() => null);
      if (response.status === 412) {
        setSubmission({ phase: 'stale', message: 'These controls changed in another session. Reload before editing again.' });
        return;
      }
      if (!response.ok) {
        const message = errorMessage(body);
        setSubmission(response.status >= 500
          ? { phase: 'unknown', message: `${message} The outcome is unknown; retry uses the same idempotency key.`, pending }
          : { phase: 'error', message });
        return;
      }
      const updated = PlatformBudgetPolicySchema.safeParse(body);
      if (!updated.success) {
        setSubmission({ phase: 'unknown', message: 'The update response was invalid. Retry safely with the same idempotency key.', pending });
        return;
      }
      setSubmission({
        phase: 'success',
        message: updated.data.replayed ? 'The previously completed policy update was confirmed.' : 'Budget controls were updated.',
      });
      startTransition(() => router.refresh());
    } catch {
      setSubmission({ phase: 'unknown', message: 'The request was interrupted. The outcome is unknown; retry uses the same idempotency key.', pending });
    }
  }

  const saving = submission.phase === 'saving';

  return (
    <section className="billing-policy" aria-labelledby="billing-policy-heading">
      <div>
        <h2 id="billing-policy-heading">Budget controls</h2>
        <p>Hard limits block new chargeable AI reservations. They do not alter immutable measured usage.</p>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); review(); }}>
        <label>Organization daily limit<input inputMode="numeric" min="0" max={planLimits.dailyCreditLimit} name="dailyCreditLimit" type="number" value={draft.dailyCreditLimit} onChange={(event) => change('dailyCreditLimit', event.target.value)} disabled={saving} /><small>Plan ceiling: {integer.format(planLimits.dailyCreditLimit)}</small></label>
        <label>User daily limit<input inputMode="numeric" min="0" max={planLimits.userDailyCreditLimit} name="userDailyCreditLimit" type="number" value={draft.userDailyCreditLimit} onChange={(event) => change('userDailyCreditLimit', event.target.value)} disabled={saving} /><small>Plan ceiling: {integer.format(planLimits.userDailyCreditLimit)}</small></label>
        <label>Project daily limit<input inputMode="numeric" min="0" max={planLimits.projectDailyCreditLimit} name="projectDailyCreditLimit" type="number" value={draft.projectDailyCreditLimit} onChange={(event) => change('projectDailyCreditLimit', event.target.value)} disabled={saving} /><small>Plan ceiling: {integer.format(planLimits.projectDailyCreditLimit)}</small></label>
        <label>Alert threshold (%)<input inputMode="numeric" min="1" max="100" name="alertThresholdPercent" type="number" value={draft.alertThresholdPercent} onChange={(event) => change('alertThresholdPercent', event.target.value)} disabled={saving} /><small>Warn before exhaustion.</small></label>
        <div className="billing-policy-actions"><button type="submit" disabled={saving || validationMessage !== null}>Review changes</button></div>
      </form>
      {validationMessage !== null ? <p className="billing-form-message" role="alert">{validationMessage}</p> : null}
      {submission.phase === 'confirming' ? (
        <div className="billing-confirmation" role="region" aria-label="Exact budget policy preview">
          <b>Confirm exact controls</b>
          <dl><div><dt>Organization/day</dt><dd>{integer.format(submission.pending.request.dailyCreditLimit)}</dd></div><div><dt>User/day</dt><dd>{integer.format(submission.pending.request.userDailyCreditLimit)}</dd></div><div><dt>Project/day</dt><dd>{integer.format(submission.pending.request.projectDailyCreditLimit)}</dd></div><div><dt>Alert at</dt><dd>{submission.pending.request.alertThresholdPercent}%</dd></div></dl>
          <p>New reservations above these limits will be blocked immediately after approval.</p>
          <div className="billing-policy-actions"><button type="button" onClick={() => void save(submission.pending)}>Apply controls</button><button className="secondary" type="button" onClick={() => setSubmission({ phase: 'idle' })}>Cancel</button></div>
        </div>
      ) : null}
      {submission.phase === 'saving' ? <p className="billing-form-message" role="status" aria-live="polite">Applying controls…</p> : null}
      {submission.phase === 'success' ? <p className="billing-form-message success" role="status">{submission.message}</p> : null}
      {submission.phase === 'stale' ? <p className="billing-form-message" role="alert">{submission.message} <button type="button" onClick={() => router.refresh()}>Reload</button></p> : null}
      {submission.phase === 'error' ? <p className="billing-form-message" role="alert">{submission.message}</p> : null}
      {submission.phase === 'unknown' ? <p className="billing-form-message" role="alert">{submission.message} <button type="button" onClick={() => void save(submission.pending)}>Retry safely</button></p> : null}
    </section>
  );
}
