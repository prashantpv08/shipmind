'use client';

export default function BusinessContextError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="account-shell"><section className="account-card account-state" role="alert"><h1>Business Context could not be loaded</h1><p>No business or experience decision was inferred from this failure.</p><button type="button" onClick={reset}>Try again</button></section></main>;
}
