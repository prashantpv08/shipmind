'use client';

export default function ModelsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="account-shell"><section className="account-card model-catalog-card account-state" role="alert"><span className="landing-kicker"><i /> Failure</span><h1>Model catalog failed</h1><p>No model availability or qualification is being inferred. Retry the tenant-scoped read safely.</p><button type="button" onClick={reset}>Try again</button></section></main>;
}

