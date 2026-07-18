import type { RunMeta } from '../../src/domain/schemas';

export function Header({ run, onBack }: { run?: RunMeta; onBack?: () => void }) {
  const runtimeLabel = run?.mode === 'fixture'
    ? `${run.label} · ${run.providerName}`
    : run
      ? `${run.label} · ${run.providerName} · ${run.modelName}`
      : 'No analysis run yet';
  const label = run ? `${runtimeLabel} · ${run.outcome}` : runtimeLabel;

  return (
    <header className="product-header">
      <div>
        {onBack ? <button type="button" className="workspace-back" onClick={onBack}>← All projects</button> : null}
        <p className="eyebrow">AI Engineering Operating System</p>
        <h1 className="product-title">Axiom</h1>
        <p className="product-subtitle">
          Turn ambiguous business intent into approved decisions, governed artifacts,
          controlled implementation, and verifiable proof.
        </p>
        <div className="project-context" aria-label="current project">
          <span><b>Workspace:</b> Product Engineering</span>
          <span><b>Project:</b> NotifyFlow</span>
          <span className="badge">Preloaded sample</span>
        </div>
      </div>
      <span className="badge run-badge" aria-label="analysis mode">
        {label}{run?.completedAt ? ` · ${new Date(run.completedAt).toLocaleString()}` : ''}
      </span>
    </header>
  );
}

export function StageNav({ loaded, loading, answeredCount, questionCount, unlocked, approved, artifactStatus, codeStatus, codeApproved, verificationStatus, verificationOutcome, traceabilityReady, whyStatus, whyGrounding }: {
  loaded: boolean;
  loading: boolean;
  answeredCount: number;
  questionCount: number;
  unlocked: boolean;
  approved: boolean;
  artifactStatus: 'idle' | 'loading' | 'success' | 'error';
  codeStatus: 'idle' | 'loading' | 'success' | 'error';
  codeApproved: boolean;
  verificationStatus: 'idle' | 'loading' | 'success' | 'error';
  verificationOutcome?: 'passed' | 'failed';
  traceabilityReady: boolean;
  whyStatus: 'idle' | 'loading' | 'success' | 'error';
  whyGrounding?: 'HUMAN_APPROVED' | 'TOOL_VERIFIED' | 'UNKNOWN';
}) {
  const stages = [
    { label: 'Intent', href: '#intent', status: loading ? 'Analyzing' : loaded ? 'Captured' : 'Ready', state: loading ? 'active' : loaded ? 'complete' : 'ready' },
    { label: 'Requirements', href: '#requirements', status: loaded ? `${answeredCount}/${questionCount} clarified` : 'Awaiting intent', state: loaded ? 'active' : 'locked' },
    { label: 'Architecture', href: '#architecture', status: approved ? 'Approved' : unlocked ? 'Ready for decision' : 'Locked by blockers', state: approved ? 'complete' : unlocked ? 'active' : 'locked' },
    {
      label: 'Artifacts',
      href: '#artifacts',
      status: artifactStatus === 'loading' ? 'Compiling' : artifactStatus === 'success' ? 'Pack ready' : artifactStatus === 'error' ? 'Failed' : approved ? 'Ready' : 'Locked by ADR',
      state: artifactStatus === 'success' ? 'complete' : approved ? 'active' : 'locked',
    },
    {
      label: 'Build',
      href: '#build',
      status: codeStatus === 'loading' ? 'Generating' : codeStatus === 'error' ? 'Failed' : codeApproved ? 'Approved' : codeStatus === 'success' ? 'Awaiting approval' : artifactStatus === 'success' ? 'Ready' : 'Locked by artifacts',
      state: codeApproved ? 'complete' : artifactStatus === 'success' ? 'active' : 'locked',
    },
    {
      label: 'Verify',
      href: '#verify',
      status: verificationStatus === 'loading' ? 'Running fixed commands' : verificationStatus === 'error' ? 'Could not start' : verificationOutcome === 'passed' ? 'Evidence verified' : verificationOutcome === 'failed' ? 'Failed evidence recorded' : codeApproved ? 'Ready for verification' : 'Locked by build approval',
      state: verificationOutcome === 'passed' ? 'complete' : codeApproved ? 'active' : 'locked',
    },
    {
      label: 'Traceability',
      href: '#traceability',
      status: traceabilityReady ? 'Graph compiled' : 'Awaiting evidence',
      state: traceabilityReady ? 'complete' : 'locked',
    },
    {
      label: 'Why',
      href: '#why',
      status: whyStatus === 'loading' ? 'Traversing graph' : whyStatus === 'error' ? 'Question failed' : whyGrounding ? `${whyGrounding} answer` : traceabilityReady ? 'Ready for questions' : 'Awaiting evidence',
      state: whyGrounding ? 'complete' : traceabilityReady ? 'active' : 'locked',
    },
  ];

  return (
    <nav aria-label="Axiom product lifecycle" className="stage-nav">
      <ol>
        {stages.map((stage, index) => (
          <li key={stage.label} className={`stage-card stage-${stage.state}`}>
            <span className="stage-number" aria-hidden="true">{index + 1}</span>
            <div>
              {stage.href ? <a href={stage.href}><b>{stage.label}</b></a> : <b>{stage.label}</b>}
              <p className="muted text-sm">{stage.status}</p>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
