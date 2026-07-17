export function Header() {
  const mode = process.env.NEXT_PUBLIC_AXIOM_AI_MODE === 'live' ? 'Live AI' : 'Demo fixture';

  return (
    <header className="flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-black">Axiom — Clarification and Architecture Decision Lab</h1>
        <p className="muted">NotifyFlow Day 2: grounded analysis → clarify blockers → decide → ADR.</p>
      </div>
      <span className="badge">{mode}</span>
    </header>
  );
}

export function StageNav({ loaded, answeredCount, questionCount, unlocked }: {
  loaded: boolean;
  answeredCount: number;
  questionCount: number;
  unlocked: boolean;
}) {
  const stages = [
    { label: '1. Analyze', status: loaded ? 'Complete' : 'Ready' },
    { label: '2. Clarify', status: `${answeredCount}/${questionCount} answered` },
    { label: '3. Decide', status: unlocked ? 'Unlocked' : 'Locked by blockers' },
  ];

  return (
    <nav className="grid grid-cols-3 gap-3">
      {stages.map((stage) => (
        <div key={stage.label} className="card">
          <b>{stage.label}</b>
          <p className="muted text-sm">{stage.status}</p>
        </div>
      ))}
    </nav>
  );
}
