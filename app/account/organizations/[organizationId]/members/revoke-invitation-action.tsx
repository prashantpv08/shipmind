'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { PlatformInvitation } from '@/src/platform/contracts';

export function RevokeInvitationAction({ organizationId, invitation }: { organizationId: string; invitation: Pick<PlatformInvitation, 'id' | 'email' | 'rowVersion'> }) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [state, setState] = useState<'idle' | 'confirming' | 'loading' | 'error' | 'stale'>('idle');
  const [message, setMessage] = useState('');
  async function revoke() {
    if (inFlight.current) return;
    inFlight.current = true; setState('loading'); setMessage('');
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/invitations/${encodeURIComponent(invitation.id)}/revoke`, { method: 'POST', headers: { accept: 'application/json', 'if-match': `"${invitation.id}:${invitation.rowVersion}"` } });
      if (!response.ok) {
        if (response.status === 409 || response.status === 412) { setState('stale'); setMessage('The invitation changed. Refresh before deciding again.'); }
        else { setState('error'); setMessage('Revocation failed. No successful change is being claimed.'); }
        return;
      }
      router.refresh();
    } catch { setState('stale'); setMessage('The result is unknown. Refresh before retrying.'); }
    finally { inFlight.current = false; }
  }
  if (state === 'confirming') return <div className="invitation-confirm"><p>Revoke the pending invitation for <b>{invitation.email}</b>?</p><button type="button" onClick={revoke}>Confirm revoke</button><button type="button" onClick={() => setState('idle')}>Cancel</button></div>;
  return <div className="invitation-action">{state === 'idle' ? <button type="button" onClick={() => setState('confirming')}>Revoke</button> : null}{state === 'loading' ? <button type="button" disabled aria-busy="true">Revoking…</button> : null}{state === 'error' ? <p role="alert">{message}</p> : null}{state === 'stale' ? <><p role="alert">{message}</p><button type="button" onClick={() => router.refresh()}>Refresh</button></> : null}</div>;
}
