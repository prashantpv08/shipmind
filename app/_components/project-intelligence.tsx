'use client';

import type { ClarificationQuestion, ProjectGap, ProjectReadiness, TechStackRecommendation } from '../../src/projects/schemas';

export function ProjectIntelligencePanel({
  readiness,
  gaps,
  questions,
  techStack,
  drafts,
  busy,
  onDraftChange,
  onAnswer,
}: {
  readiness?: ProjectReadiness;
  gaps: ProjectGap[];
  questions: ClarificationQuestion[];
  techStack: TechStackRecommendation[];
  drafts: Record<string, string>;
  busy: boolean;
  onDraftChange: (questionId: string, answer: string) => void;
  onAnswer: (question: ClarificationQuestion, answer?: string) => void;
}) {
  if (!readiness || gaps.length === 0) {
    return <div className="intelligence-stack"><section className="legacy-intelligence" role="status"><span className="status-pill amber">Legacy graph</span><div><h3>Project-intelligence upgrade required</h3><p>This saved graph predates structured gaps, deterministic readiness, clarification provenance, and technology recommendations. Its historical documents and approval remain visible, but Axiom does not infer that its missing review data is complete.</p></div></section></div>;
  }
  const openGaps = gaps.filter((gap) => gap.status === 'OPEN');
  const openQuestions = questions.filter((question) => question.status === 'OPEN');
  return <div className="intelligence-stack">
    <section className="readiness-card" aria-labelledby="readiness-heading">
      <div className="readiness-score" aria-label={`Project readiness ${readiness?.score ?? 0} out of 100`}>
        <strong>{readiness?.score ?? '—'}</strong><span>/100</span>
      </div>
      <div className="readiness-copy"><span className="step-kicker">Deterministic readiness</span><h3 id="readiness-heading">Architecture confidence starts with explicit decisions.</h3><p>{readiness?.openBlockerIds.length ? `${readiness.openBlockerIds.length} blocker${readiness.openBlockerIds.length === 1 ? '' : 's'} must be resolved before ARB approval.` : 'No P0 blocker remains. Review non-blocking gaps before committing to build.'}</p></div>
      <div className="readiness-breakdown">{readiness?.categories.map((category) => <div key={category.key}><span><b>{category.label}</b><small>{category.score}/{category.maximum}</small></span><div><i style={{ width: `${(category.score / category.maximum) * 100}%` }} /></div></div>)}</div>
    </section>

    <div className="intelligence-columns">
      <section className="gap-panel" aria-labelledby="gap-register-heading">
        <div className="panel-heading"><div><span className="step-kicker">Gap register</span><h3 id="gap-register-heading">{openGaps.length} unresolved decisions</h3></div><span className="status-pill amber">{gaps.filter((gap) => gap.severity === 'BLOCKER' && gap.status === 'OPEN').length} blockers</span></div>
        <div className="gap-list">{gaps.map((gap) => <article key={gap.id} className={gap.status === 'ANSWERED' ? 'resolved' : ''}><div><span className={`severity severity-${gap.severity.toLowerCase()}`}>{gap.severity}</span><small>{gap.id}</small></div><h4>{gap.title}</h4><p>{gap.description}</p><footer><span>{gap.status}</span><span>Affects {gap.affectedArtifacts.join(', ')}</span></footer></article>)}</div>
      </section>

      <section className="clarification-panel" aria-labelledby="clarification-heading">
        <div className="panel-heading"><div><span className="step-kicker">Clarification queue</span><h3 id="clarification-heading">Answer what changes the design</h3></div><span className="status-pill neutral">{openQuestions.length} open</span></div>
        {openQuestions.length ? <div className="question-list">{openQuestions.map((question, index) => <article key={question.id}>
          <header><span>{String(index + 1).padStart(2, '0')}</span><div><b>{question.question}</b><p>{question.whyItMatters}</p></div></header>
          <div className="answer-options">{question.options.map((option) => <button type="button" disabled={busy} key={option.id} onClick={() => onAnswer(question, option.value)}>{option.label}</button>)}</div>
          <div className="custom-answer"><input aria-label={`Custom answer for ${question.id}`} value={drafts[question.id] ?? ''} disabled={busy} onChange={(event) => onDraftChange(question.id, event.target.value)} placeholder="Or provide a precise custom answer…" /><button type="button" disabled={busy || !(drafts[question.id] ?? '').trim()} onClick={() => onAnswer(question)}>Apply answer</button></div>
          <small>Affects {question.affectedEntityIds.join(', ') || 'project-level architecture and artifacts'}</small>
        </article>)}</div> : <div className="panel-empty"><b>Clarification queue complete</b><p>Human answers are stored in the canonical graph with provenance.</p></div>}
      </section>
    </div>

    <section className="tech-stack-panel" aria-labelledby="tech-stack-heading">
      <div className="panel-heading"><div><span className="step-kicker">Technology direction</span><h3 id="tech-stack-heading">Recommended stack, with alternatives</h3></div><span className="status-pill amber">AI_SUGGESTED</span></div>
      <p className="panel-intro">Recommendations remain conditional on the unresolved workload, security, delivery, and integration decisions above.</p>
      <div className="tech-stack-grid">{techStack.map((item) => <article key={item.id}><span>{item.layer}</span><h4>{item.recommendation}</h4><p>{item.rationale}</p><small><b>Alternatives:</b> {item.alternatives.join(' · ')}</small></article>)}</div>
    </section>
  </div>;
}
