'use client';

import { useState } from 'react';

import { PlatformEngineeringPlanPreviewSchema, type PlatformEngineeringPlanPreview } from '@/src/platform/contracts';

type EngineeringPlanWorkflowProps = {
  organizationId: string;
  projectId: string;
  graphVersion: number;
  canGenerate: boolean;
  initialPlan: PlatformEngineeringPlanPreview | null;
};

type RequestState = 'idle' | 'loading' | 'success' | 'error';

function label(value: string) { return value.replaceAll('_', ' ').toLowerCase().replace(/^./u, (character) => character.toUpperCase()); }

export function EngineeringPlanWorkflow({ organizationId, projectId, graphVersion, canGenerate, initialPlan }: EngineeringPlanWorkflowProps) {
  const [plan, setPlan] = useState(initialPlan);
  const [tier, setTier] = useState<'ECONOMY' | 'BALANCED' | 'BEST'>('BALANCED');
  const [state, setState] = useState<RequestState>('idle');
  const [error, setError] = useState('');

  async function generate() {
    setState('loading');
    setError('');
    try {
      const response = await fetch(`/api/platform/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/engineering-plans`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': `engineering-plan-${crypto.randomUUID()}` },
        body: JSON.stringify({ sourceGraphVersion: graphVersion, tier }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = (body as { error?: { message?: unknown } } | null)?.error?.message;
        throw new Error(typeof message === 'string' ? message : 'Engineering Plan generation failed.');
      }
      const parsed = PlatformEngineeringPlanPreviewSchema.safeParse(body);
      if (!parsed.success) throw new Error('The platform returned an invalid Engineering Plan.');
      setPlan(parsed.data);
      setState('success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Engineering Plan generation failed.');
      setState('error');
    }
  }

  return <div className="engineering-plan-workflow">
    <section className="engineering-plan-control" aria-labelledby="engineering-plan-control-heading">
      <div><h2 id="engineering-plan-control-heading">Generate from the approved baseline</h2><p>Model output must pass the same schema, grounding, lifecycle coverage, and evidence-integrity gates before it is saved.</p></div>
      {canGenerate ? <div className="engineering-plan-actions"><label htmlFor="engineering-plan-tier">Quality tier</label><select id="engineering-plan-tier" value={tier} disabled={state === 'loading'} onChange={(event) => setTier(event.target.value as typeof tier)}><option value="ECONOMY">Economy</option><option value="BALANCED">Balanced</option><option value="BEST">Best</option></select><button type="button" className="solid-action" disabled={state === 'loading'} aria-busy={state === 'loading'} onClick={generate}>{state === 'loading' ? 'Generating and validating…' : plan ? 'Regenerate plan' : 'Generate Engineering Plan'}</button></div> : <p className="engineering-plan-readonly">Your role can inspect this plan but cannot generate a new version.</p>}
      {state === 'success' ? <p className="planning-success" role="status">A new validated draft is visible below. It remains AI suggested.</p> : null}
      {state === 'error' ? <p className="revision-error" role="alert"><b>Plan not generated.</b> {error}</p> : null}
    </section>
    {plan === null ? <section className="engineering-plan-empty"><h2>No Engineering Plan yet</h2><p>Approve the current requirement artifacts and architecture decision, then resolve critical gaps. Axiom will not fill missing evidence with guesses.</p></section> : <>
      <section className="engineering-plan-proof" aria-labelledby="engineering-plan-proof-heading"><div><span>{plan.status} · AI SUGGESTED</span><h2 id="engineering-plan-proof-heading">Deterministic plan quality</h2><p>{plan.plan.executiveSummary}</p></div><strong>{plan.qualityReport.passed ? 'PASSED' : 'FAILED'}</strong><dl><div><dt>Lifecycle domains</dt><dd>{plan.qualityReport.metrics.coveredDomainCount}/{plan.qualityReport.metrics.requiredDomainCount}</dd></div><div><dt>Grounded sources</dt><dd>{Math.round(plan.qualityReport.metrics.validSourceReferenceRate * 100)}%</dd></div><div><dt>Unsupported claims</dt><dd>{plan.qualityReport.metrics.prohibitedClaimCount}</dd></div><div><dt>Plan version</dt><dd>v{plan.version}</dd></div></dl><code>{plan.id} · {plan.contentHash}</code></section>
      {plan.provenance ? <section className="engineering-plan-provenance" aria-labelledby="engineering-plan-provenance-heading"><div><h2 id="engineering-plan-provenance-heading">Generation evidence</h2><p>{plan.provenance.workflowVersion} · {plan.provenance.promptVersion}</p></div><dl><div><dt>Provider</dt><dd>{label(plan.provenance.provider)}</dd></div><div><dt>Model</dt><dd><code>{plan.provenance.immutableModelId}</code></dd></div><div><dt>Tier</dt><dd>{label(plan.provenance.tier)}</dd></div><div><dt>Cost status</dt><dd>{plan.provenance.budget.status === 'NOT_APPLICABLE' ? 'Non-billable local fixture' : 'Reserved before generation'}</dd></div></dl></section> : null}
      <section aria-labelledby="engineering-recommendations-heading"><div className="engineering-plan-section-heading"><span>Full software delivery lifecycle</span><h2 id="engineering-recommendations-heading">What is good, what is not, and why</h2><p>Each domain includes the recommendation, trade-offs, rejected direction, reconsideration trigger, implementation action, and required proof.</p></div><ol className="engineering-recommendations">{plan.plan.recommendations.map((recommendation) => <li key={recommendation.id}><article><header><div><span>{label(recommendation.domain)}</span><h3>{recommendation.title}</h3><code>{recommendation.id}</code></div><strong>{label(recommendation.disposition)}</strong></header><p className="engineering-recommendation-lead">{recommendation.recommendation}</p><section><h4>Why</h4><p>{recommendation.rationale}</p></section><div className="engineering-plan-columns"><section><h4>Benefits</h4><ul>{recommendation.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul></section><section><h4>Trade-offs</h4><ul>{recommendation.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}</ul></section></div><section><h4>Risk and mitigation</h4><ul>{recommendation.risks.map((risk) => <li key={risk.risk}><b>{risk.impact}</b> — {risk.risk} <span>Mitigation: {risk.mitigation}</span></li>)}</ul></section><section><h4>Why not the alternative now?</h4>{recommendation.alternatives.map((alternative) => <div className="engineering-alternative" key={alternative.name}><b>{alternative.name}</b><p>{alternative.whyNotNow}</p><small>Reconsider when: {alternative.reconsiderWhen}</small></div>)}</section><div className="engineering-plan-columns"><section><h4>Next action</h4><ul>{recommendation.implementationActions.map((action) => <li key={action}>{action}</li>)}</ul></section><section><h4>How to verify</h4><p>{recommendation.verification.method}</p><small>Evidence required: {recommendation.verification.evidenceExpected}</small></section></div><footer><span>{recommendation.truthStatus}</span><code>Sources: {recommendation.sourceEntityIds.join(', ')}</code><code>References: {recommendation.referenceIds.join(', ')}</code></footer></article></li>)}</ol></section>
      <section className="engineering-next-gates" aria-labelledby="engineering-gates-heading"><div><span>Delivery controls</span><h2 id="engineering-gates-heading">Next gates and proof</h2></div><ol>{plan.plan.nextGates.map((gate) => <li key={gate.sequence}><strong>{gate.sequence}</strong><div><h3>{gate.title}</h3><p><b>Exit:</b> {gate.exitCriteria.join(' ')}</p><p><b>Proof:</b> {gate.evidenceRequired.join(' ')}</p></div></li>)}</ol></section>
      {plan.plan.unknowns.length ? <section className="engineering-plan-unknowns" aria-labelledby="engineering-unknowns-heading"><h2 id="engineering-unknowns-heading">Unknowns kept honest</h2><ul>{plan.plan.unknowns.map((unknown) => <li key={unknown.id}><b>{unknown.question}</b><p>{unknown.whyItMatters}</p><code>{unknown.id}</code></li>)}</ul></section> : null}
      <section className="engineering-plan-references" aria-labelledby="engineering-references-heading"><h2 id="engineering-references-heading">Controlled primary references</h2><p>Reference links come from Axiom’s versioned application catalog, not from model-generated URLs.</p><ul>{plan.references.map((reference) => <li key={reference.id}><a href={reference.url} target="_blank" rel="noreferrer">{reference.title}</a><span>{reference.authority} · {reference.versionLabel}</span></li>)}</ul></section>
    </>}
  </div>;
}
