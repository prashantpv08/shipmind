'use client';

import { useState } from 'react';
import { traceRequirement } from '../../src/traceability/graph';
import type { TraceNodeType, TraceabilityGraph } from '../../src/traceability/schemas';

type TraceView = 'visual' | 'list';

const traceLanes: Array<{ type: TraceNodeType; label: string; eyebrow: string }> = [
  { type: 'source-span', label: 'Source', eyebrow: 'Grounded intent' },
  { type: 'requirement', label: 'Requirement', eyebrow: 'Canonical graph' },
  { type: 'decision', label: 'Decision', eyebrow: 'Human approved' },
  { type: 'artifact', label: 'Artifact', eyebrow: 'Compiled view' },
  { type: 'code-file', label: 'Code', eyebrow: 'Implementation' },
  { type: 'test', label: 'Test', eyebrow: 'Verification link' },
  { type: 'evidence', label: 'Evidence', eyebrow: 'Executed proof' },
];

export function TraceabilitySection({ graph }: { graph: TraceabilityGraph | null }) {
  const [selectedRequirementId, setSelectedRequirementId] = useState('FR-001');
  const [view, setView] = useState<TraceView>('visual');

  if (!graph) {
    return (
      <section className="card trace-stage" id="traceability" aria-labelledby="traceability-heading">
        <p className="eyebrow">Stage 7 · Traceability</p>
        <h2 id="traceability-heading" className="text-xl font-black">Follow every claim to its proof.</h2>
        <p className="trace-lock"><b>Locked.</b> Complete verification to compile the requirement-to-evidence graph.</p>
      </section>
    );
  }

  const selectedId = graph.requirementTraces.some((item) => item.requirementId === selectedRequirementId)
    ? selectedRequirementId
    : graph.requirementTraces[0].requirementId;
  const selected = traceRequirement(graph, selectedId);
  const selectedNodeIds = new Set(selected.trace.nodeIds);
  const verifiedCount = graph.requirementTraces.filter((item) => item.status === 'VERIFIED').length;

  return (
    <section className="card trace-stage" id="traceability" aria-labelledby="traceability-heading">
      <div className="trace-heading-row">
        <div>
          <p className="eyebrow">Stage 7 · Traceability</p>
          <h2 id="traceability-heading" className="text-xl font-black">Follow every claim to its proof.</h2>
          <p className="muted">Axiom compiles stable graph links across source, requirement, approved decision, artifact, code, test, and executed evidence.</p>
        </div>
        <div className="trace-view-switch" aria-label="Traceability view">
          <button type="button" aria-pressed={view === 'visual'} onClick={() => setView('visual')}>Visual graph</button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>Accessible list</button>
        </div>
      </div>

      <div className="trace-stats" aria-label="Traceability graph summary">
        <span><small>Graph</small><b>v{graph.graphVersion}</b></span>
        <span><small>Nodes</small><b>{graph.nodes.length}</b></span>
        <span><small>Typed links</small><b>{graph.edges.length}</b></span>
        <span><small>Verified requirements</small><b>{verifiedCount}/{graph.requirementTraces.length}</b></span>
        <span><small>Explicit unknowns</small><b>{graph.unknownRequirementIds.length}</b></span>
      </div>

      <div className="trace-workspace">
        <aside className="trace-requirements" aria-label="Traceable requirements">
          <span className="mini-kicker">Start from a requirement</span>
          <div>
            {graph.requirementTraces.map((trace) => {
              const requirement = graph.nodes.find((node) => node.id === trace.requirementId);
              return (
                <button
                  key={trace.requirementId}
                  type="button"
                  className={trace.requirementId === selectedId ? 'active' : ''}
                  aria-pressed={trace.requirementId === selectedId}
                  onClick={() => setSelectedRequirementId(trace.requirementId)}
                >
                  <span>{trace.requirementId}</span>
                  <b>{requirement?.label ?? trace.requirementId}</b>
                  <small className={`trace-status ${trace.status.toLowerCase()}`}>{trace.status}</small>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="trace-canvas">
          <div className="trace-selection-heading">
            <div><span className="mini-kicker">Selected traversal</span><h3>{selectedId}</h3></div>
            <p>{selected.trace.note}</p>
          </div>

          {view === 'visual' ? (
            <div className="trace-lanes" aria-label={`${selectedId} visual traceability graph`}>
              {traceLanes.map((lane, laneIndex) => {
                const laneNodes = selected.nodes.filter((node) => node.type === lane.type);
                return (
                  <div className="trace-lane-wrap" key={lane.type}>
                    <section className={`trace-lane ${laneNodes.length ? '' : 'empty'}`}>
                      <header><small>{lane.eyebrow}</small><b>{lane.label}</b></header>
                      {laneNodes.slice(0, 2).map((node) => (
                        <article key={node.id}>
                          <span>{node.id}</span>
                          <b>{node.label}</b>
                          <small>{node.truthStatus}</small>
                        </article>
                      ))}
                      {laneNodes.length > 2 ? <p>+ {laneNodes.length - 2} linked {lane.label.toLowerCase()} nodes</p> : null}
                      {!laneNodes.length ? <p>No linked node</p> : null}
                    </section>
                    {laneIndex < traceLanes.length - 1 ? <span className="trace-arrow" aria-hidden="true">→</span> : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="trace-list-wrap">
              <table>
                <caption>Accessible ordered trace for {selectedId}</caption>
                <thead><tr><th>Stage</th><th>Entity</th><th>Grounding</th><th>Detail</th></tr></thead>
                <tbody>
                  {traceLanes.flatMap((lane) => selected.nodes.filter((node) => node.type === lane.type).map((node) => (
                    <tr key={node.id}>
                      <td>{lane.label}</td>
                      <td><b>{node.id}</b><small>{node.label}</small></td>
                      <td>{node.truthStatus}</td>
                      <td>{node.detail}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="trace-integrity">
        <div>
          <span className="mini-kicker">Graph integrity</span>
          <h3>Unknowns remain visible.</h3>
          <p>Missing test links are engineering gaps, not implicit passes.</p>
        </div>
        <div>
          <article><b>{graph.orphanRequirementIds.length}</b><span>requirements without linked generated tests</span><small>{graph.orphanRequirementIds.join(', ') || 'None'}</small></article>
          <article><b>{graph.unlinkedTestIds.length}</b><span>tests without requirement links</span><small>{graph.unlinkedTestIds.join(', ') || 'None'}</small></article>
          <article><b>{graph.unknownRequirementIds.length}</b><span>requirements with UNKNOWN proof</span><small>{graph.unknownRequirementIds.join(', ') || 'None'}</small></article>
        </div>
      </div>

      <details className="trace-edge-ledger">
        <summary>Inspect the typed edge ledger</summary>
        <ul>{graph.edges.filter((item) => selectedNodeIds.has(item.fromId) && selectedNodeIds.has(item.toId)).map((item) => <li key={item.id}><code>{item.fromId}</code><span>{item.relation}</span><code>{item.toId}</code></li>)}</ul>
      </details>
    </section>
  );
}
