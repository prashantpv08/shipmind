import type { ReactNode } from 'react';

export type MarkdownTextBlock =
  | { type: 'paragraph' | 'quote'; value: string }
  | { type: 'heading'; value: string; level: number }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; rows: string[][] };

function tableRows(lines: string[]) {
  return lines
    .filter((line, index) => index !== 1 || !/^\|(?:\s*:?-+:?\s*\|)+$/.test(line))
    .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()));
}

export function parseMarkdownText(markdown: string) {
  const blocks: MarkdownTextBlock[] = [];
  const lines = markdown.split('\n');
  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    if (line.startsWith('|') && line.endsWith('|')) {
      const table: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('|') && lines[index].trim().endsWith('|')) { table.push(lines[index].trim()); index += 1; }
      blocks.push({ type: 'table', rows: tableRows(table) });
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) { blocks.push({ type: 'heading', level: heading[1].length, value: heading[2] }); index += 1; continue; }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    const numbered = /^\d+\.\s+(.+)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const items: string[] = [];
      while (index < lines.length) {
        const match = ordered ? /^\d+\.\s+(.+)$/.exec(lines[index].trim()) : /^[-*]\s+(.+)$/.exec(lines[index].trim());
        if (!match) break;
        items.push(match[1]); index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }
    if (line.startsWith('> ')) { blocks.push({ type: 'quote', value: line.slice(2) }); index += 1; continue; }
    const paragraph = [line]; index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s+|^[-*]\s+|^\d+\.\s+|^>\s+|^\|/.test(lines[index].trim())) { paragraph.push(lines[index].trim()); index += 1; }
    blocks.push({ type: 'paragraph', value: paragraph.join(' ') });
  }
  return blocks;
}

function inline(value: string): ReactNode[] {
  const tokens = value.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g).filter(Boolean);
  return tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={`${index}-${token}`}>{token.slice(2, -2)}</strong>;
    if (token.startsWith('`') && token.endsWith('`')) return <code key={`${index}-${token}`}>{token.slice(1, -1)}</code>;
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.exec(token);
    if (link) return <a key={`${index}-${token}`} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    return token;
  });
}

export function MarkdownDocumentText({ markdown }: { markdown: string }) {
  const blocks = parseMarkdownText(markdown);
  if (!blocks.length) return <p>No content is available in this section.</p>;
  return <div className="rendered-markdown">{blocks.map((block, index) => {
    if (block.type === 'table') return <div className="rendered-table-wrap" key={`table-${index}`}><table><thead><tr>{block.rows[0]?.map((cell, cellIndex) => <th key={`${cellIndex}-${cell}`}>{inline(cell)}</th>)}</tr></thead><tbody>{block.rows.slice(1).map((row, rowIndex) => <tr key={`${rowIndex}-${row.join('|')}`}>{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>;
    if (block.type === 'list') { const List = block.ordered ? 'ol' : 'ul'; return <List key={`list-${index}`}>{block.items.map((item) => <li key={item}>{inline(item)}</li>)}</List>; }
    if (block.type === 'quote') return <blockquote key={`quote-${index}`}>{inline(block.value)}</blockquote>;
    if (block.type === 'heading') { const Heading = `h${Math.min(6, Math.max(2, block.level))}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6'; return <Heading key={`heading-${index}`}>{inline(block.value)}</Heading>; }
    return <p key={`paragraph-${index}`}>{inline(block.value)}</p>;
  })}</div>;
}
