'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { PlatformAnalysisRunSchema, PlatformSourceSchema, type PlatformAnalysisRun, type PlatformSource } from '@/src/platform/contracts';

type OperationState = 'idle' | 'loading' | 'success' | 'error';

function apiRoot(organizationId: string, projectId: string) {
  return `/api/platform/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}`;
}

function sourceMimeType(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.toLocaleLowerCase('en-US').split('.').at(-1);
  return extension === 'pdf' ? 'application/pdf'
    : extension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : extension === 'json' ? 'application/json'
        : extension === 'csv' ? 'text/csv'
          : extension === 'yaml' || extension === 'yml' ? 'text/yaml'
            : extension === 'md' ? 'text/markdown' : 'text/plain';
}

async function base64(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The selected file could not be read.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !result.includes(',')) reject(new Error('The selected file could not be encoded.'));
      else resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

function errorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const error = (body as { error?: { message?: unknown } }).error;
    if (typeof error?.message === 'string') return error.message;
  }
  return fallback;
}

export function SourceWorkflow({
  organizationId,
  projectId,
  sources,
  initialRun,
  canManage,
}: {
  organizationId: string;
  projectId: string;
  sources: PlatformSource[];
  initialRun: PlatformAnalysisRun | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<OperationState>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [run, setRun] = useState(initialRun);
  const [analysisState, setAnalysisState] = useState<OperationState>('idle');
  const [analysisMessage, setAnalysisMessage] = useState('');
  const uploadKey = useRef<string | null>(null);
  const analysisKey = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const root = apiRoot(organizationId, projectId);

  useEffect(() => {
    if (run?.status !== 'QUEUED' && run?.status !== 'RUNNING') return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`${root}/analysis-runs/${encodeURIComponent(run.id)}`, { signal: controller.signal });
        const body: unknown = await response.json().catch(() => null);
        const parsed = PlatformAnalysisRunSchema.safeParse(body);
        if (!response.ok || !parsed.success) {
          setAnalysisState('error');
          setAnalysisMessage(errorMessage(body, 'The analysis state could not be refreshed. Safe retry remains available.'));
          return;
        }
        setRun(parsed.data);
        if (parsed.data.status === 'SUCCEEDED') {
          analysisKey.current = null;
          setAnalysisState('success');
          setAnalysisMessage(`Analysis completed as canonical graph v${parsed.data.graphVersion}.`);
          router.refresh();
        } else if (parsed.data.status === 'FAILED' || parsed.data.status === 'CANCELLED') {
          analysisKey.current = null;
          setAnalysisState(parsed.data.status === 'FAILED' ? 'error' : 'idle');
          setAnalysisMessage(parsed.data.errorMessage ?? 'Analysis was cancelled before a graph was committed.');
        }
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setAnalysisState('error');
        setAnalysisMessage('The platform could not be reached while checking analysis. The durable run remains recoverable.');
      }
    }, 1_000);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [root, router, run]);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || file.size < 1 || file.size > 10 * 1024 * 1024) return;
    setUploadState('loading');
    setUploadMessage('');
    const retryKey = uploadKey.current ?? crypto.randomUUID();
    uploadKey.current = retryKey;
    try {
      const response = await fetch(`${root}/sources`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': retryKey },
        body: JSON.stringify({ name: file.name, kind: 'FILE', mimeType: sourceMimeType(file), contentBase64: await base64(file) }),
      });
      const body: unknown = await response.json().catch(() => null);
      const parsed = PlatformSourceSchema.safeParse(body);
      if (!response.ok || !parsed.success) {
        setUploadState('error');
        setUploadMessage(errorMessage(body, 'The source was not stored. The selected file and retry key are preserved.'));
        return;
      }
      uploadKey.current = null;
      analysisKey.current = null;
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setUploadState('success');
      setUploadMessage(parsed.data.status === 'EXTRACTED'
        ? `${parsed.data.name} v${parsed.data.version} was validated, stored, and extracted.`
        : `${parsed.data.name} v${parsed.data.version} was stored, but extraction failed: ${parsed.data.extractionError ?? 'unknown extraction error'}`);
      router.refresh();
    } catch (cause) {
      setUploadState('error');
      setUploadMessage(cause instanceof Error ? cause.message : 'The platform could not be reached. Safe retry remains available.');
    }
  }

  async function analyze() {
    setAnalysisState('loading');
    setAnalysisMessage('');
    const retryKey = analysisKey.current ?? crypto.randomUUID();
    analysisKey.current = retryKey;
    try {
      const response = await fetch(`${root}/analysis-runs`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': retryKey },
        body: JSON.stringify({ analyzer: 'axiom-deterministic-grounded-v1' }),
      });
      const body: unknown = await response.json().catch(() => null);
      const parsed = PlatformAnalysisRunSchema.safeParse(body);
      if (!response.ok || !parsed.success) {
        setAnalysisState('error');
        setAnalysisMessage(errorMessage(body, 'Analysis could not be queued. The retry key is preserved.'));
        return;
      }
      setRun(parsed.data);
      setAnalysisState('success');
      setAnalysisMessage('Analysis is queued durably. This page reports worker state without fake progress.');
    } catch {
      setAnalysisState('error');
      setAnalysisMessage('The platform could not be reached. The retry key is preserved.');
    }
  }

  async function cancel() {
    if (!run || (run.status !== 'QUEUED' && run.status !== 'RUNNING')) return;
    setAnalysisState('loading');
    try {
      const response = await fetch(`${root}/analysis-runs/${encodeURIComponent(run.id)}/cancel`, { method: 'POST' });
      const parsed = PlatformAnalysisRunSchema.safeParse(await response.json().catch(() => null));
      if (!response.ok || !parsed.success) throw new Error('Cancellation was not confirmed.');
      setRun(parsed.data);
      analysisKey.current = null;
      setAnalysisState('idle');
      setAnalysisMessage('Analysis was cancelled. No graph was committed by this run.');
    } catch {
      setAnalysisState('error');
      setAnalysisMessage('Cancellation could not be confirmed. Refresh the durable run state before retrying.');
    }
  }

  const active = run?.status === 'QUEUED' || run?.status === 'RUNNING';
  const extractedCount = sources.filter((source) => source.status === 'EXTRACTED').length;

  return (
    <div className="source-workflow">
      <section aria-labelledby="source-upload-heading">
        <header><div><h2 id="source-upload-heading">Source versions</h2><p>PDF, DOCX, Markdown, text, CSV, JSON, and YAML · maximum 10 MB per file.</p></div><strong>{extractedCount} READY</strong></header>
        {canManage ? <form className="source-upload-form" onSubmit={upload}>
          <label htmlFor="project-source">Choose one source</label>
          <input ref={fileInput} id="project-source" type="file" accept=".pdf,.docx,.md,.txt,.csv,.json,.yaml,.yml" disabled={uploadState === 'loading'} onChange={(event) => {
            setFile(event.target.files?.[0] ?? null); uploadKey.current = null; setUploadState('idle'); setUploadMessage('');
          }} />
          <button type="submit" disabled={!file || file.size > 10 * 1024 * 1024 || uploadState === 'loading'} aria-busy={uploadState === 'loading'}>{uploadState === 'loading' ? 'Validating and storing…' : 'Upload source'}</button>
          {file && file.size > 10 * 1024 * 1024 ? <p role="alert">This file exceeds the 10 MB limit.</p> : null}
          {uploadMessage ? <p role={uploadState === 'error' ? 'alert' : 'status'}>{uploadMessage}</p> : null}
        </form> : <p>Your role has read-only access to source versions and analysis evidence.</p>}
        {sources.length === 0 ? <div className="account-state"><h3>No sources yet</h3><p>Upload a grounded product brief or specification before analysis.</p></div> : <ol>
          {sources.map((source) => <li key={source.id}><div><b>{source.name} · v{source.version}</b><span>{source.status}</span></div><code>{source.sha256}</code><small>{source.mimeType} · {source.size.toLocaleString('en-IN')} bytes · {source.validationStatus.replaceAll('_', ' ')}</small>{source.extractionError ? <p role="alert">{source.extractionError}</p> : null}</li>)}
        </ol>}
      </section>
      <section aria-labelledby="analysis-heading">
        <header><div><h2 id="analysis-heading">Grounded analysis</h2><p>Runs in the separate local worker and commits only an exact source snapshot.</p></div><strong>{run?.status ?? 'NOT RUN'}</strong></header>
        {run ? <dl><div><dt>Run</dt><dd><code>{run.id}</code></dd></div><div><dt>Attempts</dt><dd>{run.attempts}</dd></div><div><dt>Graph</dt><dd>{run.graphVersion ? `v${run.graphVersion}` : 'Not committed'}</dd></div><div><dt>Analyzer</dt><dd><code>{run.analyzer}</code></dd></div></dl> : null}
        {run?.errorMessage ? <p role="alert">{run.errorMessage}</p> : null}
        {canManage ? <div className="source-actions"><button type="button" onClick={analyze} disabled={extractedCount === 0 || active || analysisState === 'loading'}>{active ? 'Analysis in progress…' : 'Analyze current sources'}</button>{active ? <button type="button" onClick={cancel}>Cancel run</button> : null}</div> : null}
        {analysisMessage ? <p role={analysisState === 'error' ? 'alert' : 'status'}>{analysisMessage}</p> : null}
        <small>The deterministic analyzer creates grounded entities and explicit UNKNOWN gaps. It is a local product workflow fixture, not a claim of AI-model accuracy.</small>
      </section>
    </div>
  );
}
