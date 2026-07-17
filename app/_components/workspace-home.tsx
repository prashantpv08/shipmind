'use client';

import { useRef, useState, type DragEvent } from 'react';

type IntakeSource = {
  id: string;
  name: string;
  detail: string;
  kind: 'File' | 'Folder' | 'Transcript';
};

const projects = [
  { name: 'Payments modernization', status: 'Knowledge review', tone: 'blue' },
  { name: 'Partner onboarding', status: 'ARB pending', tone: 'amber' },
  { name: 'NotifyFlow', status: 'Sample project', tone: 'slate' },
];

const knowledgeGroups = [
  { label: 'Requirements', description: 'Functional outcomes and acceptance intent' },
  { label: 'Decisions', description: 'Resolved choices with source provenance' },
  { label: 'Constraints', description: 'Technology, policy, cost, and timeline limits' },
  { label: 'Risks', description: 'Delivery and architecture risks to evaluate' },
  { label: 'Open questions', description: 'Missing inputs that block confidence' },
  { label: 'Source trace', description: 'Every claim linked to its originating document' },
];

const deliverySteps = [
  { number: '01', title: 'Source intake', detail: 'Files, folders, and meeting transcripts', state: 'active' },
  { number: '02', title: 'Knowledge base', detail: 'Structured project documentation in Notion', state: 'next' },
  { number: '03', title: 'ARB', detail: 'Architecture options, trade-offs, and approval', state: 'locked' },
  { number: '04', title: 'HLD', detail: 'Approved system design and engineering views', state: 'locked' },
  { number: '05', title: 'Wireframes', detail: 'Product flows handed off to Figma', state: 'locked' },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function WorkspaceHome({ onOpenSample }: { onOpenSample: () => void }) {
  const [projectName, setProjectName] = useState('');
  const [sources, setSources] = useState<IntakeSource[]>([]);
  const [transcript, setTranscript] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [notice, setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null, kind: 'File' | 'Folder') {
    if (!files?.length) return;
    const next = Array.from(files).map((file, index) => ({
      id: `${kind}-${file.name}-${file.size}-${index}`,
      name: file.webkitRelativePath || file.name,
      detail: `${formatBytes(file.size)} · ${file.type || 'Document'}`,
      kind,
    } satisfies IntakeSource));
    setSources((current) => [...current, ...next]);
    setNotice('');
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    addFiles(event.dataTransfer.files, 'File');
  }

  function addTranscript() {
    const value = transcript.trim();
    if (!value) return;
    setSources((current) => [...current, {
      id: `Transcript-${Date.now()}`,
      name: `Meeting transcript ${current.filter((item) => item.kind === 'Transcript').length + 1}`,
      detail: `${value.split(/\s+/).length} words · Pasted transcript`,
      kind: 'Transcript',
    }]);
    setTranscript('');
    setShowTranscript(false);
  }

  function createDraft() {
    if (!projectName.trim() || sources.length === 0) return;
    setNotice('Project draft created locally. Connect the ingestion service before running analysis or publishing to Notion.');
  }

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="brand-lockup">
          <span className="brand-mark">A</span>
          <div><b>Axiom</b><small>Engineering OS</small></div>
        </div>

        <button type="button" className="workspace-switcher">
          <span className="workspace-avatar">PE</span>
          <span><small>Workspace</small><b>Product Engineering</b></span>
          <span aria-hidden="true">⌄</span>
        </button>

        <nav className="sidebar-nav" aria-label="Workspace navigation">
          <a className="active" href="#project-intake">Overview</a>
          <a href="#project-intake">New project</a>
          <a href="#integrations">Integrations</a>
        </nav>

        <div className="sidebar-section">
          <div className="sidebar-section-title"><span>Projects</span><button type="button" aria-label="Create project">+</button></div>
          {projects.map((project) => (
            <button key={project.name} type="button" className="project-row" onClick={project.name === 'NotifyFlow' ? onOpenSample : undefined}>
              <span className={`project-dot dot-${project.tone}`} />
              <span><b>{project.name}</b><small>{project.status}</small></span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <span className="user-avatar">PV</span>
          <span><b>Prashant Verma</b><small>Workspace admin</small></span>
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-topbar">
          <div><span className="breadcrumb">Product Engineering</span><span>/</span><b>New project</b></div>
          <div className="topbar-actions"><button type="button" className="icon-button" aria-label="Search">⌕</button><button type="button" className="btn">Invite team</button></div>
        </header>

        <div className="workspace-content" id="project-intake">
          <section className="workspace-intro">
            <p className="eyebrow">New project</p>
            <h1>Start with the source of truth.</h1>
            <p>Bring every brief, policy, diagram, and conversation into one project. Axiom will structure what matters before architecture work begins.</p>
          </section>

          <div className="intake-layout">
            <section className="surface intake-card" aria-labelledby="source-intake-heading">
              <div className="surface-heading">
                <div><span className="step-kicker">Step 1 of 2</span><h2 id="source-intake-heading">Project and source intake</h2></div>
                <span className="status-pill neutral">Draft</span>
              </div>

              <label className="field-label" htmlFor="project-name">Project name</label>
              <input id="project-name" className="text-input" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. Digital lending modernization" />

              <div className="field-heading"><span className="field-label">Source documents</span><span>{sources.length} added</span></div>
              <div className="dropzone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
                <span className="upload-mark">↑</span>
                <h3>Drop project knowledge here</h3>
                <p>PDF, DOCX, Markdown, spreadsheets, diagrams, or an entire project folder.</p>
                <div className="dropzone-actions">
                  <button type="button" className="btn" onClick={() => fileInput.current?.click()}>Choose files</button>
                  <button type="button" className="btn btn-secondary" onClick={() => folderInput.current?.click()}>Choose folder</button>
                </div>
                <input ref={fileInput} className="visually-hidden" type="file" multiple onChange={(event) => addFiles(event.target.files, 'File')} />
                <input ref={folderInput} className="visually-hidden" type="file" multiple {...{ webkitdirectory: '' }} onChange={(event) => addFiles(event.target.files, 'Folder')} />
              </div>

              <div className="source-options">
                <button type="button" className="source-option" onClick={() => setShowTranscript((current) => !current)}>
                  <span className="source-icon">T</span><span><b>Meeting transcript</b><small>Paste notes from Zoom, Meet, or Teams</small></span><span>+</span>
                </button>
                <button type="button" className="source-option" onClick={() => setNotice('Notion is available to configure. OAuth and database mapping are required before project publishing can begin.')}>
                  <span className="source-icon notion-icon">N</span><span><b>Import from Notion</b><small>Connect an existing project knowledge base</small></span><span>Connect</span>
                </button>
              </div>

              {showTranscript ? <div className="transcript-panel"><label className="field-label" htmlFor="meeting-transcript">Paste meeting transcript</label><textarea id="meeting-transcript" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="Paste the full transcript or meeting notes…" /><div className="panel-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowTranscript(false)}>Cancel</button><button type="button" className="btn" disabled={!transcript.trim()} onClick={addTranscript}>Add transcript</button></div></div> : null}

              {sources.length > 0 ? <div className="source-list" aria-label="Added sources">{sources.map((source) => <div className="source-file" key={source.id}><span className="source-icon">{source.kind.charAt(0)}</span><span><b>{source.name}</b><small>{source.detail}</small></span><span className="status-pill neutral">Ready</span><button type="button" className="remove-source" aria-label={`Remove ${source.name}`} onClick={() => setSources((current) => current.filter((item) => item.id !== source.id))}>×</button></div>)}</div> : null}

              <div className="intake-footer">
                <p>Your sources remain in draft until you choose where the project knowledge base should be published.</p>
                <button type="button" className="btn" disabled={!projectName.trim() || sources.length === 0} onClick={createDraft}>Create project draft</button>
              </div>
              {notice ? <p className="integration-notice" role="status">{notice}</p> : null}
            </section>

            <aside className="surface delivery-card" aria-labelledby="delivery-path-heading">
              <span className="step-kicker">Delivery path</span>
              <h2 id="delivery-path-heading">From source to approved design</h2>
              <p>Each stage starts only after the prior output is reviewed.</p>
              <ol className="delivery-list">{deliverySteps.map((step) => <li key={step.number} className={`delivery-step ${step.state}`}><span>{step.number}</span><div><b>{step.title}</b><p>{step.detail}</p></div></li>)}</ol>
              <div className="integration-stack" id="integrations">
                <div><span className="source-icon notion-icon">N</span><span><b>Notion</b><small>Knowledge system of record</small></span><span className="status-pill amber">Setup needed</span></div>
                <div><span className="source-icon figma-icon">F</span><span><b>Figma</b><small>Wireframe creation and handoff</small></span><span className="status-pill neutral">After HLD</span></div>
              </div>
            </aside>
          </div>

          <section className="knowledge-preview" aria-labelledby="knowledge-preview-heading">
            <div className="knowledge-heading"><div><p className="eyebrow">Structured project view</p><h2 id="knowledge-preview-heading">One project, clearly separated.</h2><p>Axiom organizes extracted information into reviewable collections before it publishes anything to Notion.</p></div><span className="status-pill neutral">Populated after analysis</span></div>
            <div className="knowledge-grid">{knowledgeGroups.map((group) => <article key={group.label}><span className="knowledge-glyph" /><div><h3>{group.label}</h3><p>{group.description}</p></div><span>—</span></article>)}</div>
          </section>

          <section className="sample-callout">
            <div><span className="status-pill blue">Interactive sample</span><h2>Want to review the working Axiom pipeline?</h2><p>Open the preloaded sample to explore grounded requirements, architecture approval, governed artifacts, and controlled implementation.</p></div>
            <button type="button" className="btn" onClick={onOpenSample}>Open sample project</button>
          </section>
        </div>
      </main>
    </div>
  );
}
