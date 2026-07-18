'use client';

import { useState } from 'react';
import type { ArtifactPack } from '../../src/domain/schemas';
import type { CodeApproval, CodeGenerationOutput } from '../../src/codegen/schemas';
import { ActionLabel } from './action-label';

export type CodeStatus = 'idle' | 'loading' | 'success' | 'error';

export function CodeSection({ pack, output, status, error, approval, verificationOutcome, onGenerate, onApprove }: {
  pack: ArtifactPack | null;
  output: CodeGenerationOutput | null;
  status: CodeStatus;
  error: string;
  approval: CodeApproval | null;
  verificationOutcome?: 'passed' | 'failed';
  onGenerate: () => void;
  onApprove: () => void;
}) {
  const [selectedPath, setSelectedPath] = useState('');
  const selected = output?.files.find((file) => file.path === selectedPath) ?? output?.files[0];

  return (
    <section className="card" id="build" aria-labelledby="controlled-code-heading">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="eyebrow">Stage 5 · Build</p>
          <h2 id="controlled-code-heading" className="text-xl font-black">Controlled implementation</h2>
          <p className="muted">Axiom turns the approved task packet into inspectable code using fixed dependencies, allowlisted paths, and atomic writes.</p>
        </div>
        <button type="button" className="btn" aria-busy={status === 'loading'} disabled={!pack || status === 'loading'} onClick={onGenerate}>
          <ActionLabel loading={status === 'loading'} loadingText="Generating implementation…">{output ? 'Regenerate implementation' : 'Generate implementation'}</ActionLabel>
        </button>
      </div>

      {!pack ? <p className="mt-3 rounded border bg-slate-100 p-3"><b>Locked.</b> Generate the governed artifact pack first.</p> : null}
      {pack && !output && status === 'idle' ? <p className="mt-3 muted">The selected sample slice is ready: POST /notifications and GET /notifications/{'{id}'} with mocked delivery.</p> : null}
      {status === 'loading' ? <p className="mt-3" role="status">Validating the generation contract and preparing an atomic workspace update…</p> : null}
      {status === 'error' ? <p className="mt-3 rounded border border-red-200 bg-red-50 p-3" role="alert"><b>Code generation failed.</b> {error}{output ? ' The last valid generation remains visible.' : ''}</p> : null}

      {output ? (
        <div className="mt-4">
          <div className="rounded border bg-green-50 p-3" role="status">
            <b>Controlled implementation generated.</b> {output.files.length} validated writes · graph v{output.sourceGraphVersion} · {output.provider.name}
          </div>
          <div className="responsive-grid mt-3">
            <article className="rounded border p-3">
              <h3 className="font-black">Selected sample slice</h3>
              <p>{output.selectedSliceId}</p>
              <p className="muted text-sm">POST /notifications · GET /notifications/{'{id}'} · trusted tenant context · mocked provider</p>
            </article>
            <article className="rounded border p-3">
              <h3 className="font-black">Prompt provenance</h3>
              <p className="text-sm">ADR: {output.provenance.decisionId} · Constitution: {output.provenance.constitutionId}</p>
              <p className="muted text-sm">Artifacts: {output.provenance.artifactIds.join(', ')}</p>
            </article>
            <article className="rounded border p-3">
              <h3 className="font-black">Fixed workspace</h3>
              <p>{output.workspaceRoot}</p>
              <p className="break-anywhere muted text-sm">Template: {output.templateFiles.join(', ')} · Manifest: {output.manifestHash}</p>
            </article>
          </div>

          <div className="grid gap-3 mt-4 lg:grid-cols-3">
            <div>
              <h3 className="font-black">Generated file tree</h3>
              <div className="grid gap-2 mt-2" aria-label="Generated file tree">
                {output.files.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    className={`rounded border p-3 text-left ${selected?.id === file.id ? 'ring-2' : 'bg-slate-100'}`}
                    onClick={() => setSelectedPath(file.path)}
                  >
                    <b>{file.path}</b>
                    <span className="block muted text-sm">{file.id}</span>
                  </button>
                ))}
              </div>
            </div>
            {selected ? (
              <article className="lg:col-span-2 rounded border p-3">
                <h3 className="font-black">Unified diff · {selected.path}</h3>
                <p className="break-anywhere muted text-sm">{selected.hash}</p>
                <p className="text-sm" aria-label="selected file trace links"><b>Trace links:</b> {selected.linkedEntityIds.join(', ')}</p>
                <pre className="artifact-preview mt-3 overflow-auto rounded bg-slate-100 p-3">{selected.diff}</pre>
              </article>
            ) : null}
          </div>

          <div className="mt-4 rounded border p-3">
            <h3 className="font-black">Verification approval gate</h3>
            {approval ? (
              <p className="break-anywhere" role="status"><span className="badge">{approval.truthStatus}</span> Generation {approval.generationId} manifest {approval.manifestHash} approved at {approval.approvedAt}. {verificationOutcome ? `Latest fixed verification ${verificationOutcome === 'passed' ? 'passed with TOOL_VERIFIED evidence' : 'recorded FAILED evidence'}. See Stage 6 for exact commands and output.` : 'Verification is now authorized but has not been executed.'}</p>
            ) : (
              <>
                <p className="muted">Inspect the generated files and diff. No verification command can run until this generation is explicitly approved.</p>
                <button type="button" className="btn mt-3" onClick={onApprove}>Approve generated code for verification</button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
