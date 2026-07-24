import type { PlatformArchitectureBaseline } from '@/src/platform/contracts';

interface ArchitectureComparisonProps {
  baseline: PlatformArchitectureBaseline;
}

export function ArchitectureComparison({ baseline }: ArchitectureComparisonProps) {
  const generation = baseline.generation;
  if (generation === null) return <div className="backlog-empty"><h3>No commercial architecture comparison yet</h3><p>Generate three immutable options after the exact current requirement baseline is approved.</p></div>;
  return <>
    <div className="architecture-generation-proof"><b>Generation v{generation.version}</b><code>{generation.id} · {generation.contentHash}</code><span>{generation.compilerVersion} · graph v{generation.graphVersion}</span><p>{generation.recommendationBasis}</p></div>
    <ol className="architecture-options">{generation.options.map((option) => <li key={`${generation.id}:${option.id}`} className={option.id === generation.recommendedOptionId ? 'recommended' : undefined}>
      <article>
        <header><div><span>{option.profile}{option.id === generation.recommendedOptionId ? ' · AI RECOMMENDED' : ''}</span><h3>{option.name}</h3><code>{option.id}<br />{option.sha256}</code></div><strong>{option.truthStatus.replaceAll('_', ' ')}</strong></header>
        <p>{option.summary}</p>
        <section><h4>Deployment model</h4><p>{option.deploymentModel}</p></section>
        <section><h4>Components</h4><dl>{option.components.map((component) => <div key={component.name}><dt>{component.name}</dt><dd>{component.responsibility}</dd></div>)}</dl></section>
        <section><h4>Primary data flow</h4><ol>{option.dataFlows.map((flow) => <li key={flow}>{flow}</li>)}</ol></section>
        <div className="architecture-columns"><section><h4>Why</h4><ul>{option.why.map((reason) => <li key={reason}>{reason}</li>)}</ul></section><section><h4>Why not</h4><ul>{option.whyNot.map((reason) => <li key={reason}>{reason}</li>)}</ul></section></div>
        <div className="architecture-columns"><section><h4>Assumptions</h4><ul>{option.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul></section><section><h4>Risks</h4><ul>{option.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul></section></div>
        <section><h4>Failure modes and mitigations</h4><dl>{option.failureModes.map((mode) => <div key={mode.failure}><dt>{mode.failure}</dt><dd>{mode.mitigation}</dd></div>)}</dl></section>
        <section><h4>Technologies</h4><ul>{option.technologies.map((technology) => <li key={technology}>{technology}</li>)}</ul></section>
        <section className="architecture-cost"><h4>Estimated cost</h4><strong>{option.estimatedCost.range}</strong><span>{option.estimatedCost.truthStatus}</span><p>{option.estimatedCost.basis}</p></section>
        <section><h4>Reconsideration triggers</h4><dl>{option.reconsiderationTriggers.map((trigger) => <div key={trigger.metric}><dt>{trigger.metric}</dt><dd>{trigger.condition}</dd></div>)}</dl></section>
        <section><h4>Deterministic score rationale</h4><table><thead><tr><th>Dimension</th><th>Score</th><th>Rationale</th></tr></thead><tbody>{Object.entries(option.scoreBreakdown).map(([dimension, score]) => <tr key={dimension}><th>{dimension.replaceAll(/([A-Z])/g, ' $1')}</th><td>{score.score}/5</td><td>{score.rationale}</td></tr>)}</tbody></table></section>
        <footer><span>Grounded entities</span><code>{option.sourceEntityIds.length ? option.sourceEntityIds.join(', ') : 'None recorded'}</code></footer>
      </article>
    </li>)}</ol>
    {baseline.decision ? <section className="architecture-decision-record" aria-labelledby="architecture-decision-heading"><header><div><h3 id="architecture-decision-heading">Recorded architecture decision</h3><p>{baseline.decision.truthStatus.replaceAll('_', ' ')}</p></div><strong>APPROVED</strong></header><dl><div><dt>Selected option</dt><dd><code>{baseline.decision.selectedOptionId}</code></dd></div><div><dt>Exact option hash</dt><dd><code>{baseline.decision.selectedOptionHash}</code></dd></div><div><dt>Decision</dt><dd><code>{baseline.decision.id} · v{baseline.decision.version}</code></dd></div></dl><p>{baseline.decision.comment}</p><small>{baseline.decision.approvedByUserId} · {new Date(baseline.decision.approvedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</small></section> : <div className="backlog-notice"><b>Human decision required</b><p>The recommendation remains AI_SUGGESTED. Ticket generation stays closed until an authorized user approves one exact option.</p></div>}
    {baseline.artifacts.length ? <section className="architecture-artifacts" aria-labelledby="architecture-artifacts-heading"><h3 id="architecture-artifacts-heading">Deterministic approved views</h3><p>These ADR and HLD views were compiled only after the exact option approval.</p><ol>{baseline.artifacts.map((artifact) => <li key={`${artifact.id}:${artifact.version}`}><details><summary><span>{artifact.title}</span><code>{artifact.type.toUpperCase()} · v{artifact.version} · {artifact.sha256}</code></summary><pre>{artifact.content}</pre><small>{artifact.truthStatus.replaceAll('_', ' ')} · {artifact.provenance.compilerVersion} · {artifact.provenance.decisionId}</small></details></li>)}</ol></section> : null}
  </>;
}
