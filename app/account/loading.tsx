export default function AccountLoading() {
  return (
    <main className="account-shell">
      <section className="account-card account-state" role="status" aria-live="polite">
        <h1>Loading account access…</h1>
        <p>Axiom is checking the current session and organization memberships.</p>
      </section>
    </main>
  );
}
