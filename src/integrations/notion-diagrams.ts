import { createHash } from 'node:crypto';

export type NotionMarkdownSegment =
  | { type: 'markdown'; value: string }
  | { type: 'diagram'; source: string; title: string };

type DiagramNode = { id: string; label: string };
type DiagramEdge = { from: string; to: string; label?: string };

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function titleBefore(markdown: string) {
  const headings = [...markdown.matchAll(/^#{1,4}\s+(.+)$/gm)];
  return headings.at(-1)?.[1].trim() ?? 'Architecture diagram';
}

export function splitNotionMermaid(markdown: string): NotionMarkdownSegment[] {
  const segments: NotionMarkdownSegment[] = [];
  const matcher = /```mermaid[^\S\r\n]*\r?\n([\s\S]*?)```/gi;
  let cursor = 0;
  for (const match of markdown.matchAll(matcher)) {
    const index = match.index ?? 0;
    const leading = markdown.slice(cursor, index);
    if (leading.trim()) segments.push({ type: 'markdown', value: leading });
    segments.push({ type: 'diagram', source: match[1].trim(), title: titleBefore(markdown.slice(0, index)) });
    cursor = index + match[0].length;
  }
  const trailing = markdown.slice(cursor);
  if (trailing.trim()) segments.push({ type: 'markdown', value: trailing });
  return segments.length ? segments : [{ type: 'markdown', value: markdown }];
}

function labelLines(label: string, maximum = 24) {
  const words = label.replaceAll('\\n', ' ').trim().split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    const current = lines.at(-1);
    if (!current || `${current} ${word}`.length > maximum) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
  }
  return lines.slice(0, 3);
}

function textLines(lines: string[], x: number, y: number, lineHeight = 20) {
  return lines.map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" text-anchor="middle" fill="#25233a" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="650">${escapeXml(line)}</text>`).join('');
}

function parseFlowchart(source: string) {
  const nodes = new Map<string, DiagramNode>();
  const edges: DiagramEdge[] = [];
  const declarations = /\b([A-Za-z][A-Za-z0-9_]*)\s*(?:\["([\s\S]*?)"\]|\[([^\]]+)\]|\("([\s\S]*?)"\))/g;
  for (const match of source.matchAll(declarations)) {
    nodes.set(match[1], { id: match[1], label: (match[2] ?? match[3] ?? match[4] ?? match[1]).trim() });
  }
  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();
    if (!line.includes('-->')) continue;
    const parts = line.split(/\s*-->\s*/);
    for (let index = 0; index < parts.length - 1; index += 1) {
      const from = /^([A-Za-z][A-Za-z0-9_]*)/.exec(parts[index])?.[1];
      const to = /^([A-Za-z][A-Za-z0-9_]*)/.exec(parts[index + 1])?.[1];
      if (!from || !to) continue;
      if (!nodes.has(from)) nodes.set(from, { id: from, label: from });
      if (!nodes.has(to)) nodes.set(to, { id: to, label: to });
      edges.push({ from, to });
    }
  }
  return { direction: /flowchart\s+TB/i.test(source) ? 'TB' : 'LR', nodes: [...nodes.values()], edges };
}

function renderFlowchart(title: string, source: string) {
  const graph = parseFlowchart(source);
  const width = graph.direction === 'LR' ? Math.max(1000, graph.nodes.length * 245 + 100) : 1100;
  const height = graph.direction === 'TB' ? Math.max(650, graph.nodes.length * 150 + 170) : 560;
  const positions = new Map<string, { x: number; y: number }>();
  graph.nodes.forEach((node, index) => {
    const x = graph.direction === 'LR' ? 145 + index * ((width - 290) / Math.max(1, graph.nodes.length - 1)) : width / 2;
    const y = graph.direction === 'TB' ? 160 + index * 135 : 290 + (index % 2 === 0 ? -55 : 55);
    positions.set(node.id, { x, y });
  });
  const edgeSvg = graph.edges.map((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) return '';
    return `<path d="M ${from.x} ${from.y} L ${to.x} ${to.y}" fill="none" stroke="#8175ef" stroke-width="3" marker-end="url(#arrow)" opacity="0.82"/>`;
  }).join('');
  const nodeSvg = graph.nodes.map((node) => {
    const position = positions.get(node.id)!;
    const lines = labelLines(node.label);
    return `<g><rect x="${position.x - 100}" y="${position.y - 45}" width="200" height="90" rx="18" fill="#ffffff" stroke="#dcd8fa" stroke-width="2" filter="url(#shadow)"/>${textLines(lines, position.x, position.y - ((lines.length - 1) * 10))}</g>`;
  }).join('');
  return svgShell(title, width, height, edgeSvg + nodeSvg);
}

function parseSequence(source: string) {
  const participants: DiagramNode[] = [];
  for (const line of source.split('\n')) {
    const match = /^\s*(?:actor|participant)\s+([A-Za-z][A-Za-z0-9_]*)(?:\s+as\s+(.+))?\s*$/.exec(line);
    if (match && !participants.some((item) => item.id === match[1])) participants.push({ id: match[1], label: match[2]?.trim() ?? match[1] });
  }
  const edges: DiagramEdge[] = [];
  for (const line of source.split('\n')) {
    const match = /^\s*([A-Za-z][A-Za-z0-9_]*)\s*-+>>[+-]?\s*([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.+)$/.exec(line);
    if (!match) continue;
    for (const id of [match[1], match[2]]) if (!participants.some((item) => item.id === id)) participants.push({ id, label: id });
    edges.push({ from: match[1], to: match[2], label: match[3].trim() });
  }
  return { participants, edges };
}

function renderSequence(title: string, source: string) {
  const sequence = parseSequence(source);
  const width = Math.max(1050, sequence.participants.length * 230 + 100);
  const height = Math.max(620, 245 + sequence.edges.length * 76);
  const positions = new Map(sequence.participants.map((participant, index) => [participant.id, 100 + index * ((width - 200) / Math.max(1, sequence.participants.length - 1))]));
  const lifelines = sequence.participants.map((participant) => {
    const x = positions.get(participant.id)!;
    return `<rect x="${x - 82}" y="100" width="164" height="62" rx="16" fill="#ffffff" stroke="#dcd8fa" stroke-width="2" filter="url(#shadow)"/>${textLines(labelLines(participant.label, 19), x, 137)}<line x1="${x}" y1="162" x2="${x}" y2="${height - 55}" stroke="#b8b2d7" stroke-width="2" stroke-dasharray="8 8"/>`;
  }).join('');
  const messages = sequence.edges.map((edge, index) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (from === undefined || to === undefined) return '';
    const y = 220 + index * 76;
    const direction = to >= from ? 1 : -1;
    const labelX = (from + to) / 2;
    return `<line x1="${from}" y1="${y}" x2="${to - direction * 10}" y2="${y}" stroke="#8175ef" stroke-width="3" marker-end="url(#arrow)"/><rect x="${labelX - 145}" y="${y - 30}" width="290" height="24" rx="8" fill="#f5f3ff"/><text x="${labelX}" y="${y - 13}" text-anchor="middle" fill="#4a456b" font-family="Inter, Arial, sans-serif" font-size="13">${escapeXml((edge.label ?? '').slice(0, 58))}</text>`;
  }).join('');
  return svgShell(title, width, height, lifelines + messages);
}

function svgShell(title: string, width: number, height: number, content: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${escapeXml(title)}</title><desc id="desc">Architecture diagram rendered by Axiom from the versioned Mermaid source.</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8175ef"/></marker><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#24203f" flood-opacity="0.10"/></filter><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#fbfaff"/><stop offset="1" stop-color="#f3f1ff"/></linearGradient></defs><rect width="${width}" height="${height}" rx="28" fill="url(#bg)"/><rect x="28" y="24" width="${width - 56}" height="52" rx="15" fill="#171626"/><circle cx="55" cy="50" r="10" fill="#7568f5"/><text x="78" y="57" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700">${escapeXml(title)}</text>${content}<text x="${width - 34}" y="${height - 24}" text-anchor="end" fill="#8c88a1" font-family="Inter, Arial, sans-serif" font-size="12">Axiom · source-linked architecture view</text></svg>`;
}

export function renderMermaidDiagramSvg(title: string, source: string) {
  return /^\s*sequenceDiagram\b/i.test(source) ? renderSequence(title, source) : renderFlowchart(title, source);
}

export function diagramFilename(title: string, source: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 56) || 'architecture-diagram';
  return `${slug}-${createHash('sha256').update(source).digest('hex').slice(0, 10)}.svg`;
}
