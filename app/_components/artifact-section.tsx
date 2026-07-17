'use client';

import { useState } from 'react';
import type { ArchitectureDecision, Artifact, ArtifactPack } from '../../src/domain/schemas';

export type ArtifactStatus = 'idle' | 'loading' | 'success' | 'error';

const labels: Record<Artifact['type'], string> = {
  srs: 'SRS',
  nfr: 'NFR catalogue',
  hld: 'High-level design',
  adr: 'Approved ADR',
  openapi: 'OpenAPI 3.1',
  'test-strategy': 'Test strategy',
  backlog: 'Implementation backlog',
  'codex-task': 'Codex task packet',
  constitution: 'Engineering constitution',
};

export function ArtifactSection({ decision, pack, status, error, onGenerate }: {
  decision: ArchitectureDecision | null;
  pack: ArtifactPack | null;
  status: ArtifactStatus;
  error: string;
  onGenerate: () => void;
}) {
  const [selectedId, setSelectedId] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');

  const selected = pack?.artifacts.find((artifact) => artifact.id === selectedId)
    ?? pack?.artifacts[0];
  const blocked = !decision || decision.stale;

  async function copyArtifact() {
    if (!selected) return;
    setCopyState('copying');
    try {
      await navigator.clipboard.writeText(selected.content);
      setCopyState('success');
    } catch {
      setCopyState('error');
    }
  }

  function downloadArtifact() {
    if (!selected) return;
    const blob = new Blob([selected.content], { type: `${selected.mediaType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selected.type}-v${selected.version}.${selected.mediaType === 'application/json' ? 'json' : 'md'}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card" aria-labelledby="artifact-pack-heading">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 id="artifact-pack-heading" className="text-xl font-black">Engineering Constitution and Artifact Pack</h2>
          <p className="muted">Deterministic compiled views from the canonical graph and approved ADR. Direct edits here are not authoritative.</p>
        </div>
        <button type="button" className="btn" disabled={blocked || status === 'loading'} onClick={onGenerate}>
          {status === 'loading' ? 'Compiling artifact pack…' : pack ? 'Regenerate artifact pack' : 'Generate artifact pack'}
        </button>
      </div>

      {!decision ? <p className="mt-3 rounded border bg-slate-100 p-3"><b>Locked.</b> Explicitly approve an architecture decision first.</p> : null}
      {decision?.stale ? <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-3"><b>Locked.</b> The ADR is stale. Re-approve it against the current graph before compiling artifacts.</p> : null}
      {decision && !decision.stale && !pack && status === 'idle' ? <p className="mt-3 muted">Ready to compile nine governed artifacts. No pack has been generated yet.</p> : null}
      {status === 'loading' ? <p className="mt-3" role="status">Compiling and validating all artifact views…</p> : null}
      {status === 'error' ? <p className="mt-3 rounded border border-red-200 bg-red-50 p-3" role="alert"><b>Artifact compilation failed.</b> {error}</p> : null}

      {pack ? (
        <div className="mt-4">
          <div className="rounded border bg-green-50 p-3" role="status">
            <b>Artifact pack ready.</b> {pack.artifacts.length} validated artifacts · graph v{pack.sourceGraphVersion} · constitution v{pack.constitution.version}
          </div>
          <div className="responsive-grid mt-3" role="tablist" aria-label="Compiled artifacts">
            {pack.artifacts.map((artifact) => (
              <button
                key={artifact.id}
                type="button"
                role="tab"
                aria-selected={selected?.id === artifact.id}
                className={`rounded border p-3 text-left ${selected?.id === artifact.id ? 'ring-2' : 'bg-slate-100'}`}
                onClick={() => { setSelectedId(artifact.id); setCopyState('idle'); }}
              >
                <b>{labels[artifact.type]}</b>
                <span className="block muted text-sm">v{artifact.version} · {artifact.truthStatus}</span>
              </button>
            ))}
          </div>
          {selected ? (
            <article className="mt-4 rounded border p-3" role="tabpanel">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-black">{labels[selected.type]} · {selected.id}</h3>
                  <p className="muted text-sm">Graph v{selected.sourceGraphVersion} · artifact v{selected.version} · {selected.hash}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn" disabled={copyState === 'copying'} onClick={copyArtifact}>
                    {copyState === 'copying' ? 'Copying…' : 'Copy content'}
                  </button>
                  <button type="button" className="btn" onClick={downloadArtifact}>Download</button>
                </div>
              </div>
              <p className="text-sm" aria-live="polite">
                {copyState === 'success' ? 'Copied to clipboard.' : copyState === 'error' ? 'Copy failed. Use the preview to select the content manually.' : ''}
              </p>
              <pre className="artifact-preview mt-3 overflow-auto rounded bg-slate-100 p-3">{selected.content}</pre>
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
