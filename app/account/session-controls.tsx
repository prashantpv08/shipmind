'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type SessionControlsProps = {
  action: 'local-sign-in' | 'sign-out';
};

export function SessionControls({ action }: SessionControlsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const signingIn = action === 'local-sign-in';

  async function updateSession() {
    setStatus('loading');

    try {
      const response = await fetch(signingIn ? '/api/auth/local-session' : '/api/auth/session', {
        method: signingIn ? 'POST' : 'DELETE',
        headers: { accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Session update failed.');
      }

      setStatus('success');
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="account-session-action">
      <button type="button" onClick={updateSession} disabled={status === 'loading'} aria-busy={status === 'loading'}>
        {status === 'loading' ? 'Updating session…' : signingIn ? 'Connect local session' : 'Sign out'}
      </button>
      {status === 'success' ? <p role="status">Session updated.</p> : null}
      {status === 'error' ? <p role="alert">The session could not be updated. Check the local platform setup and try again.</p> : null}
    </div>
  );
}
