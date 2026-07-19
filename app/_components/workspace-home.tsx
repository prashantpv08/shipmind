'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import type {
  ArchitectureOption,
  ClarificationQuestion,
  JiraBacklogPlan,
  JiraPublication,
  ProjectGap,
  ProjectReadiness,
  TechStackRecommendation,
  WireframeHandoff,
  WireframeTemplateId,
} from '../../src/projects/schemas';
import { useModalDialog } from '../_hooks/use-modal-dialog';
import { ActionLabel } from './action-label';
import { ArchitectureDiagrams } from './architecture-diagrams';
import { DocumentReviewStudio, type ReviewDocument } from './document-review-studio';
import { DeliveryStage } from './delivery-stage';
import { TemplateGallery } from './template-gallery';
import { WireframeStudio } from './wireframe-studio';

type IntakeSource = { id: string; name: string; detail: string; kind: 'FILE' | 'FOLDER_FILE' | 'MEETING_TRANSCRIPT'; file: File; relativePath?: string };
type KnowledgeEntity = { id: string; category: string; text: string; truthStatus: string; sourceId?: string };
type GeneratedDocument = ReviewDocument & { sha256: string };
type DocumentApproval = { id: string; graphVersion: number; documentHashes: Record<string, string>; approvedAt: string };
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
  documentApproval?: DocumentApproval;
  approvedOptionId?: string;
  notionUrl?: string;
  jiraPublication?: JiraPublication;
};
type StoredProject = { id: string; name: string; status: string; updatedAt: string };
type JiraConnectionView = { configured: boolean; connected?: boolean; projectKey?: string; accountName?: string; error?: string };
type Stage = 'documents' | 'wireflow' | 'architecture' | 'handoff';
type PipelineStatus = 'idle' | 'loading' | 'creating' | 'uploading' | 'analyzing' | 'documenting' | 'clarifying' | 'approving-documents' | 'revising-document' | 'approving' | 'hld' | 'wireframing' | 'publishing' | 'planning-delivery' | 'creating-jira' | 'preparing-code' | 'deleting' | 'success' | 'error';

const statusCopy: Record<PipelineStatus, string> = {
  idle: 'Build project intelligence', loading: 'Opening project…', creating: 'Creating project…', uploading: 'Reading every source…', analyzing: 'Finding requirements and gaps…', documenting: 'Building the document system…', clarifying: 'Applying your decision…', 'approving-documents': 'Approving document baseline…', 'revising-document': 'Revising section…', approving: 'Recording architecture decision…', hld: 'Finalizing HLD and ADR…', wireframing: 'Generating product flow…', publishing: 'Publishing to Notion…', 'planning-delivery': 'Preparing Jira backlog…', 'creating-jira': 'Creating the approved Jira hierarchy…', 'preparing-code': 'Preparing controlled coding context…', deleting: 'Deleting project…', success: 'Build another project', error: 'Try again',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readJson(response: Response) {
  const body: unknown = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(body && typeof body === 'object' && 'error' in body ? String(body.error) : `Request failed with ${response.status}`);
  return body as Record<string, unknown>;
}

function latestDocuments(documents: GeneratedDocument[], graphVersion: number) {
  return documents.filter((document) => (document.sourceGraphVersion ?? graphVersion) === graphVersion).sort((a, b) => b.version - a.version).filter((document, index, all) => all.findIndex((candidate) => candidate.type === document.type) === index);
}

function documentDescription(type: string) {
  if (type === 'requirements') return 'Functional scope, acceptance intent, decisions, risks, and traceability.';
  if (type === 'srs') return 'A complete product contract with actors, interfaces, business rules, and open items.';
  if (type === 'nfr') return 'Measurable performance, reliability, security, cost, and verification boundaries.';
  if (type === 'hld') return 'System context, components, deployment, sequences, failures, and technology direction.';
  return 'The approved architecture decision, rejected alternatives, risks, and reconsideration triggers.';
}

export function WorkspaceHome({ onOpenSample, onBackHome }: { onOpenSample: () => void; onBackHome: () => void }) {
  const [projectName, setProjectName] = useState('');
  const [sources, setSources] = useState<IntakeSource[]>([]);
  const [transcript, setTranscript] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [storedProjects, setStoredProjects] = useState<StoredProject[]>([]);
  const [projectLibraryOpen, setProjectLibraryOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<StoredProject | null>(null);
  const [notionConfigured, setNotionConfigured] = useState(false);
  const [jiraConfigured, setJiraConfigured] = useState(false);
  const [jiraConnection, setJiraConnection] = useState<JiraConnectionView>({ configured: false });
  const [deliveryPlan, setDeliveryPlan] = useState<JiraBacklogPlan | null>(null);
  const [codingPacket, setCodingPacket] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<WireframeTemplateId>('saas-admin');
  const [clarificationDrafts, setClarificationDrafts] = useState<Record<string, string>>({});
  const [wireframe, setWireframe] = useState<WireframeHandoff | null>(null);
  const [showWireframeStudio, setShowWireframeStudio] = useState(false);
  const [openDocument, setOpenDocument] = useState<GeneratedDocument | null>(null);
  const [activeStage, setActiveStage] = useState<Stage>('documents');
  const [architectureQuestion, setArchitectureQuestion] = useState('');
  const [architectureAnswer, setArchitectureAnswer] = useState<{ answer: string; citations: string[] } | null>(null);
  const [architectureError, setArchitectureError] = useState('');
  const [askingArchitecture, setAskingArchitecture] = useState(false);
  const [openingProjectId, setOpeningProjectId] = useState('');
  const [activeClarification, setActiveClarification] = useState('');
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const projectLibraryRef = useModalDialog(closeProjectLibrary, projectLibraryOpen);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch('/api/integrations/notion/status', { signal: controller.signal }).then((response) => response.json()),
      fetch('/api/integrations/jira/status', { signal: controller.signal }).then((response) => response.json()),
      fetch('/api/projects', { signal: controller.signal }).then(readJson),
    ]).then(([notion, jira, projects]) => {
      setNotionConfigured(Boolean((notion as { configured?: boolean }).configured));
      const jiraView = jira as JiraConnectionView;
      setJiraConnection(jiraView);
      setJiraConfigured(Boolean(jiraView.connected));
      setStoredProjects(((projects.projects as StoredProject[] | undefined) ?? []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    }).catch(() => { if (!controller.signal.aborted) setNotice('The local project library could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setConnectionsLoading(false); });
    return () => controller.abort();
  }, []);

  async function refreshProjects() {
    const body = await readJson(await fetch('/api/projects'));
    setStoredProjects(((body.projects as StoredProject[] | undefined) ?? []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  function resetWorkspace() {
    setProjectName(''); setSources([]); setTranscript(''); setShowTranscript(false); setNotice(''); setStatus('idle'); setResult(null); setSelectedOptionId(''); setClarificationDrafts({}); setWireframe(null); setShowWireframeStudio(false); setOpenDocument(null); setActiveStage('documents'); setArchitectureAnswer(null); setArchitectureError(''); setArchitectureQuestion(''); setDeliveryPlan(null); setCodingPacket('');
  }

  function closeProjectLibrary() {
    setProjectLibraryOpen(false);
    setPendingDelete(null);
  }

  async function openStoredProject(project: StoredProject) {
    setOpeningProjectId(project.id);
    setStatus('loading'); setNotice(''); setProjectLibraryOpen(false); setWireframe(null); setOpenDocument(null); setDeliveryPlan(null); setCodingPacket('');
    try {
      const bundle = await readJson(await fetch(`/api/projects/${project.id}`));
      const knowledge = bundle.knowledge as { entities?: KnowledgeEntity[]; gaps?: ProjectGap[]; clarificationQuestions?: ClarificationQuestion[]; readiness?: ProjectReadiness; techStack?: TechStackRecommendation[]; architectureOptions?: ArchitectureOption[] } | null;
      const graphVersion = (bundle.project as { graphVersion: number }).graphVersion;
      setProjectName(project.name); setSources([]);
      if (!knowledge) { setResult(null); setStatus('idle'); setNotice('This project has sources but has not been analyzed. Add new context or rebuild its intelligence.'); return; }
      const documents = latestDocuments((bundle.documents as GeneratedDocument[] | undefined) ?? [], graphVersion);
      const arbDecision = bundle.arbDecision as { optionId?: string; graphVersion?: number } | null;
      const publication = bundle.notionPublication as { projectPageUrl?: string } | null;
      const jiraPublication = bundle.jiraPublication as JiraPublication | null;
      const documentApproval = bundle.documentApproval as DocumentApproval | null;
      const architectureOptions = knowledge.architectureOptions ?? [];
      const currentApproval = arbDecision?.graphVersion === graphVersion ? arbDecision.optionId : undefined;
      setSelectedOptionId(currentApproval ?? architectureOptions.find((option) => option.recommended)?.id ?? architectureOptions[0]?.id ?? '');
      setResult({ projectId: project.id, graphVersion, entities: knowledge.entities ?? [], gaps: knowledge.gaps ?? [], clarificationQuestions: knowledge.clarificationQuestions ?? [], readiness: knowledge.readiness, techStack: knowledge.techStack ?? [], architectureOptions, documents, documentApproval: documentApproval?.graphVersion === graphVersion ? documentApproval : undefined, approvedOptionId: currentApproval, notionUrl: publication?.projectPageUrl, jiraPublication: jiraPublication?.sourceGraphVersion === graphVersion ? jiraPublication : undefined });
      setActiveStage(currentApproval ? 'handoff' : documentApproval?.graphVersion === graphVersion ? 'wireflow' : 'documents');
      if (currentApproval) {
        const delivery = await readJson(await fetch(`/api/projects/${project.id}/delivery/plan`));
        setDeliveryPlan(delivery.plan as JiraBacklogPlan);
      }
      setStatus('success'); setNotice(`Opened ${project.name}.`);
    } catch (cause) { setStatus('error'); setNotice(cause instanceof Error ? cause.message : String(cause)); }
    finally { setOpeningProjectId(''); }
  }

  function addFiles(files: FileList | null, kind: 'FILE' | 'FOLDER_FILE') {
    if (!files?.length) return;
    const next = Array.from(files).map((file, index) => ({ id: `${kind}-${file.name}-${file.size}-${index}-${Date.now()}`, name: file.webkitRelativePath || file.name, detail: `${formatBytes(file.size)} · ${file.type || 'Document'}`, kind, file, relativePath: file.webkitRelativePath || undefined } satisfies IntakeSource));
    setSources((current) => [...current, ...next]); setNotice('');
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); addFiles(event.dataTransfer.files, 'FILE'); }

  function addTranscript() {
    const value = transcript.trim(); if (!value) return;
    const number = sources.filter((item) => item.kind === 'MEETING_TRANSCRIPT').length + 1;
    const file = new File([value], `meeting-transcript-${number}.txt`, { type: 'text/plain' });
    setSources((current) => [...current, { id: `Transcript-${Date.now()}`, name: `Meeting transcript ${number}`, detail: `${value.split(/\s+/).length} words · Pasted transcript`, kind: 'MEETING_TRANSCRIPT', file }]);
    setTranscript(''); setShowTranscript(false);
  }

  async function publish(projectId: string) {
    setStatus('publishing');
    const body = await readJson(await fetch(`/api/projects/${projectId}/publish/notion`, { method: 'POST' }));
    return (body.publication as { projectPageUrl?: string } | undefined)?.projectPageUrl;
  }

  async function createProject() {
    if (!projectName.trim() || !sources.length) return;
    setNotice('');
    try {
      setStatus('creating');
      const projectBody = await readJson(await fetch('/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: projectName }) }));
      const projectId = (projectBody.project as { id: string }).id;
      setStatus('uploading');
      const form = new FormData();
      for (const source of sources) { form.append('files', source.file, source.file.name); form.append('relativePaths', source.relativePath ?? ''); form.append('kinds', source.kind); }
      await readJson(await fetch(`/api/projects/${projectId}/sources`, { method: 'POST', body: form }));
      setStatus('analyzing');
      const analysisBody = await readJson(await fetch(`/api/projects/${projectId}/analyze`, { method: 'POST' }));
      const knowledge = analysisBody.knowledge as PipelineResult & { graphVersion: number };
      const architectureOptions = knowledge.architectureOptions ?? [];
      setSelectedOptionId(architectureOptions.find((option) => option.recommended)?.id ?? architectureOptions[0]?.id ?? '');
      setStatus('documenting');
      const documentBody = await readJson(await fetch(`/api/projects/${projectId}/documents`, { method: 'POST' }));
      const documents = latestDocuments((documentBody.documents as GeneratedDocument[]) ?? [], knowledge.graphVersion);
      const localResult = { projectId, graphVersion: knowledge.graphVersion, entities: knowledge.entities ?? [], gaps: knowledge.gaps ?? [], clarificationQuestions: knowledge.clarificationQuestions ?? [], readiness: knowledge.readiness, techStack: knowledge.techStack ?? [], architectureOptions, documents };
      setResult(localResult);
      setActiveStage('documents'); setStatus('success');
      setNotice('Your project system is ready for review.');
      await refreshProjects();
      if (notionConfigured) {
        try {
          const notionUrl = await publish(projectId);
          setResult((current) => current?.projectId === projectId ? { ...current, notionUrl } : current);
          setStatus('success'); setNotice('Your project system is ready and available in Notion.');
        } catch (cause) {
          setStatus('success'); setNotice(`Your project is ready locally. Notion publication needs attention: ${cause instanceof Error ? cause.message : String(cause)}`);
        }
      }
    } catch (cause) { setStatus('error'); setNotice(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function rebuildProjectIntelligence() {
    if (!result) return;
    try {
      setStatus('analyzing');
      const analysisBody = await readJson(await fetch(`/api/projects/${result.projectId}/analyze`, { method: 'POST' }));
      const knowledge = analysisBody.knowledge as PipelineResult & { graphVersion: number };
      setStatus('documenting');
      const documentBody = await readJson(await fetch(`/api/projects/${result.projectId}/documents`, { method: 'POST' }));
      const documents = latestDocuments((documentBody.documents as GeneratedDocument[]) ?? [], knowledge.graphVersion);
      const architectureOptions = knowledge.architectureOptions ?? [];
      setSelectedOptionId(architectureOptions.find((option) => option.recommended)?.id ?? architectureOptions[0]?.id ?? '');
      setResult({ ...result, graphVersion: knowledge.graphVersion, entities: knowledge.entities ?? [], gaps: knowledge.gaps ?? [], clarificationQuestions: knowledge.clarificationQuestions ?? [], readiness: knowledge.readiness, techStack: knowledge.techStack ?? [], architectureOptions, documents, documentApproval: undefined, approvedOptionId: undefined });
      setStatus('success'); setNotice('Project intelligence and the complete document baseline were rebuilt.');
    } catch (cause) { setStatus('error'); setNotice(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function publishExisting() {
    if (!result) return;
    try { const notionUrl = await publish(result.projectId); setResult({ ...result, notionUrl }); setStatus('success'); setNotice('The current document versions are now available in Notion.'); await refreshProjects(); }
    catch (cause) { setStatus('error'); setNotice(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function prepareDeliveryPlan(projectId = result?.projectId) {
    if (!projectId) return;
    try {
      setStatus('planning-delivery');
      const body = await readJson(await fetch(`/api/projects/${projectId}/delivery/plan`));
      setDeliveryPlan(body.plan as JiraBacklogPlan);
      const publication = body.publication as JiraPublication | null;
      if (publication) setResult((current) => current?.projectId === projectId ? { ...current, jiraPublication: publication } : current);
      setStatus('success'); setNotice(publication ? 'The approved Jira backlog is connected to this project.' : 'Jira epic and child stories are ready for review. Nothing has been created externally yet.');
    } catch (cause) { setStatus('error'); setNotice(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function createJiraBacklog() {
    if (!result || !deliveryPlan) return;
    try {
      setStatus('creating-jira');
      const body = await readJson(await fetch(`/api/projects/${result.projectId}/delivery/jira`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: true, planHash: deliveryPlan.sha256 }) }));
      const publication = body.publication as JiraPublication;
      setResult({ ...result, jiraPublication: publication }); setStatus('success'); setNotice(`${publication.epicKey} and ${publication.stories.length} child stories were created in Jira.`); await refreshProjects();
    } catch (cause) { setStatus('error'); setNotice(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function prepareCodingTask(storyId: string) {
    if (!result) return;
    try {
      setStatus('preparing-code');
      const body = await readJson(await fetch(`/api/projects/${result.projectId}/delivery/coding-task`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ storyId }) }));
      setCodingPacket(String(body.packet)); setStatus('success'); setNotice('Controlled coding context is ready. Select an explicit repository workspace and allowlist before authorizing code writes.');
    } catch (cause) { setStatus('error'); setNotice(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function answerClarification(question: ClarificationQuestion, answerValue?: string) {
    if (!result) return;
    const answer = (answerValue ?? clarificationDrafts[question.id] ?? '').trim(); if (!answer) return;
    const clarificationAction = `${question.id}:${answer}`;
    setActiveClarification(clarificationAction);
    try {
      setStatus('clarifying');
      const body = await readJson(await fetch(`/api/projects/${result.projectId}/clarifications/${question.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answer }) }));
      const knowledge = body.knowledge as PipelineResult & { graphVersion: number };
      const documents = latestDocuments((body.documents as GeneratedDocument[]) ?? [], knowledge.graphVersion);
      setClarificationDrafts((current) => ({ ...current, [question.id]: '' }));
      setResult({ ...result, graphVersion: knowledge.graphVersion, entities: knowledge.entities, gaps: knowledge.gaps, clarificationQuestions: knowledge.clarificationQuestions, readiness: knowledge.readiness, techStack: knowledge.techStack, architectureOptions: knowledge.architectureOptions, documents, documentApproval: undefined, approvedOptionId: undefined });
      setStatus('success'); setNotice(`Decision recorded. Readiness is now ${knowledge.readiness?.score ?? 'UNKNOWN'}/100 and affected documents were regenerated.`);
      await refreshProjects();
    } catch (cause) { setStatus('error'); setNotice(cause instanceof Error ? cause.message : String(cause)); }
    finally { setActiveClarification(''); }
  }

  async function approveDocuments() {
    if (!result) return;
    try {
      setStatus('approving-documents');
      const body = await readJson(await fetch(`/api/projects/${result.projectId}/documents/approve`, { method: 'POST' }));
      const documentApproval = body.approval as DocumentApproval;
      setResult({ ...result, documentApproval }); setActiveStage('wireflow'); setStatus('success'); setNotice('Document baseline approved. Wireflow is available as an optional product-review step.'); await refreshProjects();
    } catch (cause) { setStatus('error'); setNotice(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function reviseDocument(document: ReviewDocument, section: string, instruction: string) {
    if (!result) return;
    setStatus('revising-document');
    const body = await readJson(await fetch(`/api/projects/${result.projectId}/documents/${encodeURIComponent(document.id)}/revise`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ section, instruction }) }));
    const revised = body.document as GeneratedDocument;
    const documents = latestDocuments([...result.documents, revised], result.graphVersion);
    setResult({ ...result, documents, documentApproval: undefined }); setOpenDocument(revised); setStatus('success'); setNotice(`Revised “${section}” as document v${revised.version}. Review and approve the updated baseline.`);
  }

  async function generateWireframes() {
    if (!result?.documentApproval && !result?.approvedOptionId) return;
    try {
      setStatus('wireframing');
      const body = await readJson(await fetch(`/api/projects/${result.projectId}/wireframes`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ templateId: selectedTemplateId }) }));
      const generated = body.wireframe as WireframeHandoff;
      setWireframe(generated); setShowWireframeStudio(false); setStatus('success'); setNotice(`${generated.templateName} produced ${generated.screens.length} requirement-linked screens and an interactive flow.`);
    } catch (cause) { setStatus('error'); setNotice(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function approveArchitecture() {
    if (!result || !selectedOptionId) return;
    try {
      setStatus('approving');
      await readJson(await fetch(`/api/projects/${result.projectId}/arb`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ optionId: selectedOptionId }) }));
      setStatus('hld');
      const hldBody = await readJson(await fetch(`/api/projects/${result.projectId}/hld`, { method: 'POST' }));
      const architectureDocuments = (hldBody.documents as GeneratedDocument[] | undefined) ?? [];
      const documents = latestDocuments([...result.documents, ...architectureDocuments], result.graphVersion);
      setResult({ ...result, documents, approvedOptionId: selectedOptionId }); setActiveStage('handoff'); setStatus('success'); setNotice('Architecture approved. The ADR and final HLD with diagrams are ready.'); await refreshProjects();
      await prepareDeliveryPlan(result.projectId);
      if (notionConfigured) {
        try {
          const notionUrl = await publish(result.projectId);
          setResult((current) => current?.projectId === result.projectId ? { ...current, notionUrl } : current);
          setStatus('success'); setNotice('Architecture approved. The final HLD, ADR, and rendered diagrams are available in Notion.');
        } catch (cause) {
          setStatus('success'); setNotice(`Architecture is approved locally. Notion publication needs attention: ${cause instanceof Error ? cause.message : String(cause)}`);
        }
      }
    } catch (cause) { setStatus('error'); setNotice(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function askArchitecture() {
    if (!result || !architectureQuestion.trim()) return;
    setAskingArchitecture(true); setArchitectureAnswer(null); setArchitectureError('');
    try {
      const body = await readJson(await fetch(`/api/projects/${result.projectId}/architecture/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: architectureQuestion, selectedOptionId }) }));
      setArchitectureAnswer({ answer: String(body.answer), citations: (body.citations as string[]) ?? [] });
    } catch (cause) { setArchitectureError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setAskingArchitecture(false); }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setStatus('deleting');
    try {
      await readJson(await fetch(`/api/projects/${pendingDelete.id}`, { method: 'DELETE' }));
      if (result?.projectId === pendingDelete.id) resetWorkspace();
      setPendingDelete(null); setStatus('idle'); await refreshProjects();
    } catch (cause) { setStatus('error'); setNotice(cause instanceof Error ? cause.message : String(cause)); }
  }

  function downloadDocument(document: GeneratedDocument) {
    const blob = new Blob([document.content], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = `${document.type}-v${document.version}.md`; anchor.click(); URL.revokeObjectURL(url);
  }

  const busy = !['idle', 'success', 'error'].includes(status);
  const currentOption = result?.architectureOptions.find((option) => option.id === selectedOptionId) ?? result?.architectureOptions[0];
  const openBlockers = result?.gaps.filter((gap) => gap.status === 'OPEN' && gap.severity === 'BLOCKER') ?? [];
  const openQuestions = result?.clarificationQuestions.filter((question) => question.status === 'OPEN') ?? [];
  const documentsApproved = Boolean(result?.documentApproval && result.documentApproval.graphVersion === result.graphVersion);
  const stages: Array<{ id: Stage; label: string; detail: string; unlocked: boolean }> = [
    { id: 'documents', label: 'Documents', detail: 'Review & shape', unlocked: true },
    { id: 'wireflow', label: 'Wireflow', detail: 'Optional experience', unlocked: documentsApproved || Boolean(result?.approvedOptionId) },
    { id: 'architecture', label: 'Architecture', detail: 'What, why, why not', unlocked: documentsApproved || Boolean(result?.approvedOptionId) },
    { id: 'handoff', label: 'Delivery', detail: 'Jira & controlled code', unlocked: Boolean(result?.approvedOptionId) },
  ];

  return <main id="main-content" className="experience-shell" tabIndex={-1}>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{busy ? statusCopy[status] : connectionsLoading ? 'Checking integrations and saved projects…' : ''}</div>
    <header className="experience-topbar"><button type="button" className="experience-brand" onClick={onBackHome}><span>A</span><b>Axiom</b></button><div className="experience-top-actions"><span className={`connection-pill ${notionConfigured ? 'connected' : ''}`}><i /> Notion {connectionsLoading ? 'checking…' : notionConfigured ? 'connected' : 'not configured'}</span><span className={`connection-pill ${jiraConfigured ? 'connected' : ''}`} title={jiraConnection.error}><i /> Jira {connectionsLoading ? 'checking…' : jiraConfigured ? `${jiraConnection.projectKey} connected` : jiraConnection.configured ? 'needs attention' : 'not configured'}</span><button type="button" className="ghost-action" onClick={() => setProjectLibraryOpen(true)}>Projects <span>{storedProjects.length}</span></button>{result ? <button type="button" className="solid-action" onClick={resetWorkspace}>+ New project</button> : <button type="button" className="ghost-action" onClick={onOpenSample}>View sample</button>}</div></header>

    {!result ? <div className="intake-experience">
      <section className="intake-hero"><span className="experience-kicker"><i /> Start with real project context</span><h1>Upload the context.<br /><em>Get the whole system.</em></h1><p>Axiom reads product documents and conversations, then creates a source-linked requirements catalogue, SRS, NFR specification, proposed HLD, and architecture diagrams.</p></section>
      <section className="intake-workbench" aria-labelledby="intake-title">
        <div className="intake-form-column"><div className="intake-form-heading"><div><span>01</span><div><h2 id="intake-title">Create a project intelligence space</h2><p>One focused place for this product and every version that follows.</p></div></div><small>Private local workspace</small></div>
          <label htmlFor="project-name">Project name</label><input id="project-name" value={projectName} disabled={busy} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. Digital lending modernization" />
          <div className="intake-dropzone" onDrop={handleDrop} onDragOver={(event) => event.preventDefault()}><div className="upload-orbit"><span>↑</span></div><h3>Drop files or a project folder</h3><p>PDF, DOCX, Markdown, TXT, CSV, JSON, YAML · up to 10 MB each</p><div><button type="button" onClick={() => fileInput.current?.click()} disabled={busy}>Choose files</button><button type="button" onClick={() => folderInput.current?.click()} disabled={busy}>Choose folder</button><button type="button" onClick={() => setShowTranscript(true)} disabled={busy}>Paste transcript</button></div><input ref={fileInput} hidden type="file" multiple onChange={(event) => addFiles(event.target.files, 'FILE')} /><input ref={folderInput} hidden type="file" multiple {...{ webkitdirectory: '' }} onChange={(event) => addFiles(event.target.files, 'FOLDER_FILE')} /></div>
          {showTranscript ? <div className="transcript-composer"><div><b>Meeting transcript</b><button type="button" aria-label="Close transcript composer" onClick={() => setShowTranscript(false)}>×</button></div><textarea aria-label="Paste meeting transcript" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="Paste discovery notes, meeting transcripts, decisions, or open questions…" /><button type="button" disabled={!transcript.trim()} onClick={addTranscript}>Add transcript</button></div> : null}
          {sources.length ? <div className="intake-source-list" aria-label="Added sources">{sources.map((source) => <div key={source.id}><span>{source.kind === 'MEETING_TRANSCRIPT' ? 'MT' : source.kind === 'FOLDER_FILE' ? 'FD' : 'DC'}</span><div><b>{source.name}</b><small>{source.detail}</small></div><i>Ready</i><button type="button" aria-label={`Remove ${source.name}`} onClick={() => setSources((current) => current.filter((item) => item.id !== source.id))}>×</button></div>)}</div> : null}
          <div className="intake-submit"><div><b>{sources.length || 'No'} source{sources.length === 1 ? '' : 's'} ready</b><small>Exact source references will be preserved.</small></div><button type="button" className="primary-glow-button compact" aria-busy={busy} disabled={busy || !projectName.trim() || !sources.length} onClick={createProject}><ActionLabel loading={busy} loadingText={statusCopy[status]}>{status === 'error' ? 'Try project creation again' : 'Create project system'} <span>→</span></ActionLabel></button></div>
          {notice ? <p className={`experience-notice ${status === 'error' ? 'error' : ''}`} role={status === 'error' ? 'alert' : 'status'}>{notice}</p> : null}
        </div>
        <aside className="intake-outcome-column"><span className="mini-kicker">What Axiom creates</span><h2>One upload. Four connected views.</h2><div className="outcome-list"><article><span>RQ</span><div><b>Requirements catalogue</b><small>Grounded scope, gaps, acceptance intent</small></div></article><article><span>SR</span><div><b>Detailed SRS</b><small>Actors, interfaces, rules, traceability</small></div></article><article><span>NF</span><div><b>NFR specification</b><small>Targets, constraints, verification boundaries</small></div></article><article><span>HD</span><div><b>Proposed HLD + diagrams</b><small>Context, components, deployment, sequence</small></div></article></div><div className="notion-outcome"><span>N</span><div><b>{notionConfigured ? 'Notion is ready' : 'Notion can be connected'}</b><small>Review the same living document system with your team.</small></div></div></aside>
      </section>
      <div className="intake-bottom-line"><span>Your documents stay the source of truth</span><i /><span>Every suggestion remains reviewable</span><i /><span>No fabricated proof</span></div>
    </div> : <div className="project-experience">
      <header className="project-experience-header"><div><button type="button" onClick={() => setProjectLibraryOpen(true)}>← All projects</button><span className="experience-kicker"><i /> Project intelligence</span><h1>{projectName}</h1><p>Graph v{result.graphVersion} · {result.entities.length} grounded entities · {result.readiness ? `${result.readiness.score}/100 readiness` : 'legacy analysis'}</p></div><div>{result.notionUrl ? <a className="notion-jump" href={result.notionUrl} target="_blank" rel="noreferrer"><span>N</span> Review in Notion ↗</a> : <button type="button" className="notion-jump" aria-busy={status === 'publishing'} disabled={!notionConfigured || busy} onClick={publishExisting}><span>N</span> <ActionLabel loading={status === 'publishing'} loadingText="Publishing to Notion…">{notionConfigured ? 'Publish to Notion' : 'Notion setup required'}</ActionLabel></button>}</div></header>
      <nav className="journey-nav" aria-label="Project review journey">{stages.map((stage, index) => <button type="button" key={stage.id} disabled={!stage.unlocked} className={activeStage === stage.id ? 'active' : ''} onClick={() => setActiveStage(stage.id)}><span>{String(index + 1).padStart(2, '0')}</span><div><b>{stage.label}</b><small>{stage.detail}</small></div>{stage.id === 'wireflow' ? <i>Optional</i> : null}</button>)}</nav>
      {notice ? <p className={`experience-notice project-notice ${status === 'error' ? 'error' : ''}`} role={status === 'error' ? 'alert' : 'status'}>{busy ? statusCopy[status] : notice}</p> : null}

      {activeStage === 'documents' ? <section className="stage-surface documents-stage">
        <div className="stage-heading"><div><span className="experience-kicker"><i /> Document system</span><h2>Review what Axiom understood.</h2><p>Open any artifact, inspect every section, then ask Axiom to revise only what needs to change.</p></div><div className="readiness-orbit"><strong>{result.readiness?.score ?? '—'}</strong><span>Readiness</span><small>{openBlockers.length} blocker{openBlockers.length === 1 ? '' : 's'}</small></div></div>
        {!result.readiness ? <div className="legacy-upgrade"><div><b>This project uses the earlier analysis model.</b><p>Rebuild it from its saved sources to get detailed architecture, contextual technology recommendations, gaps, and HLD diagrams.</p></div><button type="button" aria-busy={status === 'analyzing' || status === 'documenting'} disabled={busy} onClick={rebuildProjectIntelligence}><ActionLabel loading={status === 'analyzing' || status === 'documenting'} loadingText={statusCopy[status]}>Upgrade project intelligence</ActionLabel></button></div> : null}
        <div className="review-document-grid">{result.documents.filter((document) => document.type !== 'adr').map((document) => <article key={`${document.type}-${document.version}`}><div className="document-card-top"><span>{document.type.toUpperCase().slice(0, 3)}</span><div><small>{document.truthStatus ?? 'AI_SUGGESTED'}</small><b>{document.title}</b></div></div><p>{documentDescription(document.type)}</p><div><small>v{document.version} · graph v{document.sourceGraphVersion ?? result.graphVersion}</small><button type="button" onClick={() => setOpenDocument(document)}>Review & modify →</button></div></article>)}</div>
        {openQuestions.length ? <div className="decision-questions"><div className="question-heading"><div><span className="mini-kicker">Decisions needed</span><h3>{openQuestions.length} questions can materially improve the documents</h3></div><span>{openBlockers.length} block architecture approval</span></div>{openQuestions.map((question, index) => <details key={question.id} open={index === 0}><summary><span>{String(index + 1).padStart(2, '0')}</span><div><b>{question.question}</b><small>{question.whyItMatters}</small></div><i>{result.gaps.find((gap) => gap.id === question.gapId)?.severity}</i></summary><div className="question-answer-area"><div>{question.options.map((option) => { const loading = activeClarification === `${question.id}:${option.value}`; return <button type="button" key={option.id} aria-busy={loading} disabled={busy} onClick={() => answerClarification(question, option.value)}><ActionLabel loading={loading} loadingText="Applying answer…">{option.label}</ActionLabel></button>; })}</div><label htmlFor={`answer-${question.id}`}>Or give a precise answer</label><textarea id={`answer-${question.id}`} value={clarificationDrafts[question.id] ?? ''} onChange={(event) => setClarificationDrafts((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="Add project-specific context…" /><button type="button" className="solid-action" aria-busy={activeClarification === `${question.id}:${(clarificationDrafts[question.id] ?? '').trim()}`} disabled={busy || !(clarificationDrafts[question.id] ?? '').trim()} onClick={() => answerClarification(question)}><ActionLabel loading={activeClarification === `${question.id}:${(clarificationDrafts[question.id] ?? '').trim()}`} loadingText="Applying answer…">Apply answer</ActionLabel></button></div></details>)}</div> : <div className="all-clear"><span>✓</span><div><b>No clarification question remains.</b><p>The document baseline is ready for product approval.</p></div></div>}
        <div className="document-approval-bar"><div>{documentsApproved ? <><span className="approved-mark">✓</span><div><b>Document baseline approved</b><small>Approved at graph v{result.graphVersion}. Wireflow and architecture review are unlocked.</small></div></> : <><span className="approval-mark">◇</span><div><b>Ready to approve the document baseline?</b><small>Approval records the exact hashes of Requirements, SRS, NFR, and proposed HLD.</small></div></>}</div><div>{result.notionUrl ? <a href={result.notionUrl} target="_blank" rel="noreferrer">Review in Notion ↗</a> : null}<button type="button" className="primary-glow-button compact" aria-busy={status === 'approving-documents'} disabled={busy || documentsApproved || !result.readiness} onClick={approveDocuments}><ActionLabel loading={status === 'approving-documents'} loadingText="Approving documents…">{documentsApproved ? 'Approved' : 'Approve documents'} <span>→</span></ActionLabel></button></div></div>
      </section> : null}

      {activeStage === 'wireflow' ? <section className="stage-surface wireflow-stage">
        <div className="stage-heading"><div><span className="experience-kicker"><i /> Optional wireflow</span><h2>See the product before choosing the stack.</h2><p>Select a product pattern. Axiom maps your requirements and open design decisions into a distinct screen journey you can edit or skip.</p></div><button type="button" className="ghost-action" onClick={() => setActiveStage('architecture')}>Skip to architecture →</button></div>
        <TemplateGallery selected={selectedTemplateId} onSelect={setSelectedTemplateId} />
        <div className="template-action-bar"><div><b>Selected product pattern</b><span>{selectedTemplateId.replaceAll('-', ' ')}</span></div><button type="button" className="primary-glow-button compact" aria-busy={status === 'wireframing'} disabled={busy} onClick={generateWireframes}><ActionLabel loading={status === 'wireframing'} loadingText="Generating product flow…">{wireframe ? 'Regenerate selected flow' : 'Generate product flow'} <span>✦</span></ActionLabel></button></div>
        {wireframe ? <div className="wireflow-preview"><div className="wireflow-preview-heading"><div><span className="mini-kicker">Generated journey</span><h3>{wireframe.templateName}</h3><p>{wireframe.coverage.coveredEntityCount}/{wireframe.coverage.totalEntityCount} requirement and NFR items mapped.</p></div><button type="button" className="solid-action" onClick={() => setShowWireframeStudio(true)}>Open editable studio</button></div><div className="flow-map">{wireframe.screens.map((screen, index) => <div key={screen.id}><article><span>{String(index + 1).padStart(2, '0')}</span><b>{screen.title}</b><small>{screen.purpose}</small><i>{screen.requiredStates.length} states</i></article>{index < wireframe.screens.length - 1 ? <em>→</em> : null}</div>)}</div><div className="wireflow-next"><span>Wireflow is a design hypothesis. You can refine it later without blocking architecture.</span><button type="button" onClick={() => setActiveStage('architecture')}>Continue to architecture →</button></div></div> : null}
      </section> : null}

      {activeStage === 'architecture' && currentOption ? <section className="stage-surface architecture-stage">
        <div className="stage-heading"><div><span className="experience-kicker"><i /> Architecture decision lab</span><h2>Choose with context, not fashion.</h2><p>Compare three viable directions. Axiom explains what, why, why not, failure behavior, cost basis, and the trigger that should reopen the decision.</p></div><span className="truth-chip">AI_SUGGESTED</span></div>
        <div className="architecture-selector">{result.architectureOptions.map((option) => <button type="button" key={option.id} className={selectedOptionId === option.id ? 'selected' : ''} onClick={() => { setSelectedOptionId(option.id); setArchitectureAnswer(null); setArchitectureError(''); }} disabled={Boolean(result.approvedOptionId)}><span>{option.recommended ? 'Recommended for current evidence' : 'Viable alternative'}</span><b>{option.name}</b><small>{option.deploymentModel}</small><i>{Object.values(option.scoreBreakdown).length ? `${Math.round(Object.values(option.scoreBreakdown).reduce((total, score) => total + score, 0) / Object.values(option.scoreBreakdown).length * 20)} fit` : 'Review'}</i></button>)}</div>
        <div className="architecture-focus"><ArchitectureDiagrams option={currentOption} projectName={projectName} /><div className="architecture-reasoning"><div className="reasoning-title"><span>{currentOption.recommended ? 'Recommended' : 'Alternative'}</span><h3>{currentOption.name}</h3><p>{currentOption.summary}</p></div><div className="reasoning-grid"><article><span>WHAT</span><p>{currentOption.deploymentModel}</p></article><article><span>WHY</span><ul>{currentOption.why.map((item) => <li key={item}>{item}</li>)}</ul></article><article><span>WHY NOT</span><ul>{currentOption.whyNot.map((item) => <li key={item}>{item}</li>)}</ul></article><article><span>RECONSIDER WHEN</span><ul>{currentOption.reconsiderationTriggers.map((item) => <li key={item.metric}><b>{item.metric}:</b> {item.condition}</li>)}</ul></article></div></div></div>
        <div className="technology-direction"><div><span className="mini-kicker">Contextual technology direction</span><h3>Recommended layers for this project</h3></div><div>{result.techStack.map((item) => <article key={item.id}><span>{item.layer}</span><b>{item.recommendation}</b><p>{item.rationale}</p><small>Alternative: {item.alternatives[0]}</small></article>)}</div></div>
        <div className="ask-axiom"><div><span className="ai-orb">✦</span><div><h3>Ask Axiom about this decision</h3><p>Ask “why not microservices?”, “what fails?”, “what will this cost?”, or anything grounded in the current graph.</p></div></div><div className="ask-composer"><textarea aria-label="Ask an architecture question" value={architectureQuestion} onChange={(event) => setArchitectureQuestion(event.target.value)} placeholder="Why is this a better fit than event-driven services for our current scope?" /><button type="button" aria-busy={askingArchitecture} disabled={askingArchitecture || !architectureQuestion.trim()} onClick={askArchitecture}><ActionLabel loading={askingArchitecture} loadingText="Grounding answer…">Ask →</ActionLabel></button></div>{architectureError ? <p className="experience-notice error" role="alert"><b>Question could not be answered.</b> {architectureError} Review the question and try again.</p> : null}{architectureAnswer ? <div className="grounded-answer"><span>AI_SUGGESTED · grounded answer</span><p>{architectureAnswer.answer}</p><small>References: {architectureAnswer.citations.join(' · ') || 'No matching entity reference'}</small></div> : null}</div>
        <div className="architecture-approval-bar"><div>{openBlockers.length ? <><span className="approval-mark">!</span><div><b>{openBlockers.length} blocking decision{openBlockers.length === 1 ? '' : 's'} remain</b><small>Return to Documents and answer them before final approval.</small></div></> : <><span className="approved-mark">✓</span><div><b>Architecture decision is ready</b><small>Approval generates the final HLD diagrams and ADR, then republishes Notion.</small></div></>}</div><button type="button" className="primary-glow-button compact" aria-busy={status === 'approving' || status === 'hld'} disabled={busy || openBlockers.length > 0 || Boolean(result.approvedOptionId)} onClick={approveArchitecture}><ActionLabel loading={status === 'approving' || status === 'hld'} loadingText={statusCopy[status]}>{result.approvedOptionId ? 'Architecture approved' : 'Approve architecture'} <span>→</span></ActionLabel></button></div>
      </section> : null}

      {activeStage === 'handoff' && currentOption ? <><DeliveryStage plan={deliveryPlan} publication={result.jiraPublication ?? null} jiraConfigured={jiraConfigured} jiraProjectKey={jiraConnection.projectKey} jiraError={jiraConnection.error} codingPacket={codingPacket} busy={busy} loadingAction={status === 'publishing' ? 'notion' : status === 'planning-delivery' ? 'plan' : status === 'creating-jira' ? 'jira' : status === 'preparing-code' ? 'coding' : null} option={currentOption} projectName={projectName} notionUrl={result.notionUrl} onReviewDecision={() => setActiveStage('architecture')} onPublishNotion={publishExisting} onPreparePlan={() => prepareDeliveryPlan()} onCreateJira={createJiraBacklog} onPrepareCoding={prepareCodingTask} onOpenExecutableSample={onOpenSample} /><div className="handoff-documents">{result.documents.filter((document) => document.type === 'hld' || document.type === 'adr').map((document) => <article key={`${document.type}-${document.version}`}><span>{document.type.toUpperCase()}</span><div><b>{document.title}</b><small>v{document.version} · {document.truthStatus}</small></div><button type="button" onClick={() => setOpenDocument(document)}>Open</button><button type="button" onClick={() => downloadDocument(document)}>Download</button></article>)}</div></> : null}
    </div>}

    {projectLibraryOpen ? <div ref={projectLibraryRef} className="project-library-backdrop" role="dialog" aria-modal="true" aria-labelledby="project-library-title" tabIndex={-1}><aside className="project-library"><header><div><span className="mini-kicker">Workspace</span><h2 id="project-library-title">Your projects</h2><p>Open one project at a time. Delete experiments you no longer need.</p></div><button type="button" aria-label="Close project library" data-modal-initial-focus onClick={closeProjectLibrary}>×</button></header><button type="button" className="new-project-row" onClick={() => { resetWorkspace(); setProjectLibraryOpen(false); }}><span>+</span><div><b>Start a new project</b><small>Upload a fresh source set</small></div></button><div className="project-library-list">{storedProjects.map((project) => { const loading = openingProjectId === project.id; return <article key={project.id}><button type="button" aria-busy={loading} disabled={busy} onClick={() => openStoredProject(project)}><span>{project.name.slice(0, 2).toUpperCase()}</span><div><b>{project.name}</b><small>{project.status.replaceAll('_', ' ').toLowerCase()} · {new Date(project.updatedAt).toLocaleDateString()}</small></div>{loading ? <span className="action-spinner" aria-hidden="true" /> : null}</button><button type="button" className="delete-project-button" aria-label={`Delete ${project.name}`} onClick={() => setPendingDelete(project)}>⌫</button></article>; })}{!storedProjects.length ? <p>No saved projects yet.</p> : null}</div><button type="button" className="sample-project-row" onClick={onOpenSample}><span>NF</span><div><b>NotifyFlow demo</b><small>Controlled build and proof journey</small></div><i>Open →</i></button>{pendingDelete ? <div className="delete-confirmation"><b>Delete “{pendingDelete.name}”?</b><p>This removes its local sources, documents, decisions, and saved wireframe revisions. Published Notion pages are not deleted.</p>{status === 'error' && notice ? <p className="revision-error" role="alert">Delete failed: {notice} You can retry or cancel.</p> : null}<div><button type="button" onClick={() => setPendingDelete(null)}>Cancel</button><button type="button" aria-busy={status === 'deleting'} disabled={status === 'deleting'} onClick={confirmDelete}><ActionLabel loading={status === 'deleting'} loadingText="Deleting project…">Delete project</ActionLabel></button></div></div> : null}</aside></div> : null}
    {openDocument && result ? <DocumentReviewStudio document={openDocument} projectName={projectName} architectureOption={openDocument.type === 'hld' ? currentOption : undefined} notionUrl={result.notionUrl} onClose={() => setOpenDocument(null)} onRevise={reviseDocument} /> : null}
    {wireframe && showWireframeStudio ? <WireframeStudio handoff={wireframe} onClose={() => setShowWireframeStudio(false)} /> : null}
  </main>;
}
