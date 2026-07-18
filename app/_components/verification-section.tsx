'use client';

import type { CodeApproval } from '../../src/codegen/schemas';
import type { VerificationReport, VerificationRun } from '../../src/runner/schemas';
import { ActionLabel } from './action-label';

export type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

const labels: Record<VerificationRun['commandId'], string> = {
  build: 'TypeScript build',
  unit: 'Unit tests',
  api: 'API tests',
  coverage: 'V8 coverage',
};

function formatMetric(key: string) {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (value) => value.toUpperCase());
}

function metricValue(key: string, value: string | number | boolean | null) {
  if (value === null) return 'Not parsed';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number' && ['lines', 'statements', 'functions', 'branches'].includes(key)) return `${value}%`;
  return String(value);
}

export function VerificationSection({ approval, report, status, error, onRun }: {
  approval: CodeApproval | null;
  report: VerificationReport | null;
  status: VerificationStatus;
  error: string;
  onRun: () => void;
}) {
  return (
    <section className="card verification-stage" id="verify" aria-labelledby="verification-heading">
      <div className="verification-heading-row">
        <div>
          <p className="eyebrow">Stage 6 · Proof</p>
          <h2 id="verification-heading" className="text-xl font-black">Real verification evidence</h2>
          <p className="muted">Axiom runs four repository-defined commands in the controlled workspace. Secrets are stripped, output is bounded, and failures remain failures.</p>
        </div>
        <button type="button" className="btn" aria-busy={status === 'loading'} disabled={!approval || status === 'loading'} onClick={onRun}>
          <ActionLabel loading={status === 'loading'} loadingText="Running fixed verification…">{report ? 'Run verification again' : 'Run fixed verification'}</ActionLabel>
        </button>
      </div>

      {!approval ? <p className="verification-lock"><b>Locked.</b> Inspect and approve the generated code first.</p> : null}
      {approval && status === 'idle' && !report ? <p className="verification-idle">Approval recorded. Build, unit, API, and coverage commands are ready; none has run yet.</p> : null}
      {status === 'loading' ? <div className="verification-running" role="status"><span /><div><b>Executing controlled checks</b><p>Build → unit → API → coverage. This is real command execution, not estimated progress.</p></div></div> : null}
      {status === 'error' ? <p className="verification-error" role="alert"><b>Verification could not start.</b> {error}{report ? ' The last completed report remains visible.' : ''}</p> : null}

      {report ? <div className="verification-results">
        <div className={`verification-summary ${report.overallStatus}`} role="status">
          <span>{report.overallStatus === 'passed' ? '✓' : '!'}</span>
          <div>
            <b>{report.overallStatus === 'passed' ? 'All fixed commands passed' : 'One or more commands failed'}</b>
            <p>{report.truthStatus} · generation {report.generationId} · completed {new Date(report.completedAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="verification-run-grid">
          {report.runs.map((run) => <article key={run.id} className={`verification-run-card ${run.status}`} aria-label={`${labels[run.commandId]} verification result`}>
            <header><div><span>{run.commandId.toUpperCase()}</span><h3>{labels[run.commandId]}</h3></div><i>{run.truthStatus}</i></header>
            <code>{run.command}</code>
            <div className="verification-run-facts"><span><small>Duration</small><b>{(run.durationMs / 1000).toFixed(2)}s</b></span><span><small>Exit code</small><b>{run.exitCode ?? '—'}</b></span><span><small>Timed out</small><b>{run.timedOut ? 'Yes' : 'No'}</b></span></div>
            <dl>{Object.entries(run.metrics).filter(([, value]) => value !== null).map(([key, value]) => <div key={key}><dt>{formatMetric(key)}</dt><dd>{metricValue(key, value)}</dd></div>)}</dl>
            <details><summary>View bounded tool output</summary><pre>{run.rawOutputExcerpt || 'Command completed without textual output.'}</pre></details>
          </article>)}
        </div>

        <div className="coverage-matrix">
          <div><span className="mini-kicker">Requirement coverage</span><h3>Proof stays linked—or remains unknown.</h3><p>Passing generated tests create evidence only for their linked requirements. Everything else is explicitly UNKNOWN.</p></div>
          <div className="coverage-table-wrap"><table><thead><tr><th>Requirement</th><th>Status</th><th>Generated tests</th><th>Evidence</th></tr></thead><tbody>{report.requirementCoverage.map((item) => <tr key={item.requirementId}><td><b>{item.requirementId}</b><small>{item.note}</small></td><td><span className={`coverage-status ${item.status.toLowerCase()}`}>{item.status}</span></td><td>{item.testFileIds.length ? item.testFileIds.join(', ') : 'None linked'}</td><td>{item.evidenceIds.length ? item.evidenceIds.join(', ') : 'No executed evidence'}</td></tr>)}</tbody></table></div>
        </div>
      </div> : null}
    </section>
  );
}
