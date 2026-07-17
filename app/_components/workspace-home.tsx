'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import type {
  ArchitectureOption,
  ClarificationQuestion,
  ProjectGap,
  ProjectReadiness,
  TechStackRecommendation,
  WireframeHandoff,
  WireframeTemplateId,
} from '../../src/projects/schemas';
import { WIREFRAME_TEMPLATES } from '../../src/projects/wireframe-templates';
import { ProjectIntelligencePanel } from './project-intelligence';
import { WireframeStudio } from './wireframe-studio';

type IntakeSource = {
  id: string;
  name: string;
  detail: string;
  kind: 'FILE' | 'FOLDER_FILE' | 'MEETING_TRANSCRIPT';
  file: File;
  relativePath?: string;
};

type KnowledgeEntity = { id: string; category: string; text: string; truthStatus: string; sourceId?: string };
type GeneratedDocument = { id: string; type: string; title: string; version: number; sourceGraphVersion?: number; sha256: string; content: string };
type PipelineResult = {
  projectId: string;
  graphVersion: number;
  entities: KnowledgeEntity[];
  gaps: ProjectGap[];
  clarificationQuestions: ClarificationQuestion[];
  readiness?: ProjectReadiness;
  techStack: TechStackRecommendation[];
  architectureOptions: ArchitectureOption[];
  documents: GeneratedDocument[];
  approvedOptionId?: string;
  notionUrl?: string;
};
type StoredProject = { id: string; name: string; status: string; updatedAt: string };
type PipelineStatus = 'idle' | 'loading' | 'creating' | 'uploading' | 'analyzing' | 'documenting' | 'clarifying' | 'approving' | 'hld' | 'wireframing' | 'publishing' | 'saving-wireframe' | 'success' | 'error';

const knowledgeGroups = [
  { label: 'Requirements', category: 'REQUIREMENT', description: 'Functional outcomes and acceptance intent' },
  { label: 'Decisions', category: 'DECISION', description: 'Resolved choices with source provenance' },
  { label: 'Constraints', category: 'CONSTRAINT', description: 'Technology, policy, cost, and timeline limits' },
  { label: 'Risks', category: 'RISK', description: 'Delivery and architecture risks to evaluate' },
  { label: 'Open questions', category: 'OPEN_QUESTION', description: 'Missing inputs that block confidence' },
  { label: 'NFRs', category: 'NFR', description: 'Security, reliability, performance, and quality needs' },
];

const deliverySteps = [
  { number: '01', title: 'Source intake', detail: 'Files, folders, and meeting transcripts', state: 'active' },
  { number: '02', title: 'Knowledge base', detail: 'Structured project documentation in Notion', state: 'next' },
  { number: '03', title: 'ARB', detail: 'Architecture options, trade-offs, and approval', state: 'locked' },
  { number: '04', title: 'HLD', detail: 'Approved system design and engineering views', state: 'locked' },
  { number: '05', title: 'Wireframes', detail: 'Generated and reviewed in Axiom Studio', state: 'locked' },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readJson(response: Response) {
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body ? String(body.error) : `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return body as Record<string, unknown>;
}

export function WorkspaceHome({ onOpenSample }: { onOpenSample: () => void }) {
  const [projectName, setProjectName] = useState('');
  const [sources, setSources] = useState<IntakeSource[]>([]);
  const [transcript, setTranscript] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [storedProjects, setStoredProjects] = useState<StoredProject[]>([]);
  const [notionConfigured, setNotionConfigured] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<WireframeTemplateId>('regulated-workflow');
  const [clarificationDrafts, setClarificationDrafts] = useState<Record<string, string>>({});
  const [wireframe, setWireframe] = useState<WireframeHandoff | null>(null);
  const [showWireframeStudio, setShowWireframeStudio] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/integrations/notion/status', { signal: controller.signal })
      .then((response) => response.json())
      .then((body: { configured?: boolean }) => setNotionConfigured(Boolean(body.configured)))
      .catch(() => { if (!controller.signal.aborted) setNotionConfigured(false); });
    fetch('/api/projects', { signal: controller.signal })
      .then(readJson)
      .then((body) => setStoredProjects(((body.projects as StoredProject[] | undefined) ?? []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))))
      .catch(() => { if (!controller.signal.aborted) setStoredProjects([]); });
    return () => controller.abort();
  }, []);

  async function refreshProjects() {
    try {
      const body = await readJson(await fetch('/api/projects'));
      setStoredProjects(((body.projects as StoredProject[] | undefined) ?? []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    } catch {
      setStoredProjects([]);
    }
  }

  async function openStoredProject(project: StoredProject) {
    setStatus('loading');
    setNotice('');
    setWireframe(null);
    setShowWireframeStudio(false);
    try {
      const bundle = await readJson(await fetch(`/api/projects/${project.id}`));
      const knowledge = bundle.knowledge as {
        entities?: KnowledgeEntity[];
        gaps?: ProjectGap[];
        clarificationQuestions?: ClarificationQuestion[];
        readiness?: ProjectReadiness;
        techStack?: TechStackRecommendation[];
        architectureOptions?: ArchitectureOption[];
      } | null;
      const graphVersion = (bundle.project as { graphVersion: number }).graphVersion;
      const documents = ((bundle.documents as GeneratedDocument[] | undefined) ?? [])
        .filter((document) => document.sourceGraphVersion === graphVersion)
        .sort((a, b) => b.version - a.version)
        .filter((document, index, all) => all.findIndex((candidate) => candidate.type === document.type) === index);
      setProjectName(project.name);
      setSources([]);
      if (!knowledge) {
        setResult(null);
        setStatus('idle');
        setNotice('This project is saved, but its sources have not been analyzed yet.');
        return;
      }
      const arbDecision = bundle.arbDecision as { optionId?: string; graphVersion?: number } | null;
      const publication = bundle.notionPublication as { projectPageUrl?: string } | null;
      const architectureOptions = knowledge.architectureOptions ?? [];
      const currentApproval = arbDecision?.graphVersion === graphVersion ? arbDecision.optionId : undefined;
      setSelectedOptionId(currentApproval ?? architectureOptions.find((option) => option.recommended)?.id ?? architectureOptions[0]?.id ?? '');
      setResult({
        projectId: project.id,
        graphVersion,
        entities: knowledge.entities ?? [],
        gaps: knowledge.gaps ?? [],
        clarificationQuestions: knowledge.clarificationQuestions ?? [],
        readiness: knowledge.readiness,
        techStack: knowledge.techStack ?? [],
        architectureOptions,
        documents,
        approvedOptionId: currentApproval,
        notionUrl: publication?.projectPageUrl,
      });
      setStatus('success');
      setNotice(`Loaded ${project.name} from the Product Engineering workspace.`);
    } catch (cause) {
      setStatus('error');
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function addFiles(files: FileList | null, kind: 'FILE' | 'FOLDER_FILE') {
    if (!files?.length) return;
    const next = Array.from(files).map((file, index) => ({
      id: `${kind}-${file.name}-${file.size}-${index}-${Date.now()}`,
      name: file.webkitRelativePath || file.name,
      detail: `${formatBytes(file.size)} · ${file.type || 'Document'}`,
      kind,
      file,
      relativePath: file.webkitRelativePath || undefined,
    } satisfies IntakeSource));
    setSources((current) => [...current, ...next]);
    setNotice('');
    setResult(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    addFiles(event.dataTransfer.files, 'FILE');
  }

  function addTranscript() {
    const value = transcript.trim();
    if (!value) return;
    const number = sources.filter((item) => item.kind === 'MEETING_TRANSCRIPT').length + 1;
    const file = new File([value], `meeting-transcript-${number}.txt`, { type: 'text/plain' });
    setSources((current) => [...current, {
      id: `Transcript-${Date.now()}`,
      name: `Meeting transcript ${number}`,
      detail: `${value.split(/\s+/).length} words · Pasted transcript`,
      kind: 'MEETING_TRANSCRIPT',
      file,
    }]);
    setTranscript('');
    setShowTranscript(false);
    setResult(null);
  }

  async function publish(projectId: string) {
    setStatus('publishing');
    const publicationBody = await readJson(await fetch(`/api/projects/${projectId}/publish/notion`, { method: 'POST' }));
    return (publicationBody.publication as { projectPageUrl?: string } | undefined)?.projectPageUrl;
  }

  async function createProject() {
    if (!projectName.trim() || sources.length === 0) return;
    setNotice('');
    setResult(null);
    try {
      setStatus('creating');
      const projectBody = await readJson(await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: projectName }),
      }));
      const projectId = (projectBody.project as { id: string }).id;

      setStatus('uploading');
      const form = new FormData();
      for (const source of sources) {
        form.append('files', source.file, source.file.name);
        form.append('relativePaths', source.relativePath ?? '');
        form.append('kinds', source.kind);
      }
      await readJson(await fetch(`/api/projects/${projectId}/sources`, { method: 'POST', body: form }));

      setStatus('analyzing');
      const analysisBody = await readJson(await fetch(`/api/projects/${projectId}/analyze`, { method: 'POST' }));
      const knowledge = analysisBody.knowledge as {
        graphVersion: number;
        entities?: KnowledgeEntity[];
        gaps?: ProjectGap[];
        clarificationQuestions?: ClarificationQuestion[];
        readiness?: ProjectReadiness;
        techStack?: TechStackRecommendation[];
        architectureOptions?: ArchitectureOption[];
      };
      const entities = knowledge.entities ?? [];
      const architectureOptions = knowledge.architectureOptions ?? [];
      setSelectedOptionId(architectureOptions.find((option) => option.recommended)?.id ?? architectureOptions[0]?.id ?? '');

      setStatus('documenting');
      const documentBody = await readJson(await fetch(`/api/projects/${projectId}/documents`, { method: 'POST' }));
      const documents = (documentBody.documents as GeneratedDocument[]) ?? [];

      let notionUrl: string | undefined;
      if (notionConfigured) notionUrl = await publish(projectId);
      setResult({
        projectId,
        graphVersion: knowledge.graphVersion,
        entities,
        gaps: knowledge.gaps ?? [],
        clarificationQuestions: knowledge.clarificationQuestions ?? [],
        readiness: knowledge.readiness,
        techStack: knowledge.techStack ?? [],
        architectureOptions,
        documents,
        notionUrl,
      });
      setStatus('success');
      setNotice(notionUrl
        ? 'Project analyzed, documented, and published to Notion.'
        : 'Project analyzed and documented locally. Configure Notion to publish the generated project knowledge base.');
      await refreshProjects();
    } catch (cause) {
      setStatus('error');
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function publishExisting() {
    if (!result) return;
    try {
      const notionUrl = await publish(result.projectId);
      setResult({ ...result, notionUrl });
      setStatus('success');
      setNotice('Project documentation published to Notion.');
      await refreshProjects();
    } catch (cause) {
      setStatus('error');
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function answerClarification(question: ClarificationQuestion, answerValue?: string) {
    if (!result) return;
    const answer = (answerValue ?? clarificationDrafts[question.id] ?? '').trim();
    if (!answer) return;
    try {
      setStatus('clarifying');
      setNotice('');
      const body = await readJson(await fetch(`/api/projects/${result.projectId}/clarifications/${question.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answer }),
      }));
      const knowledge = body.knowledge as {
        graphVersion: number;
        entities: KnowledgeEntity[];
        gaps: ProjectGap[];
        clarificationQuestions: ClarificationQuestion[];
        readiness?: ProjectReadiness;
        techStack: TechStackRecommendation[];
        architectureOptions: ArchitectureOption[];
      };
      const documents = body.documents as GeneratedDocument[];
      const nextResult: PipelineResult = {
        ...result,
        graphVersion: knowledge.graphVersion,
        entities: knowledge.entities,
        gaps: knowledge.gaps,
        clarificationQuestions: knowledge.clarificationQuestions,
        readiness: knowledge.readiness,
        techStack: knowledge.techStack,
        architectureOptions: knowledge.architectureOptions,
        documents,
        approvedOptionId: undefined,
      };
      setClarificationDrafts((current) => ({ ...current, [question.id]: '' }));
      let notionUrl = result.notionUrl;
      if (notionConfigured) notionUrl = await publish(result.projectId);
      setResult({ ...nextResult, notionUrl });
      setStatus('success');
      setNotice(notionUrl
        ? `Answer accepted. Readiness is now ${knowledge.readiness?.score ?? 'UNKNOWN'}/100 and the Notion project hub was updated.`
        : `Answer accepted. Readiness is now ${knowledge.readiness?.score ?? 'UNKNOWN'}/100 and project documents were regenerated.`);
      await refreshProjects();
    } catch (cause) {
      setStatus('error');
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function approveArchitecture() {
    if (!result || !selectedOptionId) return;
    try {
      setStatus('approving');
      await readJson(await fetch(`/api/projects/${result.projectId}/arb`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ optionId: selectedOptionId }),
      }));
      setStatus('hld');
      const hldBody = await readJson(await fetch(`/api/projects/${result.projectId}/hld`, { method: 'POST' }));
      const architectureDocuments = (hldBody.documents as GeneratedDocument[] | undefined) ?? [hldBody.document as GeneratedDocument];
      const approvedResult = {
        ...result,
        documents: [...result.documents.filter((document) => !['hld', 'adr'].includes(document.type)), ...architectureDocuments],
        approvedOptionId: selectedOptionId,
      };
      setResult(approvedResult);
      let notionUrl = result.notionUrl;
      if (notionConfigured) notionUrl = await publish(result.projectId);
      setResult({ ...approvedResult, notionUrl });
      setStatus('success');
      setNotice(notionUrl ? 'ARB approved, HLD generated, and the Notion project documentation was republished.' : 'ARB approved and HLD generated. Configure Notion to publish the complete documentation set.');
      await refreshProjects();
    } catch (cause) {
      setStatus('error');
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function generateWireframes() {
    if (!result?.approvedOptionId) return;
    try {
      setStatus('wireframing');
      setNotice('');
      const body = await readJson(await fetch(`/api/projects/${result.projectId}/wireframes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId }),
      }));
      const generated = body.wireframe as WireframeHandoff;
      setWireframe(generated);
      setShowWireframeStudio(true);
      setStatus('success');
      setNotice(`${generated.templateName} generated with ${generated.screens.length} source-linked scenes. All interactions remain AI_SUGGESTED until review.`);
    } catch (cause) {
      setStatus('error');
      setNotice(cause instanceof Error ? cause.message : String(cause));
    }
  }

  const busy = !['idle', 'success', 'error'].includes(status);
  const openBlockers = result?.gaps.filter((gap) => gap.status === 'OPEN' && gap.severity === 'BLOCKER') ?? [];
  const statusLabel: Record<PipelineStatus, string> = {
    idle: 'Create project', loading: 'Loading project…', creating: 'Creating project…', uploading: 'Extracting sources…', analyzing: 'Structuring knowledge…', documenting: 'Generating documents…', clarifying: 'Applying clarification…', approving: 'Recording ARB approval…', hld: 'Generating HLD and ADR…', wireframing: 'Generating wireframes…', publishing: 'Publishing to Notion…', 'saving-wireframe': 'Saving wireframe revision…', success: 'Regenerate project', error: 'Retry project',
  };

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="brand-lockup"><span className="brand-mark">A</span><div><b>Axiom</b><small>Engineering OS</small></div></div>
        <button type="button" className="workspace-switcher"><span className="workspace-avatar">PE</span><span><small>Workspace</small><b>Product Engineering</b></span><span aria-hidden="true">⌄</span></button>
        <nav className="sidebar-nav" aria-label="Workspace navigation"><a className="active" href="#project-intake">Overview</a><a href="#project-intake">New project</a><a href="#integrations">Integrations</a></nav>
        <div className="sidebar-section">
          <div className="sidebar-section-title"><span>Projects</span><button type="button" aria-label="Create project">+</button></div>
          {storedProjects.map((project) => <button key={project.id} type="button" className="project-row" disabled={busy} onClick={() => openStoredProject(project)}><span className={`project-dot ${project.status === 'PUBLISHED' || project.status === 'HLD_READY' ? 'dot-blue' : 'dot-amber'}`} /><span><b>{project.name}</b><small>{project.status.replaceAll('_', ' ').toLowerCase()}</small></span></button>)}
          {storedProjects.length === 0 ? <p className="sidebar-empty">No saved projects yet</p> : null}
          <button type="button" className="project-row" onClick={onOpenSample}><span className="project-dot dot-slate" /><span><b>NotifyFlow</b><small>Sample project</small></span></button>
        </div>
        <div className="sidebar-footer"><span className="user-avatar">PV</span><span><b>Prashant Verma</b><small>Workspace admin</small></span></div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-topbar"><div><span className="breadcrumb">Product Engineering</span><span>/</span><b>New project</b></div><div className="topbar-actions"><button type="button" className="icon-button" aria-label="Search">⌕</button><button type="button" className="btn">Invite team</button></div></header>
        <div className="workspace-content" id="project-intake">
          <section className="workspace-intro"><p className="eyebrow">New project</p><h1>Start with the source of truth.</h1><p>Bring every brief, policy, diagram, and conversation into one project. Axiom extracts and separates grounded knowledge before architecture work begins.</p></section>

          <div className="intake-layout">
            <section className="surface intake-card" aria-labelledby="source-intake-heading">
              <div className="surface-heading"><div><span className="step-kicker">Step 1 of 2</span><h2 id="source-intake-heading">Project and source intake</h2></div><span className={`status-pill ${status === 'error' ? 'amber' : result ? 'blue' : 'neutral'}`}>{status === 'error' ? 'Needs attention' : result ? 'Documented' : 'Draft'}</span></div>
              <label className="field-label" htmlFor="project-name">Project name</label>
              <input id="project-name" className="text-input" value={projectName} disabled={busy} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. Digital lending modernization" />
              <div className="field-heading"><span className="field-label">Source documents</span><span>{sources.length} added</span></div>
              <div className="source-options"><button type="button" className="source-option" disabled={busy} onClick={() => setShowTranscript((current) => !current)}><span className="source-icon">T</span><span><b>Meeting transcript</b><small>Paste notes from Zoom, Meet, or Teams</small></span><span>+</span></button><button type="button" className="source-option" onClick={() => setNotice(notionConfigured ? 'Notion is connected. New project documentation will publish automatically.' : 'Set NOTION_ACCESS_TOKEN and NOTION_PARENT_PAGE_ID in .env.local, then share the parent page with the integration.')}><span className="source-icon notion-icon">N</span><span><b>Notion connection</b><small>{notionConfigured ? 'Ready to publish project documentation' : 'Server configuration required'}</small></span><span>{notionConfigured ? 'Ready' : 'Setup'}</span></button></div>
              {showTranscript ? <div className="transcript-panel"><label className="field-label" htmlFor="meeting-transcript">Paste meeting transcript</label><textarea id="meeting-transcript" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="Paste the full transcript or meeting notes…" /><div className="panel-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowTranscript(false)}>Cancel</button><button type="button" className="btn" disabled={!transcript.trim()} onClick={addTranscript}>Add transcript</button></div></div> : null}
              {sources.length > 0 ? <div className="source-list" aria-label="Added sources">{sources.map((source) => <div className="source-file" key={source.id}><span className="source-icon">{source.kind === 'MEETING_TRANSCRIPT' ? 'T' : source.kind === 'FOLDER_FILE' ? 'F' : 'D'}</span><span><b>{source.name}</b><small>{source.detail}</small></span><span className="status-pill neutral">Ready</span><button type="button" className="remove-source" disabled={busy} aria-label={`Remove ${source.name}`} onClick={() => setSources((current) => current.filter((item) => item.id !== source.id))}>×</button></div>)}</div> : null}
              <div className="intake-footer"><p>Sources are persisted locally with bounded output. Generated claims retain exact source references and remain unapproved until human review.</p><button type="button" className="btn" disabled={busy || !projectName.trim() || sources.length === 0} onClick={createProject}>{statusLabel[status]}</button></div>
              {notice ? <p className={`integration-notice ${status === 'error' ? 'notice-error' : ''}`} role={status === 'error' ? 'alert' : 'status'}>{notice}</p> : null}
            </section>

            <aside className="surface delivery-card" aria-labelledby="delivery-path-heading"><span className="step-kicker">Delivery path</span><h2 id="delivery-path-heading">From source to approved design</h2><p>Each stage starts only after the prior output is reviewed.</p><ol className="delivery-list">{deliverySteps.map((step, index) => <li key={step.number} className={`delivery-step ${result && index < 2 ? 'active' : step.state}`}><span>{step.number}</span><div><b>{step.title}</b><p>{step.detail}</p></div></li>)}</ol><div className="integration-stack" id="integrations"><div><span className="source-icon notion-icon">N</span><span><b>Notion</b><small>Knowledge system of record</small></span><span className={`status-pill ${notionConfigured ? 'blue' : 'amber'}`}>{notionConfigured ? 'Connected' : 'Setup needed'}</span></div><div><span className="source-icon studio-icon">W</span><span><b>Axiom Studio</b><small>In-product wireframe canvas</small></span><span className="status-pill blue">Built in</span></div></div></aside>
          </div>

          <section className="knowledge-preview" aria-labelledby="knowledge-preview-heading">
            <div className="knowledge-heading"><div><p className="eyebrow">Structured project view</p><h2 id="knowledge-preview-heading">One project, clearly separated.</h2><p>Axiom organizes extracted information into reviewable collections before publishing to Notion.</p></div><span className={`status-pill ${result ? 'blue' : 'neutral'}`}>{result ? `Graph ready · ${result.entities.length} entities` : 'Populated after analysis'}</span></div>
            <div className="knowledge-grid">{knowledgeGroups.map((group) => { const count = result?.entities.filter((entity) => entity.category === group.category).length; return <article key={group.label}><span className="knowledge-glyph" /><div><h3>{group.label}</h3><p>{group.description}</p></div><span>{count ?? '—'}</span></article>; })}</div>
            {result ? <ProjectIntelligencePanel
              readiness={result.readiness}
              gaps={result.gaps}
              questions={result.clarificationQuestions}
              techStack={result.techStack}
              drafts={clarificationDrafts}
              busy={busy}
              onDraftChange={(questionId, answer) => setClarificationDrafts((current) => ({ ...current, [questionId]: answer }))}
              onAnswer={answerClarification}
            /> : null}
            {result ? <div className="generated-documents">
              <div className="generated-documents-heading">
                <div><h3>Generated project documentation</h3><p>Detailed compiled views from graph v{result.graphVersion}. Review before ARB.</p></div>
                <div className="document-actions">
                  {result.notionUrl ? <a className="btn" href={result.notionUrl} target="_blank" rel="noreferrer">Open in Notion</a> : null}
                  <button type="button" className="btn btn-secondary" disabled={!notionConfigured || status === 'publishing'} onClick={publishExisting}>{notionConfigured ? result.notionUrl ? 'Republish current graph' : 'Publish to Notion' : 'Notion setup required'}</button>
                </div>
              </div>
              <div className="document-grid">{result.documents.map((document) => <article key={document.id}>
                <span className="source-icon">{document.type.toUpperCase().slice(0, 2)}</span>
                <div><b>{document.title}</b><small>v{document.version} · graph v{document.sourceGraphVersion ?? result.graphVersion} · {document.sha256.slice(0, 12)}…</small></div>
                <button type="button" onClick={() => { const blob = new Blob([document.content], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = `${document.type}-v${document.version}.md`; anchor.click(); URL.revokeObjectURL(url); }}>Download</button>
              </article>)}</div>

              <div className="arb-panel">
                <div><p className="eyebrow">Architecture review board</p><h3>{result.approvedOptionId ? 'Architecture approved' : 'Select an architecture direction'}</h3><p>Compare delivery, operating model, technology, cost estimate, failure behavior, and reconsideration triggers. Approval is blocked while a P0 clarification remains unresolved.</p></div>
                <div className="arb-grid">{result.architectureOptions.map((option) => <button type="button" key={option.id} className={`arb-option ${selectedOptionId === option.id ? 'selected' : ''}`} disabled={Boolean(result.approvedOptionId) || busy} onClick={() => setSelectedOptionId(option.id)}>
                  <div className="arb-option-meta"><span className="status-pill neutral">{option.truthStatus}</span>{option.recommended ? <span className="status-pill blue">Recommended</span> : null}</div>
                  <b>{option.name}</b><p>{option.summary}</p>
                  <small><strong>Deployment:</strong> {option.deploymentModel}</small>
                  <small><strong>Technologies:</strong> {option.technologies.join(', ')}</small>
                  <small><strong>Cost estimate:</strong> {option.estimatedCost.range}</small>
                  <small><strong>Why:</strong> {option.why.join('; ')}</small>
                  <small><strong>Why not:</strong> {option.whyNot.join('; ')}</small>
                  <small><strong>Reconsider when:</strong> {option.reconsiderationTriggers.map((trigger) => trigger.condition).join('; ')}</small>
                </button>)}</div>
                {result.approvedOptionId ? <div className="wireframe-unlock">
                  <div className="wireframe-template-control"><label htmlFor="wireframe-template">Wireframe template</label><select id="wireframe-template" value={selectedTemplateId} disabled={busy} onChange={(event) => setSelectedTemplateId(event.target.value as WireframeTemplateId)}>{WIREFRAME_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select><small>{WIREFRAME_TEMPLATES.find((template) => template.id === selectedTemplateId)?.bestFor}</small></div>
                  <p className="arb-approved" role="status">HUMAN_APPROVED · ADR and HLD generated. Axiom Wireframe Studio is unlocked.</p>
                  <div><button type="button" className="btn" disabled={busy} onClick={generateWireframes}>{status === 'wireframing' ? 'Generating wireframes…' : wireframe ? 'Regenerate from template' : 'Generate in Axiom Studio'}</button>{wireframe ? <button type="button" className="btn btn-secondary" onClick={() => setShowWireframeStudio(true)}>Open Wireframe Studio</button> : null}</div>
                </div> : <div className="arb-action-row">
                  {openBlockers.length ? <p className="arb-blocker" role="status">Resolve {openBlockers.length} blocker{openBlockers.length === 1 ? '' : 's'} before approval: {openBlockers.map((gap) => gap.title).join('; ')}</p> : <p>No P0 blocker remains. Approval will create a HUMAN_APPROVED ADR at graph v{result.graphVersion}.</p>}
                  <button type="button" className="btn" disabled={!selectedOptionId || busy || openBlockers.length > 0} onClick={approveArchitecture}>Approve architecture and generate ADR + HLD</button>
                </div>}
              </div>
            </div> : null}
          </section>

          <section className="sample-callout"><div><span className="status-pill blue">Interactive sample</span><h2>Review the existing engineering pipeline</h2><p>Open the preloaded sample to explore architecture approval, governed artifacts, and controlled implementation.</p></div><button type="button" className="btn" onClick={onOpenSample}>Open sample project</button></section>
        </div>
      </main>
      {wireframe && showWireframeStudio ? <WireframeStudio handoff={wireframe} onClose={() => setShowWireframeStudio(false)} /> : null}
    </div>
  );
}
