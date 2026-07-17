import { describe, expect, it } from 'vitest';
import { splitMermaidBlocks } from '../app/_components/mermaid-document-body';

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
});
