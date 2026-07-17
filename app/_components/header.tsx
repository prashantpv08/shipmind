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
        <h1 className="text-3xl font-black">Axiom — Clarification, Architecture, and Artifact Lab</h1>
        <p className="muted">NotifyFlow P0: grounded analysis → clarify blockers → decide → compile artifacts.</p>
      </div>
      <span className="badge" aria-label="analysis mode">
        {label}{run?.completedAt ? ` · ${new Date(run.completedAt).toLocaleString()}` : ''}
      </span>
    </header>
  );
}

export function StageNav({ loaded, loading, answeredCount, questionCount, unlocked, approved, artifactStatus }: {
  loaded: boolean;
  loading: boolean;
  answeredCount: number;
  questionCount: number;
  unlocked: boolean;
  approved: boolean;
  artifactStatus: 'idle' | 'loading' | 'success' | 'error';
}) {
  const stages = [
    { label: '1. Analyze', status: loading ? 'Loading' : loaded ? 'Complete' : 'Ready' },
    { label: '2. Clarify', status: loaded ? `${answeredCount}/${questionCount} answered` : 'Empty' },
    { label: '3. Decide', status: unlocked ? 'Unlocked' : 'Locked by blockers' },
    {
      label: '4. Compile',
      status: artifactStatus === 'loading'
        ? 'Compiling'
        : artifactStatus === 'success'
          ? 'Pack ready'
          : artifactStatus === 'error'
            ? 'Failed'
            : approved
              ? 'Ready'
              : 'Locked by ADR',
    },
  ];

  return (
    <nav aria-label="Axiom lifecycle" className="responsive-grid">
      {stages.map((stage) => (
        <div key={stage.label} className="card">
          <b>{stage.label}</b>
          <p className="muted text-sm">{stage.status}</p>
        </div>
      ))}
    </nav>
  );
}
