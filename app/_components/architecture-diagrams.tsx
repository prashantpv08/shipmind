'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { ArchitectureOption } from '../../src/projects/schemas';

const views = ['System context', 'Components', 'Deployment', 'Sequence'] as const;
type DiagramView = typeof views[number];

function short(value: string, maximum = 28) {
  return value.length > maximum ? `${value.slice(0, maximum - 1)}…` : value;
}

export function ArchitectureDiagrams({
  option,
  projectName,
  status = 'AI_SUGGESTED',
}: {
  option: ArchitectureOption;
  projectName: string;
  status?: 'AI_SUGGESTED' | 'HUMAN_APPROVED';
}) {
  const [view, setView] = useState<DiagramView>('System context');
  const components = option.components.slice(0, 4);

  return <section className="architecture-visual" aria-labelledby="architecture-visual-title">
    <div className="architecture-visual-heading"><div><span className="mini-kicker">Living HLD</span><h3 id="architecture-visual-title">Architecture diagrams</h3></div><div className="diagram-tabs" role="tablist" aria-label="Architecture diagram type">{views.map((item) => <button key={item} type="button" role="tab" aria-selected={view === item} onClick={() => setView(item)}>{item}</button>)}</div></div>
    <div className="diagram-canvas" role="img" aria-label={`${view} diagram for ${projectName}`}>
      {view === 'System context' ? <div className="context-diagram"><div className="diagram-person"><span>U</span><b>Product user</b></div><i>Uses</i><div className="diagram-system primary"><span>A</span><b>{short(projectName)}</b><small>{option.name}</small></div><div className="context-branches"><div><i /><span>External services</span></div><div><i /><span>Evidence & telemetry</span></div></div></div> : null}
      {view === 'Components' ? <div className="component-diagram">{components.map((component, index) => <div key={component.name} className="component-node"><span>{String(index + 1).padStart(2, '0')}</span><b>{component.name}</b><small>{short(component.responsibility, 76)}</small>{index < components.length - 1 ? <i>→</i> : null}</div>)}</div> : null}
      {view === 'Deployment' ? <div className="deployment-diagram"><div className="deployment-boundary"><span>{option.deploymentModel}</span><div>{components.map((component, index) => <article key={component.name}><i style={{ '--node-index': index } as CSSProperties} /><b>{component.name}</b><small>{option.technologies[index % option.technologies.length]}</small></article>)}</div></div><div className="telemetry-node">Observability<br /><small>logs · metrics · traces</small></div></div> : null}
      {view === 'Sequence' ? <div className="sequence-diagram"><div className="sequence-actors"><span>User</span>{components.map((component) => <span key={component.name}>{short(component.name, 18)}</span>)}</div><div className="sequence-lines">{option.dataFlows.slice(0, 3).map((flow, index) => <div key={flow}><b>{index + 1}</b><i /><span>{short(flow, 86)}</span></div>)}</div></div> : null}
    </div>
    <div className="diagram-footer"><span>{status === 'HUMAN_APPROVED' ? 'HUMAN_APPROVED · governed by the current ARB decision' : 'AI_SUGGESTED · review before ARB approval'}</span><span>{components.length} components · {option.technologies.length} technology signals</span></div>
  </section>;
}
