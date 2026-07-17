import type { RunMeta } from '../../src/domain/schemas';

export function Header({ run }: { run?: RunMeta }) {
  const runtimeLabel = run?.mode === 'fixture'
    ? `${run.label} · ${run.providerName}`
    : run
      ? `${run.label} · ${run.providerName} · ${run.modelName}`
      : 'No analysis run yet';
  const label = run ? `${runtimeLabel} · ${run.outcome}` : runtimeLabel;

  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-3xl font-black">Axiom — Clarification and Architecture Decision Lab</h1>
        <p className="muted">NotifyFlow Day 2: grounded analysis → clarify blockers → decide → ADR.</p>
      </div>
      <span className="badge" aria-label="analysis mode">
        {label}{run?.completedAt ? ` · ${new Date(run.completedAt).toLocaleString()}` : ''}
      </span>
    </header>
  );
}

export function StageNav({ loaded, loading, answeredCount, questionCount, unlocked }: {
  loaded: boolean;
  loading: boolean;
  answeredCount: number;
  questionCount: number;
  unlocked: boolean;
}) {
  const stages = [
    { label: '1. Analyze', status: loading ? 'Loading' : loaded ? 'Complete' : 'Ready' },
    { label: '2. Clarify', status: loaded ? `${answeredCount}/${questionCount} answered` : 'Empty' },
    { label: '3. Decide', status: unlocked ? 'Unlocked' : 'Locked by blockers' },
  ];

  return (
    <nav aria-label="Day 2 lifecycle" className="grid gap-3 md:grid-cols-3">
      {stages.map((stage) => (
        <div key={stage.label} className="card">
          <b>{stage.label}</b>
          <p className="muted text-sm">{stage.status}</p>
        </div>
      ))}
    </nav>
  );
}
