import type { ReadinessScore, ResolvedGaps } from './types';

export function ReadinessSection({ before, score, gaps }: {
  before: number;
  score: ReadinessScore;
  gaps: ResolvedGaps;
}) {
  const resolved = gaps.filter((gap) => gap.resolved).map((gap) => gap.id).join(', ') || 'None yet';
  const remaining = score.unknowns.map((gap) => gap.id).join(', ') || 'None blocking';

  return (
    <section className="card">
      <h2 className="text-xl font-black">Readiness: {before} → {score.total}</h2>
      <div className="score-grid my-3">
        {score.categories.map((category) => (
          <div key={category.label} className="rounded bg-slate-100 p-2">
            <b className="text-sm">{category.label}</b>
            <p>{category.score}/{category.weight}</p>
            <small>{category.items[0]}</small>
          </div>
        ))}
      </div>
      <p><b>Resolved gaps:</b> {resolved}</p>
      <p><b>Remaining unknowns:</b> {remaining}</p>
    </section>
  );
}
