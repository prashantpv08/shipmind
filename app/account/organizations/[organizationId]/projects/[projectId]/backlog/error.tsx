'use client';

export default function BacklogError({ reset }: { reset: () => void }) {
  return <main className="account-shell"><section className="account-card backlog-review-card" role="alert"><span className="landing-kicker"><i /> Failure</span><h1>Backlog preview failed</h1><p>No draft or publication is being claimed. Retry the read safely.</p><button type="button" onClick={reset}>Try again</button></section></main>;
}
