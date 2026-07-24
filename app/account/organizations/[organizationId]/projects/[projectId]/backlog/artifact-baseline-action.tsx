'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import {
  PlatformArtifactApprovalResponseSchema,
  PlatformArtifactGenerationResponseSchema,
  type PlatformArtifactApproval,
  type PlatformProjectArtifact,
} from '@/src/platform/contracts';

type ActionState = 'idle' | 'loading' | 'success' | 'error' | 'unknown';

interface ArtifactBaselineActionProps {
  organizationId: string;
  projectId: string;
  projectRowVersion: number;
  sourceGraphVersion: number;
  artifacts: PlatformProjectArtifact[];
  approval: PlatformArtifactApproval | null;
}

interface ApprovalRetry {
  comment: string;
  fingerprint: string;
  key: string;
}

function artifactHashes(artifacts: PlatformProjectArtifact[]) {
  const byType = new Map(artifacts.map((artifact) => [artifact.type, artifact.sha256]));
  const requirements = byType.get('requirements');
  const srs = byType.get('srs');
  const nfr = byType.get('nfr');
  return requirements && srs && nfr ? { requirements, srs, nfr } : null;
}

function platformMessage(body: unknown): string | null {
  const value = body as { error?: { message?: unknown } } | null;
  return typeof value?.error?.message === 'string' ? value.error.message : null;
}

export function ArtifactBaselineAction({ organizationId, projectId, projectRowVersion, sourceGraphVersion, artifacts, approval }: ArtifactBaselineActionProps) {
  const router = useRouter();
  const generationRetryKey = useRef<string | null>(null);
  const approvalRetry = useRef<ApprovalRetry | null>(null);
  const inFlight = useRef(false);
  const [generationState, setGenerationState] = useState<ActionState>('idle');
  const [generationMessage, setGenerationMessage] = useState('');
  const [approvalState, setApprovalState] = useState<ActionState>('idle');
  const [approvalMessage, setApprovalMessage] = useState('');
  const [comment, setComment] = useState('');
  const hashes = artifactHashes(artifacts);

  function updateComment(value: string) {
    setComment(value);
    if (approvalRetry.current?.comment !== value.trim()) approvalRetry.current = null;
    if (approvalState !== 'idle') {
      setApprovalState('idle');
      setApprovalMessage('');
    }
  }

  async function generate() {
    if (inFlight.current) return;
    inFlight.current = true;
    const key = generationRetryKey.current ?? crypto.randomUUID();
    generationRetryKey.current = key;
    setGenerationState('loading');
    setGenerationMessage('');
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/artifacts/generations`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'idempotency-key': key,
          'if-match': `"${projectId}:${projectRowVersion}"`,
        },
        body: JSON.stringify({ sourceGraphVersion }),
      });
      const body = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        if (response.status === 409 || response.status === 412) generationRetryKey.current = null;
        setGenerationState('error');
        setGenerationMessage(platformMessage(body) ?? 'Artifact generation failed. Retry is safe with the preserved idempotency key.');
        return;
      }
      const parsed = PlatformArtifactGenerationResponseSchema.safeParse(body);
      if (!parsed.success) {
        setGenerationState('unknown');
        setGenerationMessage('The platform response could not be verified. Retry unchanged to resolve the result safely.');
        return;
      }
      generationRetryKey.current = null;
      approvalRetry.current = null;
      setGenerationState('success');
      setGenerationMessage('A new immutable requirement baseline was compiled. Refreshing the exact preview.');
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
    if (inFlight.current || hashes === null) return;
    if (normalizedComment.length < 10 || normalizedComment.length > 2_000) {
      setApprovalState('error');
      setApprovalMessage('Approval rationale must be between 10 and 2,000 characters.');
      return;
    }
    inFlight.current = true;
    const fingerprint = `${hashes.requirements}:${hashes.srs}:${hashes.nfr}`;
    const previous = approvalRetry.current;
    const key = previous?.comment === normalizedComment && previous.fingerprint === fingerprint ? previous.key : crypto.randomUUID();
    approvalRetry.current = { comment: normalizedComment, fingerprint, key };
    setApprovalState('loading');
    setApprovalMessage('');
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/artifacts/approvals`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'idempotency-key': key,
          'if-match': `"${projectId}:${projectRowVersion}"`,
        },
        body: JSON.stringify({ sourceGraphVersion, documentHashes: hashes, comment: normalizedComment }),
      });
      const body = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        if (response.status === 409 || response.status === 412 || response.status === 422) approvalRetry.current = null;
        setApprovalState('error');
        setApprovalMessage(platformMessage(body) ?? 'Approval was not recorded. Review the exact hashes and retry.');
        return;
      }
      const parsed = PlatformArtifactApprovalResponseSchema.safeParse(body);
      if (!parsed.success) {
        setApprovalState('unknown');
        setApprovalMessage('The approval response could not be verified. Retry the exact rationale to resolve the result safely.');
        return;
      }
      approvalRetry.current = null;
      setApprovalState('success');
      setApprovalMessage('The exact three-document baseline was approved. Refreshing its recorded evidence.');
      router.refresh();
    } catch {
      setApprovalState('unknown');
      setApprovalMessage('The approval result is unknown. Retry the exact rationale so the same idempotency key is reused.');
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="artifact-baseline-actions">
      <button type="button" onClick={generate} disabled={generationState === 'loading' || approvalState === 'loading'} aria-busy={generationState === 'loading'}>
        {generationState === 'loading' ? 'Compiling exact baseline…' : artifacts.length === 3 ? 'Regenerate baseline versions' : 'Generate requirement baseline'}
      </button>
      <small>Compilation is deterministic and local to the platform service. Regeneration creates new immutable versions and makes any older approval stale.</small>
      {generationState === 'success' ? <p role="status">{generationMessage}</p> : null}
      {generationState === 'error' || generationState === 'unknown' ? <p role="alert">{generationMessage}</p> : null}
      {hashes !== null && approval === null ? <form onSubmit={(event) => { event.preventDefault(); void approve(); }}>
        <label htmlFor="artifact-approval-comment">Approval rationale</label>
        <textarea id="artifact-approval-comment" value={comment} minLength={10} maxLength={2_000} required disabled={approvalState === 'loading' || generationState === 'loading'} onChange={(event) => updateComment(event.target.value)} placeholder="Confirm why this exact source-grounded baseline is approved." />
        <div><button type="submit" disabled={approvalState === 'loading' || generationState === 'loading'} aria-busy={approvalState === 'loading'}>{approvalState === 'loading' ? 'Recording exact approval…' : 'Approve exact document hashes'}</button><small>{comment.length}/2,000</small></div>
        {approvalState === 'success' ? <p role="status">{approvalMessage}</p> : null}
        {approvalState === 'error' || approvalState === 'unknown' ? <p role="alert">{approvalMessage}</p> : null}
      </form> : null}
    </div>
  );
}
