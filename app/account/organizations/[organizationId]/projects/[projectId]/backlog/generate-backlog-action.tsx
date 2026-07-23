'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

type GenerationState = 'idle' | 'loading' | 'success' | 'blocked' | 'error' | 'unknown';

export function GenerateBacklogAction({ organizationId, projectId, sourceGraphVersion, hasPreview }: { organizationId: string; projectId: string; sourceGraphVersion: number; hasPreview: boolean }) {
  const router = useRouter();
  const retryKey = useRef<string | null>(null);
  const inFlight = useRef(false);
  const [state, setState] = useState<GenerationState>('idle');
  const [message, setMessage] = useState('');
  const [tier, setTier] = useState<'ECONOMY' | 'BALANCED' | 'BEST'>('BALANCED');

  async function generate() {
    if (inFlight.current) return;
    inFlight.current = true;
    const key = retryKey.current ?? crypto.randomUUID();
    retryKey.current = key;
    setState('loading');
    setMessage('');
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/work-item-generations`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'idempotency-key': key },
        body: JSON.stringify({ sourceGraphVersion, tier }),
      });
      const body = await response.json().catch(() => null) as { error?: { message?: unknown } } | null;
      if (!response.ok) {
        const platformMessage = typeof body?.error?.message === 'string' ? body.error.message : null;
        if (response.status === 422) {
          retryKey.current = null;
          setState('blocked');
          setMessage(platformMessage ?? 'The approved graph is not ready for backlog generation.');
        } else {
          setState('error');
          setMessage(response.status === 403 ? 'Your current role cannot generate a backlog.' : platformMessage ?? 'Backlog generation failed. The retry key is preserved for a safe retry.');
        }
        return;
      }
      retryKey.current = null;
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
      {state === 'blocked' || state === 'error' || state === 'unknown' ? <p role="alert">{message}</p> : null}
    </div>
  );
}
