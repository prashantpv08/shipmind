'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AnalysisRun } from '@/domain/schemas';
import { notifyFlowProject, notifyFlowSourceDocument } from '@/fixtures/notifyflow';
import { FixtureAnalysisProvider } from '@/providers/fixtureAnalysisProvider';

type Tab = 'requirements' | 'nfrs' | 'assumptions' | 'risks' | 'gaps';
const tabs: [Tab, string][] = [['requirements', 'Functional requirements'], ['nfrs', 'NFRs'], ['assumptions', 'Assumptions'], ['risks', 'Risks'], ['gaps', 'Missing decisions']];

export default function Home() {
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('requirements');
  const [spanId, setSpanId] = useState<string | null>(null);
  const provider = useMemo(() => new FixtureAnalysisProvider(), []);

  async function analyze() {
    setError('');
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    try {
      const next = await provider.analyze(notifyFlowProject.id, notifyFlowSourceDocument);
      setRun(next);
      setSpanId(next.requirements[0]?.sourceSpanIds[0] ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setRun(null);
    setError('');
    setTab('requirements');
    setSpanId(null);
  }

  const items = run ? tab === 'requirements' ? run.requirements : tab === 'nfrs' ? run.nonFunctionalRequirements : tab === 'assumptions' ? run.assumptions : tab === 'risks' ? run.risks : run.gaps : [];
  const selected = notifyFlowSourceDocument.spans.find((span) => span.id === spanId);

  return <main className="shell"><section className="hero"><div><div className="eyebrow">Axiom Day 1 vertical slice</div><h1>Turn ambiguous intent into grounded requirements.</h1><p>Select the built-in NotifyFlow project, analyze the original brief with a validated fixture provider, and inspect exact evidence without an API key.</p></div><div className="actions"><button className="btn primary" onClick={analyze} disabled={loading}>{loading ? 'Analyzing…' : 'Analyze Brief'}</button><button className="btn secondary" onClick={reset}>Reset demo</button></div></section><section className="grid"><aside className="card"><div className="eyebrow">Selected project</div><h2>{notifyFlowProject.name}</h2><p>{notifyFlowProject.objective}</p><h3>Original product brief</h3><div className="brief">{selected ? <Highlighted text={notifyFlowSourceDocument.content} start={selected.start} end={selected.end} /> : notifyFlowSourceDocument.content}</div>{selected && <div className="drawer" data-testid="evidence-drawer"><strong>Source evidence</strong><p><span className="pill grounded">EXACT SOURCE SPAN</span></p><p>“{selected.text}”</p><p>Offsets {selected.start}–{selected.end}</p></div>}</aside><section className="card">{loading && <div className="progress" role="status">Validating fixture output, checking source spans, and calculating deterministic readiness…</div>}{error && <div className="error">{error}</div>}{!run && !loading && <div className="empty"><h2>Analysis not started</h2><p>Click Analyze Brief to produce grounded findings from the NotifyFlow source document.</p></div>}{run && <><div className="score"><div className="dial" style={{ '--score': run.readinessScore.overall } as CSSProperties}>{run.readinessScore.overall}</div><div><div className="eyebrow">Implementation-readiness score</div><h2>{run.objective}</h2><p>This percentage is deterministic application logic, not model output.</p></div></div><div className="breakdown">{run.readinessScore.categories.map((category) => <div key={category.id}><strong>{category.label}: {category.score}</strong><div className="bar"><span style={{ width: `${category.score}%` }} /></div><small>{category.rationale}</small></div>)}</div><div className="tabs">{tabs.map(([id, label]) => <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>)}</div>{items.map((item) => <article className="finding" key={item.id}><h3>{item.title}</h3><p>{item.description}</p><div className="meta"><span className={`pill ${item.status === 'GROUNDED' ? 'grounded' : item.status === 'UNKNOWN' ? 'unknown' : 'inferred'}`}>{item.status}</span>{'severity' in item && <span className={`pill ${item.severity === 'BLOCKING' || item.severity === 'HIGH' ? 'danger' : ''}`}>{item.severity}</span>}<span className="pill">{item.provenance.label}</span></div>{item.sourceSpanIds.length ? item.sourceSpanIds.map((id) => <button className="evidence" key={id} onClick={() => setSpanId(id)}>Open supporting excerpt {id}</button>) : <p><span className="pill unknown">No exact source span — visibly inferred or unknown</span></p>}</article>)}</>}</section></section></main>;
}

function Highlighted({ text, start, end }: { text: string; start: number; end: number }) {
  return <>{text.slice(0, start)}<mark className="highlight">{text.slice(start, end)}</mark>{text.slice(end)}</>;
}
