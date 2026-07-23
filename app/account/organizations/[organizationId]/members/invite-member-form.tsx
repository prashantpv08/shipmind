'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { PlatformInvitationRole } from '@/src/platform/contracts';

const roles: readonly PlatformInvitationRole[] = ['ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT', 'DEVELOPER', 'REVIEWER', 'VIEWER'];

export function InviteMemberForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const retryKey = useRef<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PlatformInvitationRole>('VIEWER');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [acceptanceToken, setAcceptanceToken] = useState<string | null>(null);

  function resetAttempt() { retryKey.current = null; setStatus('idle'); setMessage(''); setAcceptanceToken(null); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading'); setMessage(''); setAcceptanceToken(null);
    const key = retryKey.current ?? crypto.randomUUID();
    retryKey.current = key;
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/invitations`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'idempotency-key': key },
        body: JSON.stringify({ email, role }),
      });
      const body = await response.json().catch(() => null) as { delivery?: { acceptanceToken?: unknown } } | null;
      if (!response.ok) {
        setStatus('error');
        setMessage(response.status === 409 ? 'This person is already a member, or has a conflicting pending invitation.' : response.status === 403 ? 'Your current role cannot invite members.' : response.status === 503 ? 'Local invitation delivery is disabled. Configure it on the platform before retrying.' : 'The invitation was not created. Your input and retry key are preserved.');
        return;
      }
      if (typeof body?.delivery?.acceptanceToken !== 'string') throw new Error('Invalid response');
      setAcceptanceToken(body.delivery.acceptanceToken);
      setStatus('success');
      setMessage('Invitation created. Copy this local acceptance token now; it is intentionally not stored in plaintext.');
      setEmail(''); retryKey.current = null; router.refresh();
    } catch {
      setStatus('error'); setMessage('The result is unknown. Retry without changing the input so the same idempotency key is used.');
    }
  }

  return (
    <form className="governance-invite-form" onSubmit={submit}>
      <div><label htmlFor="invite-email">Email</label><input id="invite-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); resetAttempt(); }} maxLength={320} required disabled={status === 'loading'} /></div>
      <div><label htmlFor="invite-role">Role</label><select id="invite-role" value={role} onChange={(event) => { setRole(event.target.value as PlatformInvitationRole); resetAttempt(); }} disabled={status === 'loading'}>{roles.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></div>
      <button type="submit" disabled={status === 'loading'} aria-busy={status === 'loading'}>{status === 'loading' ? 'Creating…' : 'Create invitation'}</button>
      {status === 'success' ? <div className="invitation-token" role="status"><p>{message}</p><code>{acceptanceToken}</code><p>Share it only through a trusted local channel. Production email delivery is not implemented yet.</p></div> : null}
      {status === 'error' ? <p role="alert">{message}</p> : null}
    </form>
  );
}
