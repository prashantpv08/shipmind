import { describe, expect, it } from 'vitest';
import { splitMermaidBlocks } from '../app/_components/mermaid-document-body';
import { parseMarkdownText } from '../app/_components/markdown-document-text';

describe('Mermaid document rendering', () => {
  it('extracts Mermaid fences while preserving surrounding document text', () => {
    const blocks = splitMermaidBlocks(`Architecture overview.

\`\`\`mermaid
flowchart LR
  User --> Axiom
\`\`\`

Review this diagram before approval.`);

    expect(blocks).toEqual([
      { type: 'text', value: 'Architecture overview.' },
      { type: 'mermaid', value: 'flowchart LR\n  User --> Axiom' },
      { type: 'text', value: 'Review this diagram before approval.' },
    ]);
  });

  it('leaves ordinary document sections as text', () => {
    expect(splitMermaidBlocks('No diagram is present.')).toEqual([
      { type: 'text', value: 'No diagram is present.' },
    ]);
  });

  it('turns document-control Markdown into semantic table and list blocks', () => {
    const blocks = parseMarkdownText('| Field | Value |\n|---|---|\n| Status | HUMAN_APPROVED |\n\n- One\n- Two');
    expect(blocks).toEqual([
      { type: 'table', rows: [['Field', 'Value'], ['Status', 'HUMAN_APPROVED']] },
      { type: 'list', ordered: false, items: ['One', 'Two'] },
    ]);
  });
});
