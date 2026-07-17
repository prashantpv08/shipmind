'use client';

import { useEffect, useId, useState } from 'react';

type RenderState =
  | { status: 'loading' }
  | { status: 'success'; svg: string }
  | { status: 'error'; message: string };

export function MermaidDiagram({ source, title }: { source: string; title: string }) {
  const reactId = useId();
  const renderId = `axiom-mermaid-${reactId.replaceAll(/[^a-zA-Z0-9_-]/g, '')}`;
  const [renderState, setRenderState] = useState<RenderState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    async function renderDiagram() {
      try {
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: {
            background: '#ffffff',
            primaryColor: '#f2efff',
            primaryBorderColor: '#7c6ff0',
            primaryTextColor: '#20212a',
            secondaryColor: '#eef7ff',
            secondaryBorderColor: '#80aee8',
            tertiaryColor: '#f8f8fb',
            tertiaryBorderColor: '#d9d9e3',
            lineColor: '#77758a',
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          },
          flowchart: { curve: 'basis', htmlLabels: false },
        });
        const { svg } = await mermaid.render(renderId, source);
        if (active) setRenderState({ status: 'success', svg });
      } catch (cause) {
        if (active) {
          setRenderState({
            status: 'error',
            message: cause instanceof Error ? cause.message : 'Mermaid could not parse this diagram.',
          });
        }
      }
    }

    void renderDiagram();
    return () => { active = false; };
  }, [renderId, source]);

  return <figure className="mermaid-diagram" aria-label={`${title} rendered diagram`} data-testid="mermaid-diagram">
    <figcaption><span>Rendered diagram</span><b>{title}</b></figcaption>
    {renderState.status === 'loading' ? <div className="mermaid-loading" role="status"><i /><span>Rendering architecture diagram…</span></div> : null}
    {renderState.status === 'success' ? <div className="mermaid-svg" dangerouslySetInnerHTML={{ __html: renderState.svg }} /> : null}
    {renderState.status === 'error' ? <div className="mermaid-error" role="alert"><b>Diagram rendering failed</b><p>{renderState.message}</p><span>The Mermaid source is preserved below for correction.</span></div> : null}
    <details className="mermaid-source"><summary>View Mermaid source</summary><pre>{source}</pre></details>
  </figure>;
}
