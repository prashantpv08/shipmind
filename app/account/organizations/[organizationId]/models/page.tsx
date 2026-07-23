import Link from 'next/link';

import { getOrganizationModelCatalog } from '@/src/platform/model-catalog';

export const dynamic = 'force-dynamic';

const tierLabels = [
  ['Economy', 'economyModelDefinitionId'],
  ['Balanced', 'balancedModelDefinitionId'],
  ['Best', 'bestModelDefinitionId'],
] as const;

function sentence(value: string): string {
  return value.toLowerCase().replaceAll('_', ' ');
}

export default async function OrganizationModelsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const state = await getOrganizationModelCatalog(organizationId);

  return (
    <main className="account-shell">
      <header className="account-topbar">
        <Link href="/account" aria-label="Return to account access"><span>A</span><b>Axiom</b></Link>
        <p>Model governance</p>
      </header>
      <section className="account-card model-catalog-card" aria-labelledby="model-catalog-heading">
        <span className="landing-kicker"><i /> Qualified routing only</span>
        <h1 id="model-catalog-heading">Models and routing policy</h1>
        <p>A provider appears here before it becomes usable. Execution remains disabled until its immutable model, data policy, pricing, region, and task-specific evaluation evidence are approved.</p>

        {state.status !== 'ready' ? (
          <div className="account-state" role={state.status === 'forbidden' || state.status === 'unavailable' ? 'alert' : undefined}>
            <h2>{state.status === 'unauthenticated' ? 'Authentication required' : state.status === 'forbidden' ? 'Model access denied' : state.status === 'not-found' ? 'Model policy is not provisioned' : 'Model catalog temporarily unavailable'}</h2>
            <p>{state.status === 'unavailable' ? state.message : state.status === 'not-found' ? 'Run the local model-policy provisioning command after migrations. No fallback model will be selected silently.' : 'Return to account access and choose an authorized organization.'}</p>
            <Link className="account-text-link" href={state.status === 'unavailable' ? `/account/organizations/${encodeURIComponent(organizationId)}/models` : '/account'}>{state.status === 'unavailable' ? 'Try again' : 'Return to account access'}</Link>
          </div>
        ) : null}

        {state.status === 'ready' ? (
          <div className="account-state model-catalog-state">
            <div className="project-access-heading">
              <div><h2>Organization policy</h2><p>{organizationId} · policy v{state.catalog.policy.rowVersion}</p></div>
              <Link className="account-text-link" href="/account">Change organization</Link>
            </div>

            <section className="model-tier-grid" aria-labelledby="routing-tiers-heading">
              <div className="model-section-heading"><h2 id="routing-tiers-heading">User-facing tiers</h2><p>Raw model selection remains an administrator capability. Every tier currently resolves to the safe local fixture.</p></div>
              {tierLabels.map(([label, field]) => {
                const modelId = state.catalog.policy[field];
                const model = state.catalog.models.find((candidate) => candidate.id === modelId);
                return <article key={label}><span>{label}</span><b>{model?.displayName ?? 'Policy target missing'}</b><code>{modelId}</code><small>{model ? `${sentence(model.executionStatus)} · ${sentence(model.evaluation.status)}` : 'The platform response is incomplete.'}</small></article>;
              })}
            </section>

            <section className="model-provider-section" aria-labelledby="providers-heading">
              <div className="model-section-heading"><h2 id="providers-heading">Provider lifecycle</h2><p>Disabled means Axiom cannot route or spend through that provider.</p></div>
              <div className="model-provider-grid">
                {state.catalog.providers.map((provider) => {
                  const providerModels = state.catalog.models.filter((model) => model.providerId === provider.id);
                  return (
                    <article key={provider.id} className={provider.executionStatus === 'ENABLED' ? 'enabled' : 'disabled'}>
                      <header><div><span>{provider.code}</span><h3>{provider.displayName}</h3></div><strong>{sentence(provider.executionStatus)}</strong></header>
                      <dl>
                        <div><dt>Lifecycle</dt><dd>{sentence(provider.lifecycleStatus)}</dd></div>
                        <div><dt>Data policy</dt><dd>{sentence(provider.dataPolicyStatus)}</dd></div>
                        <div><dt>Regions</dt><dd>{provider.allowedRegions.length > 0 ? provider.allowedRegions.join(', ') : 'not approved'}</dd></div>
                        <div><dt>Definitions</dt><dd>{providerModels.length}</dd></div>
                      </dl>
                      {providerModels.length === 0 ? <p>No immutable model definition is approved for this provider.</p> : providerModels.map((model) => <div className="model-definition" key={model.id}><b>{model.displayName}</b><code>{model.immutableModelId}</code><small>{model.pricing.status === 'NOT_APPLICABLE' ? 'Non-billable local fixture' : sentence(model.pricing.status)} · {sentence(model.evaluation.status)}</small></div>)}
                    </article>
                  );
                })}
              </div>
            </section>

            <div className="model-catalog-notice" role="status"><b>No paid provider calls are enabled</b><p>OpenAI and Groq are catalog candidates only. This screen does not configure credentials, change policy, or initiate generation.</p></div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

