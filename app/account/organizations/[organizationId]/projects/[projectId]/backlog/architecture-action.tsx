'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import {
  PlatformArchitectureMutationResponseSchema,
  type PlatformArchitectureBaseline,
} from '@/src/platform/contracts';

type ActionState = 'idle' | 'loading' | 'success' | 'error' | 'unknown';

interface ArchitectureActionProps {
  organizationId: string;
  projectId: string;
  projectRowVersion: number;
  sourceGraphVersion: number;
  baseline: PlatformArchitectureBaseline;
  requirementBaselineApproved: boolean;
  canGenerate: boolean;
  canApprove: boolean;
}

interface ApprovalRetry {
  fingerprint: string;
  key: string;
}

function platformMessage(body: unknown): string | null {
  const value = body as { error?: { message?: unknown } } | null;
  return typeof value?.error?.message === 'string' ? value.error.message : null;
}

export function ArchitectureAction({ organizationId, projectId, projectRowVersion, sourceGraphVersion, baseline, requirementBaselineApproved, canGenerate, canApprove }: ArchitectureActionProps) {
  const router = useRouter();
  const generationRetryKey = useRef<string | null>(null);
  const approvalRetry = useRef<ApprovalRetry | null>(null);
  const inFlight = useRef(false);
  const [generationState, setGenerationState] = useState<ActionState>('idle');
  const [generationMessage, setGenerationMessage] = useState('');
  const [approvalState, setApprovalState] = useState<ActionState>('idle');
  const [approvalMessage, setApprovalMessage] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState(baseline.generation?.recommendedOptionId ?? '');
  const [comment, setComment] = useState('');
  const selectedOption = baseline.generation?.options.find((option) => option.id === selectedOptionId) ?? null;

  function updateApprovalInput(nextOptionId: string, nextComment: string) {
    setSelectedOptionId(nextOptionId);
    setComment(nextComment);
    approvalRetry.current = null;
    if (approvalState !== 'idle') {
      setApprovalState('idle');
      setApprovalMessage('');
    }
  }

  async function generate() {
    if (inFlight.current || !canGenerate || !requirementBaselineApproved) return;
    inFlight.current = true;
    const key = generationRetryKey.current ?? crypto.randomUUID();
    generationRetryKey.current = key;
    setGenerationState('loading');
    setGenerationMessage('');
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/architecture/generations`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'idempotency-key': key, 'if-match': `"${projectId}:${projectRowVersion}"` },
        body: JSON.stringify({ sourceGraphVersion }),
      });
      const body = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        if ([409, 412, 422].includes(response.status)) generationRetryKey.current = null;
        setGenerationState('error');
        setGenerationMessage(platformMessage(body) ?? 'Architecture comparison was not generated. Review the current requirement approval and retry.');
        return;
      }
      if (!PlatformArchitectureMutationResponseSchema.safeParse(body).success) {
        setGenerationState('unknown');
        setGenerationMessage('The platform response could not be verified. Retry unchanged to resolve the result safely.');
        return;
      }
      generationRetryKey.current = null;
      approvalRetry.current = null;
      setGenerationState('success');
      setGenerationMessage('Three immutable architecture options were compiled. Refreshing the exact comparison.');
      router.refresh();
    } catch {
      setGenerationState('unknown');
      setGenerationMessage('The result is unknown. Retry unchanged so the same idempotency key is reused.');
    } finally {
      inFlight.current = false;
    }
  }

  async function approve() {
    const normalizedComment = comment.trim();
    const generation = baseline.generation;
    if (inFlight.current || !canApprove || generation === null || selectedOption === null || baseline.decision !== null) return;
    if (normalizedComment.length < 10 || normalizedComment.length > 2_000) {
      setApprovalState('error');
      setApprovalMessage('Architecture rationale must be between 10 and 2,000 characters.');
      return;
    }
    inFlight.current = true;
    const fingerprint = `${generation.id}:${generation.contentHash}:${selectedOption.id}:${selectedOption.sha256}:${normalizedComment}`;
    const key = approvalRetry.current?.fingerprint === fingerprint ? approvalRetry.current.key : crypto.randomUUID();
    approvalRetry.current = { fingerprint, key };
    setApprovalState('loading');
    setApprovalMessage('');
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/architecture/decisions`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'idempotency-key': key, 'if-match': `"${projectId}:${projectRowVersion}"` },
        body: JSON.stringify({ sourceGraphVersion, generationId: generation.id, generationContentHash: generation.contentHash, selectedOptionId: selectedOption.id, selectedOptionHash: selectedOption.sha256, comment: normalizedComment }),
      });
      const body = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        if ([409, 412, 422].includes(response.status)) approvalRetry.current = null;
        setApprovalState('error');
        setApprovalMessage(platformMessage(body) ?? 'The architecture decision was not recorded. Review the exact generation and retry.');
        return;
      }
      if (!PlatformArchitectureMutationResponseSchema.safeParse(body).success) {
        setApprovalState('unknown');
        setApprovalMessage('The approval response could not be verified. Retry the unchanged decision to resolve it safely.');
        return;
      }
      approvalRetry.current = null;
      setApprovalState('success');
      setApprovalMessage('The exact option was approved and versioned ADR/HLD views were compiled.');
      router.refresh();
    } catch {
      setApprovalState('unknown');
      setApprovalMessage('The approval result is unknown. Retry unchanged so the same idempotency key is reused.');
    } finally {
      inFlight.current = false;
    }
  }

  return <div className="architecture-actions">
    {canGenerate ? <><button type="button" disabled={generationState === 'loading' || !requirementBaselineApproved} onClick={generate}>{generationState === 'loading' ? 'Generating exact options…' : baseline.generation ? 'Regenerate architecture options' : 'Generate architecture options'}</button><small>{requirementBaselineApproved ? 'Regeneration preserves history and invalidates any earlier decision until a new exact option is approved.' : 'Approve the exact current requirement baseline first.'}</small>{generationMessage ? <p role={generationState === 'error' || generationState === 'unknown' ? 'alert' : 'status'}>{generationMessage}</p> : null}</> : <div className="backlog-notice"><b>Architecture generation is read-only</b><p>Your role can inspect the exact comparison but cannot regenerate it.</p></div>}
    {baseline.generation !== null && baseline.decision === null && canApprove ? <form onSubmit={(event) => { event.preventDefault(); void approve(); }}>
      <fieldset><legend>Select one exact option</legend>{baseline.generation.options.map((option) => <label key={option.id}><input type="radio" name="architecture-option" value={option.id} checked={selectedOptionId === option.id} onChange={() => updateApprovalInput(option.id, comment)} /><span><b>{option.name}</b><code>{option.id} · {option.sha256}</code></span></label>)}</fieldset>
      <label htmlFor="architecture-rationale">Human approval rationale</label>
      <textarea id="architecture-rationale" value={comment} maxLength={2_000} onChange={(event) => updateApprovalInput(selectedOptionId, event.target.value)} placeholder="Explain why this option is approved and why its trade-offs are acceptable." />
      <div><button type="submit" disabled={approvalState === 'loading' || selectedOption === null}>{approvalState === 'loading' ? 'Recording exact decision…' : 'Approve selected option'}</button><small>{comment.trim().length}/2,000</small></div>
      {approvalMessage ? <p role={approvalState === 'error' || approvalState === 'unknown' ? 'alert' : 'status'}>{approvalMessage}</p> : null}
    </form> : null}
    {baseline.generation !== null && baseline.decision === null && !canApprove ? <div className="backlog-notice"><b>Decision approval is restricted</b><p>An Owner, Administrator, or Architect must approve one exact option. Product Analysts may generate comparisons but cannot approve architecture.</p></div> : null}
  </div>;
}
