'use client';

import { useState, type FormEvent } from 'react';
import type { TraceabilityContext, TraceabilityGraph, WhyAnswer } from '../../src/traceability/schemas';
import { suggestedWhyQuestions } from '../../src/traceability/why';

export type WhyStatus = 'idle' | 'loading' | 'success' | 'error';

const sectionLabels: Array<{ key: keyof WhyAnswer['sections']; label: string }> = [
  { key: 'why', label: 'Why' },
  { key: 'whyNot', label: 'Why not' },
  { key: 'proof', label: 'Proof' },
  { key: 'reconsiderWhen', label: 'Reconsider when' },
  { key: 'unknowns', label: 'Unknowns' },
];

function metricLabel(key: string) {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (value) => value.toUpperCase());
}

export function WhyExplorerSection({ context, graph, answer, status, error, onAsk }: {
  context: TraceabilityContext | null;
  graph: TraceabilityGraph | null;
  answer: WhyAnswer | null;
  status: WhyStatus;
  error: string;
  onAsk: (question: string) => void;
}) {
  const [question, setQuestion] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (value) onAsk(value);
  }

  return (
    <section className="card why-stage" id="why" aria-labelledby="why-heading">
      <div className="why-heading-row">
        <div>
          <p className="eyebrow">Stage 8 · Explainability</p>
          <h2 id="why-heading" className="text-xl font-black">Ask Why, Why Not, Proof, or Reconsider.</h2>
          <p className="muted">Answers come from the current project graph and executed evidence—not general model memory.</p>
        </div>
        {answer ? <span className={`why-grounding ${answer.grounding.toLowerCase()}`}>{answer.grounding}</span> : null}
      </div>

      {!context || !graph ? <p className="why-lock"><b>Locked.</b> Complete verification to unlock grounded project questions.</p> : (
        <div className="why-layout">
          <div className="why-prompts">
            <span className="mini-kicker">Approved demo questions</span>
            <div>
              {suggestedWhyQuestions.map((suggestion, index) => (
                <button key={suggestion} type="button" disabled={status === 'loading'} onClick={() => { setQuestion(suggestion); onAsk(suggestion); }}>
                  <span>0{index + 1}</span><b>{suggestion}</b><i>→</i>
                </button>
              ))}
            </div>
            <form onSubmit={submit}>
              <label htmlFor="why-question">Ask about this project</label>
              <div><input id="why-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g. What proves NFR-COST-001?" minLength={3} maxLength={500} /><button type="submit" disabled={status === 'loading' || question.trim().length < 3}>{status === 'loading' ? 'Resolving…' : 'Ask Axiom'}</button></div>
              <small>Free text is classified and resolved only against current graph entities.</small>
            </form>
          </div>

          <div className="why-answer" aria-live="polite">
            {status === 'idle' && !answer ? <div className="why-empty"><span>✦</span><h3>Choose a grounded question.</h3><p>Axiom will show the approved reasoning, evidence boundary, entity citations, and any unresolved proof.</p></div> : null}
            {status === 'loading' ? <div className="why-loading" role="status"><span /><div><b>Traversing the project graph</b><p>Classifying the question and resolving only stored entities and executed evidence.</p></div></div> : null}
            {status === 'error' ? <p className="why-error" role="alert"><b>Question could not be resolved.</b> {error}{answer ? ' The last grounded answer remains visible.' : ''}</p> : null}
            {answer ? (
              <article className="why-answer-card">
                <header><span>{answer.answerType}</span><h3>{answer.headline}</h3><p>{answer.question}</p></header>
                <div className="why-sections">
                  {sectionLabels.map((section) => answer.sections[section.key].length ? (
                    <section key={section.key} className={section.key === 'unknowns' ? 'unknowns' : ''}>
                      <h4>{section.label}</h4>
                      <ul>{answer.sections[section.key].map((item) => <li key={item}>{item}</li>)}</ul>
                    </section>
                  ) : null)}
                </div>

                {answer.evidenceIds.length ? <div className="why-evidence"><h4>Executed evidence</h4>{answer.evidenceIds.map((evidenceId) => {
                  const evidence = context.verification.evidence.find((item) => item.id === evidenceId);
                  if (!evidence) return null;
                  return <article key={evidence.id}><header><b>{evidence.id}</b><span>{evidence.truthStatus}</span></header><p>{evidence.claim}</p><dl>{Object.entries(evidence.measurements).filter(([, value]) => value !== null).map(([key, value]) => <div key={key}><dt>{metricLabel(key)}</dt><dd>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</dd></div>)}</dl></article>;
                })}</div> : null}

                <footer>
                  <div><span className="mini-kicker">Cited graph entities</span><div>{answer.citedEntityIds.map((id) => {
                    const node = graph.nodes.find((item) => item.id === id);
                    return <span key={id} title={node?.label}>{id}<small>{node?.truthStatus ?? 'GRAPH ENTITY'}</small></span>;
                  })}</div></div>
                  <p>{answer.evidenceIds.length ? `${answer.evidenceIds.length} executed evidence record${answer.evidenceIds.length === 1 ? '' : 's'} cited.` : 'No execution evidence is being used as proof for this answer.'}</p>
                </footer>
              </article>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
