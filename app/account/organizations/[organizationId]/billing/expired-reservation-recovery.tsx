'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { PlatformExpiredReservationRecoverySchema } from '@/src/platform/contracts';

type RecoveryState = 'idle' | 'confirming' | 'releasing' | 'success' | 'error';
const integer = new Intl.NumberFormat('en-US');

export function ExpiredReservationRecovery({ organizationId, count, creditUnits }: { organizationId: string; count: number; creditUnits: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState<RecoveryState>('idle');
  const [message, setMessage] = useState('');

  async function release() {
    setState('releasing');
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/billing/reservations/recover-expired`, { method: 'POST' });
      const body: unknown = await response.json().catch(() => null);
      const parsed = PlatformExpiredReservationRecoverySchema.safeParse(body);
      if (!response.ok || !parsed.success) {
        setState('error');
        setMessage('Expired reservations were not confirmed as released. This operation is idempotent and can be retried safely.');
        return;
      }
      setState('success');
      setMessage(`${integer.format(parsed.data.releasedReservations)} reservations released ${integer.format(parsed.data.releasedCreditUnits)} credits.`);
      startTransition(() => router.refresh());
    } catch {
      setState('error');
      setMessage('The request was interrupted. The outcome is unknown; retrying safely releases only reservations that remain expired.');
    }
  }

  return (
    <section className="billing-expired" aria-labelledby="expired-reservations-heading">
      <div><h2 id="expired-reservations-heading">Expired reservations require recovery</h2><p>{integer.format(count)} reservations still hold {integer.format(creditUnits)} credits after expiry.</p></div>
      {state === 'idle' ? <button type="button" onClick={() => setState('confirming')}>Review release</button> : null}
      {state === 'confirming' ? <div className="billing-confirmation"><b>Confirm exact recovery</b><p>Release {integer.format(creditUnits)} reserved credits from {integer.format(count)} expired reservations. Immutable expiration ledger and audit evidence will be created. No measured provider usage will be changed.</p><div className="billing-policy-actions"><button type="button" onClick={() => void release()}>Release expired credits</button><button className="secondary" type="button" onClick={() => setState('idle')}>Cancel</button></div></div> : null}
      {state === 'releasing' ? <p role="status" aria-live="polite">Releasing expired reservations…</p> : null}
      {state === 'success' ? <p className="success" role="status">{message}</p> : null}
      {state === 'error' ? <p role="alert">{message} <button type="button" onClick={() => void release()}>Retry safely</button></p> : null}
    </section>
  );
}
