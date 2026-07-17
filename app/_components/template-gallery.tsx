'use client';

import type { CSSProperties } from 'react';
import { WIREFRAME_TEMPLATES } from '../../src/projects/wireframe-templates';
import type { WireframeTemplateId } from '../../src/projects/schemas';

function TemplatePreview({ accent, layout }: { accent: string; layout: string }) {
  return <div className={`template-preview layout-${layout}`} style={{ '--template-accent': accent } as CSSProperties} aria-hidden="true"><div className="preview-sidebar"><i /><i /><i /></div><div className="preview-main"><span /><div><i /><i /><i /></div><b /><b /></div></div>;
}

export function TemplateGallery({ selected, onSelect }: { selected: WireframeTemplateId; onSelect: (id: WireframeTemplateId) => void }) {
  return <div className="template-gallery" aria-label="Wireframe template gallery">{WIREFRAME_TEMPLATES.map((template) => <button type="button" key={template.id} className={selected === template.id ? 'selected' : ''} onClick={() => onSelect(template.id)} aria-pressed={selected === template.id}>
    <TemplatePreview accent={template.accent} layout={template.previewLayout} />
    <span className="template-category">{template.category}</span><b>{template.name}</b><p>{template.description}</p><small>{template.screens.length} screens · {template.bestFor}</small>{selected === template.id ? <i className="template-selected">✓ Selected</i> : null}
  </button>)}</div>;
}
