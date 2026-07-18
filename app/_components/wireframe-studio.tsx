'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawImperativeAPI, ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types';
import type { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { WireframeHandoff, WireframeNode, WireframeScreen } from '../../src/projects/schemas';
import { ActionLabel } from './action-label';

const Excalidraw = dynamic(async () => (await import('@excalidraw/excalidraw')).Excalidraw, { ssr: false });

function skeletonFor(node: WireframeNode) {
  if (node.kind === 'text') {
    return { id: node.id, type: 'text' as const, x: node.x, y: node.y, text: node.text ?? '', fontSize: node.fontSize ?? 16, fontFamily: 2 as const, strokeColor: node.strokeColor ?? '#334155', roughness: 0 as const, opacity: 100 };
  }
  if (node.kind === 'arrow') {
    return { id: node.id, type: 'arrow' as const, x: node.x, y: node.y, width: node.width ?? 120, height: node.height ?? 0, points: [[0, 0], [node.width ?? 120, node.height ?? 0]] as [[number, number], [number, number]], strokeColor: node.strokeColor ?? '#64748b', roughness: 0 as const, opacity: 100 };
  }
  return { id: node.id, type: 'rectangle' as const, x: node.x, y: node.y, width: node.width ?? 120, height: node.height ?? 60, backgroundColor: node.backgroundColor ?? 'transparent', strokeColor: node.strokeColor ?? '#cbd5e1', fillStyle: 'solid' as const, strokeWidth: 1 as const, roughness: 0 as const, roundness: { type: 3 as const }, opacity: 100 };
}

function download(value: BlobPart, type: string, filename: string) {
  const blob = new Blob([value], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SceneCanvas({ screen, savedElements, onChange, onApi }: {
  screen: WireframeScreen;
  savedElements?: readonly OrderedExcalidrawElement[];
  onChange: (elements: readonly OrderedExcalidrawElement[]) => void;
  onApi: (api: ExcalidrawImperativeAPI) => void;
}) {
  const canvasApiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const didFitScene = useRef(false);
  const initialData = useMemo(() => async (): Promise<ExcalidrawInitialDataState> => {
      if (savedElements) return { elements: savedElements, appState: { viewBackgroundColor: '#e9edf3', gridSize: 20 } };
      const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw');
      const skeletons = screen.nodes.map(skeletonFor);
      return {
        elements: convertToExcalidrawElements(skeletons, { regenerateIds: false }),
        appState: { viewBackgroundColor: '#e9edf3', gridSize: 20 },
        scrollToContent: true,
      };
    }, [savedElements, screen]);

  return <Excalidraw
    initialData={initialData}
    excalidrawAPI={(canvasApi) => { canvasApiRef.current = canvasApi; onApi(canvasApi); }}
    onChange={(elements) => {
      onChange(elements);
      if (!didFitScene.current && elements.length > 0 && canvasApiRef.current) {
        didFitScene.current = true;
        requestAnimationFrame(() => canvasApiRef.current?.scrollToContent(elements, { fitToContent: true, animate: false }));
      }
    }}
    gridModeEnabled
    objectsSnapModeEnabled
    theme="light"
    name={`${screen.title}.excalidraw`}
    UIOptions={{ canvasActions: { loadScene: true, saveToActiveFile: false, export: { saveFileToDisk: true } } }}
  />;
}

export function WireframeStudio({ handoff, onClose }: { handoff: WireframeHandoff; onClose: () => void }) {
  const [activeId, setActiveId] = useState(handoff.screens[0].id);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [editedScenes, setEditedScenes] = useState<Record<string, readonly OrderedExcalidrawElement[]>>({});
  const [mode, setMode] = useState<'canvas' | 'prototype'>('canvas');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [pendingSaveStatus, setPendingSaveStatus] = useState<'DRAFT' | 'IN_REVIEW' | 'APPROVED' | null>(null);
  const [exporting, setExporting] = useState<'scene' | 'svg' | null>(null);
  const active = handoff.screens.find((screen) => screen.id === activeId) ?? handoff.screens[0];
  const baseName = `${handoff.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${active.slug}`;
  const activeGaps = handoff.gaps.filter((gap) => active.unresolvedGapIds.includes(gap.id));
  const outgoingFlows = handoff.flows.filter((flow) => flow.fromScreenId === active.id);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function exportSvg() {
    if (!api) return;
    setExporting('svg');
    try {
      const { exportToSvg } = await import('@excalidraw/excalidraw');
      const svg = await exportToSvg({ elements: api.getSceneElements(), appState: { exportBackground: true, viewBackgroundColor: '#e9edf3' }, files: api.getFiles() });
      download(new XMLSerializer().serializeToString(svg), 'image/svg+xml;charset=utf-8', `${baseName}.svg`);
    } finally { setExporting(null); }
  }

  async function exportScene() {
    if (!api) return;
    setExporting('scene');
    try {
      const { serializeAsJSON } = await import('@excalidraw/excalidraw');
      download(serializeAsJSON(api.getSceneElements(), api.getAppState(), api.getFiles(), 'local'), 'application/json;charset=utf-8', `${baseName}.excalidraw`);
    } finally { setExporting(null); }
  }

  async function saveRevision(status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' = 'DRAFT') {
    if (!api) return;
    setPendingSaveStatus(status);
    setSaveState('saving');
    setSaveMessage('');
    try {
      const response = await fetch(`/api/projects/${handoff.projectId}/wireframes/revisions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          screenId: active.id,
          templateId: handoff.templateId,
          sourceGraphVersion: handoff.sourceGraphVersion,
          status,
          elements: api.getSceneElements(),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(body && typeof body === 'object' && 'error' in body ? String(body.error) : `Save failed with ${response.status}`);
      const revision = body && typeof body === 'object' && 'revision' in body ? body.revision as { revision?: number } : null;
      setSaveState('success');
      setSaveMessage(`${status.replaceAll('_', ' ')} revision ${revision?.revision ?? ''} saved to Axiom.`.trim());
    } catch (cause) {
      setSaveState('error');
      setSaveMessage(cause instanceof Error ? cause.message : String(cause));
    } finally { setPendingSaveStatus(null); }
  }

  function selectScreen(screen: WireframeScreen) {
    setActiveId(screen.id);
    setApi(null);
    setSaveState('idle');
    setSaveMessage('');
  }

  function selectMode(nextMode: 'canvas' | 'prototype') {
    setMode(nextMode);
    if (nextMode === 'prototype') setApi(null);
  }

  return <div className="wireframe-overlay" role="dialog" aria-modal="true" aria-labelledby="wireframe-studio-title">
    <header className="wireframe-toolbar">
      <div><span className="wireframe-brand">A</span><div><h2 id="wireframe-studio-title">Axiom Wireframe Studio</h2><p>{handoff.projectName} · {handoff.templateName} · graph v{handoff.sourceGraphVersion}</p></div></div>
      <div className="wireframe-toolbar-actions">
        <span className="status-pill amber">AI_SUGGESTED · review required</span>
        <button type="button" className="btn btn-secondary" aria-busy={pendingSaveStatus === 'DRAFT'} disabled={!api || saveState === 'saving'} onClick={() => saveRevision('DRAFT')}><ActionLabel loading={pendingSaveStatus === 'DRAFT'} loadingText="Saving revision…">Save revision</ActionLabel></button>
        <button type="button" className="btn btn-secondary" aria-busy={exporting === 'scene'} disabled={!api || Boolean(exporting)} onClick={exportScene}><ActionLabel loading={exporting === 'scene'} loadingText="Preparing scene…">Download scene</ActionLabel></button>
        <button type="button" className="btn btn-secondary" aria-busy={exporting === 'svg'} disabled={!api || Boolean(exporting)} onClick={exportSvg}><ActionLabel loading={exporting === 'svg'} loadingText="Rendering SVG…">Export SVG</ActionLabel></button>
        <button type="button" className="icon-button" aria-label="Close Wireframe Studio" onClick={onClose}>×</button>
      </div>
    </header>
    <div className={`wireframe-layout ${inspectorOpen ? '' : 'inspector-closed'}`}>
      <aside className="wireframe-screens" aria-label="Wireframe screens">
        <div><span className="step-kicker">{handoff.templateName}</span><b>{handoff.screens.length} generated scenes</b><small>{handoff.coverage.coveredEntityCount}/{handoff.coverage.totalEntityCount} requirement and NFR items mapped</small></div>
        {handoff.screens.map((screen, index) => <button type="button" key={screen.id} className={screen.id === active.id ? 'active' : ''} onClick={() => selectScreen(screen)} aria-pressed={screen.id === active.id}>
          <span className="wireframe-thumbnail"><span>{String(index + 1).padStart(2, '0')}</span></span>
          <span><b>{screen.title}</b><small>{screen.purpose}</small></span>
        </button>)}
      </aside>
      <main className="wireframe-board">
        <div className="wireframe-board-toolbar"><div><b>{active.title}</b><span>{active.id}</span></div><div className="studio-mode-switch" aria-label="Studio mode"><button type="button" aria-pressed={mode === 'canvas'} className={mode === 'canvas' ? 'active' : ''} onClick={() => selectMode('canvas')}>Canvas</button><button type="button" aria-pressed={mode === 'prototype'} className={mode === 'prototype' ? 'active' : ''} onClick={() => selectMode('prototype')}>Prototype</button><button type="button" aria-expanded={inspectorOpen} onClick={() => setInspectorOpen((current) => !current)}>{inspectorOpen ? 'Hide inspector' : 'Show inspector'}</button></div></div>
        {saveMessage ? <p className={`wireframe-save-message ${saveState === 'error' ? 'error' : ''}`} role={saveState === 'error' ? 'alert' : 'status'}>{saveMessage}</p> : null}
        {mode === 'canvas' ? <div className="wireframe-excalidraw" aria-label={`${active.title} editable wireframe canvas`}>
          <SceneCanvas
            key={active.id}
            screen={active}
            savedElements={editedScenes[active.id]}
            onApi={setApi}
            onChange={(elements) => setEditedScenes((current) => current[active.id] === elements ? current : { ...current, [active.id]: elements })}
          />
        </div> : <div className="prototype-preview" aria-label={`${active.title} prototype preview`}>
          <div className="prototype-frame"><div className="prototype-topbar"><span>A</span><b>{handoff.projectName}</b><small>Interactive flow hypothesis</small></div><div className="prototype-content"><span className="step-kicker">{handoff.templateName}</span><h3>{active.title}</h3><p>{active.purpose}</p><div className="prototype-sections">{active.requiredStates.map((state) => <article key={state}><b>{state.replaceAll('_', ' ')}</b><small>{state === 'DEFAULT' ? 'Current screen hypothesis' : 'Required state for product review'}</small></article>)}</div><div className="prototype-actions">{outgoingFlows.map((flow) => { const target = handoff.screens.find((screen) => screen.id === flow.toScreenId); return <button type="button" key={flow.id} onClick={() => target && selectScreen(target)}>{flow.label} → {target?.title}</button>; })}{outgoingFlows.length === 0 ? <button type="button" onClick={() => selectScreen(handoff.screens[0])}>Restart flow</button> : null}</div></div></div>
        </div>}
      </main>
      {inspectorOpen ? <aside className="wireframe-inspector" aria-label="Wireframe evidence inspector">
        <section><span className="step-kicker">Review status</span><h3>{handoff.reviewStatus.replaceAll('_', ' ')}</h3><p>{active.purpose}</p><span className="status-pill amber">AI_SUGGESTED</span><div className="review-actions"><button type="button" aria-busy={pendingSaveStatus === 'IN_REVIEW'} disabled={!api || saveState === 'saving'} onClick={() => saveRevision('IN_REVIEW')}><ActionLabel loading={pendingSaveStatus === 'IN_REVIEW'} loadingText="Submitting…">Submit for review</ActionLabel></button><button type="button" aria-busy={pendingSaveStatus === 'APPROVED'} disabled={!api || saveState === 'saving' || activeGaps.some((gap) => gap.severity === 'BLOCKER')} onClick={() => saveRevision('APPROVED')}><ActionLabel loading={pendingSaveStatus === 'APPROVED'} loadingText="Approving…">Approve screen</ActionLabel></button></div></section>
        <section><span className="step-kicker">Traceability coverage</span><h3>{handoff.coverage.coveredEntityCount}/{handoff.coverage.totalEntityCount} mapped</h3><p>{active.sourceEntityIds.length} grounded entities are mapped to this scene. {handoff.coverage.uncoveredEntityIds.length ? `${handoff.coverage.uncoveredEntityIds.length} remain uncovered across the handoff.` : 'No requirement or NFR item is currently uncovered.'}</p></section>
        <section><span className="step-kicker">Open design gaps</span><h3>{activeGaps.length} mapped to this screen</h3>{activeGaps.length ? activeGaps.map((gap) => <article key={gap.id}><b>{gap.id} · {gap.severity}</b><p>{gap.title}</p><small>{gap.rationale}</small></article>) : <p>No unresolved graph gap is mapped to this screen.</p>}</section>
        <section><span className="step-kicker">Grounded inputs</span><h3>{handoff.groundedStatements.length} source statements</h3>{handoff.groundedStatements.slice(0, 4).map((statement) => <article key={statement.entityId}><b>{statement.entityId}</b><p>{statement.text}</p><small>{statement.sourceId}</small></article>)}</section>
        <section><span className="step-kicker">Required states</span><h3>Review before approval</h3><ul>{active.requiredStates.map((state) => <li key={state}>{state.replaceAll('_', ' ')}</li>)}</ul></section>
        <section><span className="step-kicker">Required review</span><h3>Assumptions</h3><ul>{handoff.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul></section>
      </aside> : null}
    </div>
  </div>;
}
