'use client';

import { useMemo, useState } from 'react';
import type { ArchitectureOption } from '../../src/projects/schemas';
import { guidedTextLimitError } from '../../src/projects/validation';
import { useModalDialog } from '../_hooks/use-modal-dialog';
import { ActionLabel } from './action-label';
import { ArchitectureDiagrams } from './architecture-diagrams';
import { MermaidDocumentBody } from './mermaid-document-body';

export type ReviewDocument = {
  id: string;
  type: string;
  title: string;
  version: number;
  sourceGraphVersion?: number;
  content: string;
  truthStatus?: string;
  revisedSection?: string;
  revisionProvider?: string;
};

function sections(content: string) {
  const matches = [...content.matchAll(/^(#{2,3})\s+(.+)$/gm)];
  return matches.map((match, index) => ({
    heading: match[2].trim(),
    level: match[1].length,
    body: content.slice((match.index ?? 0) + match[0].length, matches[index + 1]?.index ?? content.length).trim(),
  }));
}

export function DocumentReviewStudio({
  document,
  projectName,
  architectureOption,
  notionUrl,
  onClose,
  onRevise,
}: {
  document: ReviewDocument;
  projectName: string;
  architectureOption?: ArchitectureOption;
  notionUrl?: string;
  onClose: () => void;
  onRevise: (document: ReviewDocument, section: string, instruction: string) => Promise<void>;
}) {
  const documentSections = useMemo(() => sections(document.content), [document.content]);
  const [activeSection, setActiveSection] = useState(documentSections[0]?.heading ?? '');
  const [instruction, setInstruction] = useState('');
  const [revisionState, setRevisionState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [revisionError, setRevisionError] = useState('');
  const active = documentSections.find((section) => section.heading === activeSection) ?? documentSections[0];
  const instructionLimitError = guidedTextLimitError(instruction);
  const dialogRef = useModalDialog(onClose);

  async function revise() {
    if (!active || !instruction.trim() || instructionLimitError) return;
    setRevisionState('loading');
    setRevisionError('');
    try {
      await onRevise(document, active.heading, instruction.trim());
      setInstruction('');
      setRevisionState('idle');
    } catch (cause) {
      setRevisionState('error');
      setRevisionError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return <div ref={dialogRef} className="document-studio-overlay" role="dialog" aria-modal="true" aria-labelledby="document-studio-title" tabIndex={-1}>
    <div className="document-studio-shell">
      <header className="document-studio-header"><div><span className="document-type-mark">{document.type.toUpperCase().slice(0, 3)}</span><div><span className="mini-kicker">Document review</span><h2 id="document-studio-title">{document.title}</h2><p>{projectName} · v{document.version} · graph v{document.sourceGraphVersion ?? 1}</p></div></div><div>{notionUrl ? <a className="notion-jump" href={notionUrl} target="_blank" rel="noreferrer"><span>N</span> Review in Notion ↗</a> : null}<button type="button" className="close-round" aria-label="Close document review" data-modal-initial-focus onClick={onClose}>×</button></div></header>
      <div className="document-studio-layout">
        <aside className="document-outline" aria-label="Document outline"><span className="mini-kicker">Contents</span>{documentSections.map((section) => <button type="button" key={section.heading} className={active?.heading === section.heading ? 'active' : ''} onClick={() => setActiveSection(section.heading)}><i />{section.heading}</button>)}</aside>
        <main className="document-reader">
          <div className="reader-meta"><span className={`truth-chip ${document.truthStatus === 'HUMAN_APPROVED' ? 'approved' : ''}`}>{document.truthStatus ?? 'AI_SUGGESTED'}</span>{document.revisedSection ? <span>Last AI revision: {document.revisedSection} · {document.revisionProvider}</span> : <span>Compiled from the canonical project graph</span>}</div>
          {document.type === 'hld' && architectureOption ? <ArchitectureDiagrams option={architectureOption} projectName={projectName} status={document.truthStatus === 'HUMAN_APPROVED' ? 'HUMAN_APPROVED' : 'AI_SUGGESTED'} /> : null}
          <article className="markdown-reader"><span className="mini-kicker">Selected section</span><h1>{active?.heading}</h1><MermaidDocumentBody body={active?.body || 'No content is available in this section.'} label={active?.heading ?? 'Architecture'} /></article>
        </main>
        <aside className="ai-revision-panel"><span className="ai-orb">✦</span><span className="mini-kicker">Revise with Axiom</span><h3>Change this section</h3><p>Describe what should change. Stable IDs, sources, unknowns, and truth status are preserved.</p><div className="revision-suggestions"><button type="button" onClick={() => setInstruction('Make this section more detailed and add explicit acceptance criteria without inventing unsupported facts.')}>Add detail</button><button type="button" onClick={() => setInstruction('Clarify the responsibilities, edge cases, and unresolved decisions in this section.')}>Clarify gaps</button><button type="button" onClick={() => setInstruction('Rewrite this section for an executive and architecture review audience while preserving all technical meaning.')}>Executive rewrite</button></div><label htmlFor="document-revision-prompt">Revision instruction</label><textarea id="document-revision-prompt" value={instruction} onChange={(event) => setInstruction(event.target.value)} aria-invalid={Boolean(instructionLimitError)} aria-describedby={instructionLimitError ? 'document-revision-limit-error' : undefined} placeholder="e.g. Add a retention matrix and clarify who owns deletion approval…" />{instructionLimitError ? <p id="document-revision-limit-error" className="revision-error" role="alert">{instructionLimitError}</p> : null}<button type="button" className="primary-glow-button compact" aria-busy={revisionState === 'loading'} disabled={revisionState === 'loading' || !instruction.trim() || Boolean(instructionLimitError)} onClick={revise}><ActionLabel loading={revisionState === 'loading'} loadingText="Revising section…">Generate revision <span>✦</span></ActionLabel></button>{revisionError ? <p className="revision-error" role="alert">{revisionError}</p> : null}<small>AI output remains suggested until the updated document baseline is approved.</small></aside>
      </div>
    </div>
  </div>;
}
