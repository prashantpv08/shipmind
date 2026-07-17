import { MermaidDiagram } from './mermaid-diagram';

export type MermaidDocumentBlock = {
  type: 'text' | 'mermaid';
  value: string;
};

export function splitMermaidBlocks(body: string): MermaidDocumentBlock[] {
  const matcher = /```mermaid[^\S\r\n]*\r?\n([\s\S]*?)```/gi;
  const blocks: MermaidDocumentBlock[] = [];
  let cursor = 0;

  for (const match of body.matchAll(matcher)) {
    const start = match.index ?? 0;
    const before = body.slice(cursor, start).trim();
    if (before) blocks.push({ type: 'text', value: before });
    blocks.push({ type: 'mermaid', value: match[1].trim() });
    cursor = start + match[0].length;
  }

  const after = body.slice(cursor).trim();
  if (after) blocks.push({ type: 'text', value: after });
  return blocks.length ? blocks : [{ type: 'text', value: body.trim() }];
}

export function MermaidDocumentBody({ body, label }: { body: string; label: string }) {
  const blocks = splitMermaidBlocks(body);

  return <div className="markdown-section-body">
    {blocks.map((block, index) => block.type === 'mermaid'
      ? <MermaidDiagram key={`${index}-${block.value}`} source={block.value} title={label} />
      : <pre key={`${index}-${block.value}`}>{block.value || 'No content is available in this section.'}</pre>)}
  </div>;
}
