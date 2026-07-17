import { brief, initialGaps, requirements, spans } from '../../src/domain/day2';

export function AnalyzeSection({ loaded, highlight, onLoad, onHighlight }: {
  loaded: boolean;
  highlight: string;
  onLoad: () => void;
  onHighlight: (spanId: string) => void;
}) {
  return (
    <section className="card">
      <div className="flex gap-3">
        <button className="btn" onClick={onLoad}>{loaded ? 'Reset / Load NotifyFlow' : 'Load NotifyFlow + Analyze'}</button>
        <span className="badge">Fixture mode works without API key</span>
      </div>
      {loaded ? (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <h2 className="font-bold">Product brief</h2>
            <p className="leading-7">{brief}</p>
            <h3 className="mt-3 font-bold">Source spans</h3>
            {spans.map((span) => (
              <button
                key={span.id}
                onClick={() => onHighlight(span.id)}
                className={`my-1 block rounded p-2 text-left ${highlight === span.id ? 'mark' : 'bg-slate-100'}`}
              >
                {span.id}: {span.text}
              </button>
            ))}
          </div>
          <div>
            <h2 className="font-bold">Grounded findings</h2>
            {requirements.map((requirement) => (
              <button
                key={requirement.id}
                onClick={() => onHighlight(requirement.span)}
                className="my-1 block w-full rounded border p-2 text-left"
              >
                <b>{requirement.id}</b> <span className="badge">{requirement.truth}</span>
                <br />
                {requirement.text}
              </button>
            ))}
            <h3 className="mt-3 font-bold">Unknowns and inferred items</h3>
            {initialGaps.map((gap) => (
              <div key={gap.id} className="my-1 rounded border p-2">
                <b>{gap.id}</b> <span className="badge">UNKNOWN</span> <span className="badge">{gap.severity}</span>
                <br />
                {gap.title}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
