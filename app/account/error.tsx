'use client';

export default function AccountError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="account-shell">
      <section className="account-card account-state" role="alert">
        <h1>Account access could not be loaded</h1>
        <p>The page encountered an unexpected error. No access decision was inferred.</p>
        <button type="button" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
