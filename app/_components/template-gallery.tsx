'use client';

import { useState, type CSSProperties } from 'react';
import type { ProjectGap, WireframeTemplateId } from '../../src/projects/schemas';
import { compileWireframeTemplatePreview, type WireframeTemplatePreviewEntity } from '../../src/projects/wireframe-template-preview';
import { WIREFRAME_TEMPLATES, type WireframeTemplate } from '../../src/projects/wireframe-templates';
import { useModalDialog } from '../_hooks/use-modal-dialog';

type ProjectPreviewContext = { projectName: string; entities: WireframeTemplatePreviewEntity[]; gaps: ProjectGap[] };

function TemplatePreview({ accent, layout }: { accent: string; layout: string }) {
  return <div className={`template-preview layout-${layout}`} style={{ '--template-accent': accent } as CSSProperties} aria-hidden="true"><div className="preview-sidebar"><i /><i /><i /></div><div className="preview-main"><span /><div><i /><i /><i /></div><b /><b /></div></div>;
}

function TemplateFlowDialog({ template, context, onSelect, onClose }: {
  template: WireframeTemplate;
  context: ProjectPreviewContext;
  onSelect: (id: WireframeTemplateId) => void;
  onClose: () => void;
}) {
  const dialogRef = useModalDialog(onClose);
  const preview = compileWireframeTemplatePreview(template, context);
  return <div className="template-flow-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} className="template-flow-dialog" role="dialog" aria-modal="true" aria-labelledby="template-flow-title" tabIndex={-1} style={{ '--template-accent': template.accent } as CSSProperties}>
      <header><div><span>{template.category}</span><h2 id="template-flow-title">{template.name} for {context.projectName}</h2><p>Four project-aware screens compiled from the current canonical graph.</p></div><button type="button" className="close-round" data-modal-initial-focus aria-label="Close pattern preview" onClick={onClose}>×</button></header>
      <div className="template-flow-summary"><span>{preview.screens.length} screen preview</span><span>{preview.mappedEntityCount} confirmed graph items mapped</span><span>{preview.openGapCount} open decision{preview.openGapCount === 1 ? '' : 's'}</span><i>AI_SUGGESTED</i></div>
      <div className="template-flow-pages">{preview.screens.map((screen, index) => <div className="template-flow-step" key={screen.slug}>
        <article><div className="template-flow-screen"><div className="template-flow-screen-nav"><i /><i /><i /></div><div><span>{screen.title}</span><section>{screen.sections.slice(0, 3).map((section) => <i key={section} title={section} />)}</section><b>{screen.primaryAction}</b></div></div><small>Screen {String(index + 1).padStart(2, '0')}</small><h3>{screen.title}</h3><p>{screen.purpose}</p><div className="template-flow-sections">{screen.sections.slice(0, 3).map((section) => <span key={section}>{section}</span>)}</div><div className="template-flow-grounding"><b>Mapped project context</b>{screen.mappedItems.length ? screen.mappedItems.map((item) => <p key={item.id}><span>{item.truthStatus === 'HUMAN_CONFIRMED' ? 'Confirmed' : 'Source'}</span>{item.text}</p>) : <p><span>Graph</span>No confirmed item maps uniquely to this screen yet.</p>}{screen.openGapTitles.map((gap) => <p className="gap" key={gap}><span>Open</span>{gap}</p>)}</div><footer><span>Loading</span><span>Empty</span><span>Error</span><span>Success</span></footer></article>
        {index < preview.screens.length - 1 ? <em aria-hidden="true">→</em> : null}
      </div>)}</div>
      <footer><p>The pattern supplies the journey shape. Titles, mapped context, and open decisions update automatically for each project.</p><div><button type="button" onClick={onClose}>Keep browsing</button><button type="button" className="solid-action" onClick={() => { onSelect(template.id); onClose(); }}>Use this pattern →</button></div></footer>
    </div>
  </div>;
}

export function TemplateGallery({ selected, onSelect, context }: { selected: WireframeTemplateId; onSelect: (id: WireframeTemplateId) => void; context: ProjectPreviewContext }) {
  const [previewTemplate, setPreviewTemplate] = useState<WireframeTemplate | null>(null);
  return <><div className="template-gallery" aria-label="Wireframe template gallery">{WIREFRAME_TEMPLATES.map((template) => <article key={template.id} className={selected === template.id ? 'selected' : ''}>
    <button type="button" className="template-card-select" onClick={() => onSelect(template.id)} aria-pressed={selected === template.id}><TemplatePreview accent={template.accent} layout={template.previewLayout} /><span className="template-category">{template.category}</span><b>{template.name}</b><p>{template.description}</p><small>{template.screens.length} screens · {template.bestFor}</small>{selected === template.id ? <i className="template-selected">✓ Selected</i> : null}</button>
    <div className="template-card-actions"><button type="button" onClick={() => setPreviewTemplate(template)}>Preview {template.screens.length}-screen flow</button><button type="button" onClick={() => onSelect(template.id)}>{selected === template.id ? 'Selected' : 'Use pattern'}</button></div>
  </article>)}</div>{previewTemplate ? <TemplateFlowDialog template={previewTemplate} context={context} onSelect={onSelect} onClose={() => setPreviewTemplate(null)} /> : null}</>;
}
