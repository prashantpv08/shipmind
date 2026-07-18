'use client';

import { useState } from 'react';
import { DemoResetResult, type DemoResetResult as DemoResetResultType } from '../../src/export/schemas';
import type { TraceabilityContext, WhyAnswer } from '../../src/traceability/schemas';

type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

function responseFilename(response: Response, fallback: string) {
  const disposition = response.headers.get('content-disposition') ?? '';
  return disposition.match(/filename="([^"]+)"/)?.[1] ?? fallback;
}

export function ReleaseSection({ context, whyAnswer, onResetComplete }: {
  context: TraceabilityContext | null;
  whyAnswer: WhyAnswer | null;
  onResetComplete: (result: DemoResetResultType) => void;
}) {
  const [exportStatus, setExportStatus] = useState<ActionStatus>('idle');
  const [exportMessage, setExportMessage] = useState('');
  const [resetStatus, setResetStatus] = useState<ActionStatus>('idle');
  const [resetError, setResetError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  async function download(format: 'json' | 'markdown') {
    if (!context) return;
    setExportStatus('loading');
    setExportMessage('');
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ format, context, whyAnswer: whyAnswer ?? undefined }),
      });
      if (!response.ok) {
        const body: unknown = await response.json();
        const message = body && typeof body === 'object' && 'error' in body ? String(body.error) : 'Export failed';
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = responseFilename(response, `axiom-export.${format === 'json' ? 'json' : 'md'}`);
      link.click();
      URL.revokeObjectURL(url);
      const exportId = response.headers.get('x-axiom-export-id') ?? 'validated export';
      setExportMessage(`${format === 'json' ? 'JSON' : 'Markdown'} handoff downloaded · ${exportId}`);
      setExportStatus('success');
    } catch (cause) {
      setExportStatus('error');
      setExportMessage(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function resetDemo() {
    setResetStatus('loading');
    setResetError('');
    try {
      const response = await fetch('/api/demo/reset', { method: 'POST' });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = body && typeof body === 'object' && 'error' in body ? String(body.error) : 'Demo reset failed';
        throw new Error(message);
      }
      const result = DemoResetResult.parse(body);
      setResetStatus('success');
      setConfirmReset(false);
      onResetComplete(result);
    } catch (cause) {
      setResetStatus('error');
      setResetError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <section className="card release-stage" id="release" aria-labelledby="release-heading">
      <div className="release-heading-row">
        <div>
          <p className="eyebrow">Stage 9 · Release</p>
          <h2 id="release-heading" className="text-xl font-black">Package the reasoning. Reset with confidence.</h2>
          <p className="muted">Export the governed project record with hashes and a machine-readable manifest, or restore the NotifyFlow sample without touching application code or saved workspace projects.</p>
        </div>
        {context ? <span className="release-ready">Release pack ready</span> : <span className="release-waiting">Awaiting evidence</span>}
      </div>

      {!context ? <p className="release-lock"><b>Locked.</b> Complete verification to export a version-matched project handoff.</p> : (
        <div className="release-grid">
          <article className="release-export-card">
            <header><span>01</span><div><h3>Governed project export</h3><p>Artifacts, canonical graph, ADR, generation record, verification, traceability, and the latest grounded answer.</p></div></header>
            <ul>
              <li><b>Machine-verifiable</b><span>Every file has a SHA-256 entry and the manifest has one root hash.</span></li>
              <li><b>Two useful formats</b><span>Structured JSON for systems; readable Markdown for human handoff.</span></li>
              <li><b>Version matched</b><span>Graph v{context.analysis.graphVersion} · {context.generation.generationId} · {context.verification.id}</span></li>
            </ul>
            <div className="release-actions">
              <button type="button" disabled={exportStatus === 'loading'} onClick={() => download('json')}>{exportStatus === 'loading' ? 'Compiling export…' : 'Download JSON pack'}</button>
              <button type="button" disabled={exportStatus === 'loading'} onClick={() => download('markdown')}>Download Markdown handoff</button>
            </div>
            {exportStatus === 'success' ? <p className="release-success" role="status">✓ {exportMessage}</p> : null}
            {exportStatus === 'error' ? <p className="release-error" role="alert"><b>Export failed.</b> {exportMessage}</p> : null}
          </article>

          <article className="release-reset-card">
            <header><span>02</span><div><h3>Deterministic demo reset</h3><p>Clear generated code and verification evidence, then return the browser to untouched NotifyFlow intent.</p></div></header>
            <div className="reset-boundary">
              <span>Removed</span><p>Generated sandbox workspace · staged backups · stored sample verification evidence</p>
              <span>Preserved</span><p>Repository code · templates · environment configuration · user-created workspace projects</p>
            </div>
            {!confirmReset ? <button type="button" className="reset-demo-button" onClick={() => setConfirmReset(true)}>Reset NotifyFlow demo</button> : (
              <div className="reset-confirmation" role="group" aria-label="Confirm NotifyFlow reset">
                <p><b>Reset the sample now?</b> Export first if you want to keep this run’s evidence.</p>
                <div><button type="button" disabled={resetStatus === 'loading'} onClick={() => setConfirmReset(false)}>Cancel</button><button type="button" disabled={resetStatus === 'loading'} onClick={resetDemo}>{resetStatus === 'loading' ? 'Resetting…' : 'Confirm reset'}</button></div>
              </div>
            )}
            {resetStatus === 'error' ? <p className="release-error" role="alert"><b>Reset failed.</b> {resetError}</p> : null}
          </article>
        </div>
      )}
    </section>
  );
}
