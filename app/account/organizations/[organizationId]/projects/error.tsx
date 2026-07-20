'use client';

export default function OrganizationProjectsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="account-shell">
      <section className="account-card account-state" role="alert">
        <h1>Organization projects could not be loaded</h1>
        <p>The project page encountered an unexpected error. No project access was inferred.</p>
        <button type="button" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
