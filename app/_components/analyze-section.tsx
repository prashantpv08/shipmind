import type { AnalysisResult } from '../../src/domain/schemas';

export function AnalyzeSection({ brief, setBrief, analysis, highlight, loading, error, onAnalyze, onFixture, onHighlight, onReset }: {
  brief: string;
  setBrief: (value: string) => void;
  analysis: AnalysisResult | null;
  highlight: string;
  loading: boolean;
  error: string;
  onAnalyze: () => void;
  onFixture: () => void;
  onHighlight: (spanId: string) => void;
  onReset: () => void;
}) {
  const allRequirements = analysis
    ? [...analysis.functionalRequirements, ...analysis.nonFunctionalRequirements]
    : [];

  return (
    <section className="card" id="intent" aria-labelledby="intent-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Stage 1 · Intent</p>
          <h2 id="intent-heading" className="text-xl font-black">Capture the business problem</h2>
          <p className="muted">Axiom analyzes the submitted source; the sample is input to the system, not the product itself.</p>
        </div>
        <div className="project-context compact" aria-label="project metadata">
          <span><b>Project:</b> NotifyFlow</span>
          <span><b>Input:</b> Preloaded sample brief</span>
        </div>
      </div>

      <label className="mt-4 block font-bold" htmlFor="brief">Product brief</label>
      <textarea id="brief" className="mt-2 min-h-36 w-full rounded border p-3" minLength={50} maxLength={15000} value={brief} onChange={(event: { target: { value: string } }) => setBrief(event.target.value)} />
      <p className="muted text-sm">{brief.length}/15,000 characters · model credentials remain server-side</p>

      <div className="mt-3 flex flex-wrap gap-3">
        <button className="btn" type="button" disabled={loading} onClick={onAnalyze}>{loading ? 'Analyzing intent…' : 'Analyze intent'}</button>
        <button className="btn btn-secondary" type="button" disabled={loading} onClick={onFixture}>Run demo fixture instead</button>
        <button className="btn btn-secondary" type="button" disabled={loading} onClick={onReset}>Reset workspace</button>
      </div>

      {error ? <div role="alert" className="mt-3 rounded border border-red-200 bg-red-50 p-3"><b>Analysis failed.</b> {error}{analysis ? <p className="mt-2">The last valid analysis remains visible; no fixture was substituted.</p> : null}</div> : null}
      {!analysis && !loading && !error ? <p className="muted mt-3">No analysis yet. Submit the brief to build the canonical project graph.</p> : null}

      {analysis ? (
        <section className="mt-4" id="requirements" aria-labelledby="requirements-heading">
          <div className="section-divider" />
          <p className="eyebrow">Stage 2 · Requirements</p>
          <h2 id="requirements-heading" className="text-xl font-black">Grounded requirements and evidence</h2>
          <p className="muted">Goals, requirements, risks, assumptions, and gaps are validated before entering the project graph.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="font-bold">Source evidence</h3>
              <p className="muted">Exact quotations are verified by the server before offsets are derived.</p>
              {analysis.sourceSpans.map((span) => <button type="button" key={span.id} onClick={() => onHighlight(span.id)} className={`my-1 block rounded p-2 text-left ${highlight === span.id ? 'mark' : 'bg-slate-100'}`}>{span.id}: “{span.quote}” ({span.startOffset}-{span.endOffset})</button>)}
            </div>
            <div>
              <h3 className="font-bold">Structured findings</h3>
              {allRequirements.map((requirement) => <button type="button" key={requirement.id} onClick={() => onHighlight(requirement.sourceEvidence[0]?.spanId ?? '')} className="my-1 block w-full rounded border p-2 text-left"><b>{requirement.id}</b> <span className="badge">{requirement.truthStatus}</span><br />{requirement.text}</button>)}
              <h3 className="mt-3 font-bold">Inferences, assumptions, risks, and unknowns</h3>
              {[
                ...analysis.assumptions.map((item) => ({ id: item.id, label: item.truthStatus, text: item.text })),
                ...analysis.risks.map((item) => ({ id: item.id, label: item.truthStatus, text: item.title })),
                ...analysis.gaps.map((item) => ({ id: item.id, label: item.truthStatus, text: item.title })),
              ].map((item) => <div key={item.id} className="my-1 rounded border p-2"><b>{item.id}</b> <span className="badge">{item.label}</span><br />{item.text}</div>)}
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}
