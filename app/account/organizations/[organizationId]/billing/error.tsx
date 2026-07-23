'use client';

export default function BillingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="account-shell"><section className="account-card billing-card account-state" role="alert"><span className="landing-kicker"><i /> Failure</span><h1>Budget view failed</h1><p>No usage or provider cost is being inferred. Retry the tenant-scoped read safely.</p><button type="button" onClick={reset}>Try again</button></section></main>;
}
