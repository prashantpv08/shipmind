import Link from 'next/link';

import { getOrganizationBilling } from '@/src/platform/billing';

export const dynamic = 'force-dynamic';

const integer = new Intl.NumberFormat('en-US');

function date(value: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

function money(micros: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 6 })
    .format(micros / 1_000_000);
}

export default async function OrganizationBillingPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const state = await getOrganizationBilling(organizationId);
  const accountHref = '/account';

  return (
    <main className="account-shell">
      <header className="account-topbar">
        <Link href={accountHref} aria-label="Return to account access"><span>A</span><b>Axiom</b></Link>
        <p>Cost governance</p>
      </header>
      <section className="account-card billing-card" aria-labelledby="billing-heading">
        <span className="landing-kicker"><i /> Budget boundary</span>
        <h1 id="billing-heading">Plan and AI usage</h1>
        <p>Product credits are reserved before chargeable work. Reconciliation retains measured provider usage and effective cost without changing the provider evidence.</p>

        {state.status !== 'ready' ? (
          <div className="account-state" role={state.status === 'forbidden' || state.status === 'unavailable' ? 'alert' : undefined}>
            <h2>{state.status === 'unauthenticated' ? 'Authentication required' : state.status === 'forbidden' ? 'Billing access denied' : state.status === 'not-found' ? 'Billing is not provisioned' : 'Budget temporarily unavailable'}</h2>
            <p>{state.status === 'unavailable' ? state.message : state.status === 'forbidden' ? 'Only organization owners and administrators can read this cost view.' : 'Return to account access and choose an authorized organization.'}</p>
            <Link className="account-text-link" href={state.status === 'unavailable' ? `/account/organizations/${encodeURIComponent(organizationId)}/billing` : accountHref}>{state.status === 'unavailable' ? 'Try again' : 'Return to account access'}</Link>
          </div>
        ) : null}

        {state.status === 'ready' ? (
          <div className="account-state">
            <div className="project-access-heading">
              <div><h2>{state.overview.plan.name}</h2><p>{organizationId} · {state.overview.subscription.status.replaceAll('_', ' ')}</p></div>
              <Link className="account-text-link" href={accountHref}>Change organization</Link>
            </div>

            <div className={`billing-alert billing-alert-${state.overview.balance.status.toLowerCase()}`} role="status">
              <b>{state.overview.balance.status === 'AVAILABLE' ? 'Budget available' : state.overview.balance.status === 'APPROACHING' ? 'Budget threshold reached' : 'Budget exhausted'}</b>
              <p>{state.overview.balance.status === 'AVAILABLE' ? `${state.overview.balance.committedPercent}% of this period’s credits are consumed or reserved.` : state.overview.balance.status === 'APPROACHING' ? `Committed usage has crossed the ${state.overview.balance.alertThresholdPercent}% alert threshold. Review active reservations before starting large runs.` : 'Chargeable AI work must remain blocked until a new approved balance is available.'}</p>
            </div>

            <dl className="billing-metrics">
              <div><dt>Remaining</dt><dd>{integer.format(state.overview.balance.remainingCreditUnits)}</dd><small>product credits</small></div>
              <div><dt>Consumed</dt><dd>{integer.format(state.overview.balance.consumedCreditUnits)}</dd><small>reconciled</small></div>
              <div><dt>Reserved</dt><dd>{integer.format(state.overview.balance.reservedCreditUnits)}</dd><small>approved, not final</small></div>
              <div><dt>Allocated</dt><dd>{integer.format(state.overview.balance.allocatedCreditUnits)}</dd><small>this period</small></div>
            </dl>

            <dl className="billing-details">
              <div><dt>Billing period</dt><dd>{date(state.overview.subscription.billingPeriodStart)} – {date(state.overview.subscription.billingPeriodEnd)}</dd></div>
              <div><dt>AI entitlement</dt><dd>{state.overview.entitlements.aiUsageEnabled ? 'Enabled' : 'Disabled'}</dd></div>
              <div><dt>Per-request ceiling</dt><dd>{integer.format(state.overview.entitlements.maxCreditsPerRequest)} credits</dd></div>
              <div><dt>Ledger currency</dt><dd>{state.overview.plan.currency}</dd></div>
            </dl>

            <section className="billing-ledger" aria-labelledby="usage-ledger-heading">
              <div><h2 id="usage-ledger-heading">Recent usage evidence</h2><p>Newest immutable reservation and reconciliation events.</p></div>
              {state.overview.recentUsage.length === 0 ? (
                <div className="billing-empty"><b>No chargeable usage recorded</b><p>The local fixture ticket generator is non-billable and does not create fake cost entries.</p></div>
              ) : (
                <div className="billing-table-wrap"><table><thead><tr><th>Event</th><th>Workflow</th><th>Credits</th><th>Measured tokens</th><th>Provider cost</th><th>Outcome</th></tr></thead><tbody>
                  {state.overview.recentUsage.map((entry) => (
                    <tr key={entry.id}>
                      <td><b>{entry.eventType}</b><small>{date(entry.occurredAt)}</small></td>
                      <td>{entry.workflow}<small>{entry.provider} · {entry.model}</small></td>
                      <td>{entry.eventType === 'RESERVATION' ? `+${integer.format(entry.reservedCreditUnits)} reserved` : `${integer.format(entry.chargedCreditUnits)} charged`}<small>{entry.releasedCreditUnits > 0 ? `${integer.format(entry.releasedCreditUnits)} released` : 'No release'}</small></td>
                      <td>{integer.format(entry.inputTokens + entry.outputTokens)}<small>{integer.format(entry.inputTokens)} in · {integer.format(entry.outputTokens)} out</small></td>
                      <td>{money(entry.providerCostMicros + entry.toolChargeMicros, entry.currency)}<small>{entry.retryCount} retries · {entry.cacheHit ? 'cache hit' : 'no cache hit'}</small></td>
                      <td>{entry.outcome ?? 'Pending'}<small>{entry.fallbackUsed ? 'fallback used' : 'no fallback'}</small></td>
                    </tr>
                  ))}
                </tbody></table></div>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
