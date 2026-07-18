import { randomUUID } from 'node:crypto';
import {
  NotionPublication,
  type ArbDecision,
  type NotionPublication as NotionPublicationType,
  type Project,
  type ProjectDocument,
  type ProjectKnowledge,
  type ProjectSource,
} from '../projects/schemas';
import { architectureComparisonMarkdown } from '../projects/documents';
import { diagramFilename, renderMermaidDiagramSvg, splitNotionMermaid } from './notion-diagrams';

const NOTION_VERSION = '2026-03-11';
const PAGE_BLOCK_LIMIT = 90;

type NotionPage = { id: string; url: string };
type RichText = { type: 'text'; text: { content: string; link?: { url: string } }; annotations?: { bold?: boolean; code?: boolean } };
type NotionBlock = Record<string, unknown>;
type NotionFileUpload = { id: string; upload_url?: string };

export function notionStatus() {
  const missing = [
    !process.env.NOTION_ACCESS_TOKEN ? 'NOTION_ACCESS_TOKEN' : null,
    !process.env.NOTION_PARENT_PAGE_ID ? 'NOTION_PARENT_PAGE_ID' : null,
  ].filter((value): value is string => Boolean(value));
  return { configured: missing.length === 0, mode: 'internal-connection' as const, missing };
}

function normalizePageId(value: string) {
  const match = value.match(/[a-f0-9]{32}/i);
  if (match) return match[0];
  const compact = value.replaceAll('-', '').trim();
  if (/^[a-f0-9]{32}$/i.test(compact)) return compact;
  return value.trim();
}

async function notionRequest<T>(method: 'POST' | 'PATCH', path: string, body: unknown): Promise<T> {
  const token = process.env.NOTION_ACCESS_TOKEN;
  if (!token) throw new Error('Notion is not configured: NOTION_ACCESS_TOKEN is missing');
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'notion-version': NOTION_VERSION,
    },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'message' in payload ? String(payload.message) : `Notion request failed with ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

function plainRichText(content: string, link?: string, annotations?: RichText['annotations']): RichText[] {
  const chunks = content.match(/[\s\S]{1,2000}/g) ?? [''];
  return chunks.map((chunk) => ({ type: 'text', text: { content: chunk, ...(link ? { link: { url: link } } : {}) }, ...(annotations ? { annotations } : {}) }));
}

function richText(content: string): RichText[] {
  const output: RichText[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;
  let cursor = 0;
  for (const match of content.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) output.push(...plainRichText(content.slice(cursor, index)));
    const token = match[0];
    if (token.startsWith('**')) output.push(...plainRichText(token.slice(2, -2), undefined, { bold: true }));
    else if (token.startsWith('`')) output.push(...plainRichText(token.slice(1, -1), undefined, { code: true }));
    else {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.exec(token);
      if (link) output.push(...plainRichText(link[1], link[2]));
    }
    cursor = index + token.length;
  }
  if (cursor < content.length) output.push(...plainRichText(content.slice(cursor)));
  return output.length ? output : plainRichText(content);
}

function tableBlock(lines: string[]): NotionBlock | null {
  const rows = lines
    .filter((line, index) => index !== 1 || !/^\|(?:\s*:?-+:?\s*\|)+$/.test(line))
    .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()));
  if (!rows.length || rows.some((row) => row.length !== rows[0].length) || rows[0].length === 0) return null;
  return {
    object: 'block',
    type: 'table',
    table: {
      table_width: rows[0].length,
      has_column_header: true,
      has_row_header: false,
      children: rows.map((row) => ({
        object: 'block',
        type: 'table_row',
        table_row: { cells: row.map((cell) => richText(cell)) },
      })),
    },
  };
}

export function markdownBlocks(markdown: string) {
  const blocks: NotionBlock[] = [];
  const rawLines = markdown.split('\n');
  for (let index = 0; index < rawLines.length;) {
    const line = rawLines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (index < rawLines.length && rawLines[index].trim().startsWith('|') && rawLines[index].trim().endsWith('|')) {
        tableLines.push(rawLines[index].trim());
        index += 1;
      }
      const table = tableBlock(tableLines);
      if (table) blocks.push(table);
      else blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: richText(tableLines.join('\n')) } });
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const numbered = /^\d+\.\s+(.+)$/.exec(line);
    if (heading) {
      const type = heading[1].length === 1 ? 'heading_1' : heading[1].length === 2 ? 'heading_2' : 'heading_3';
      blocks.push({ object: 'block', type, [type]: { rich_text: richText(heading[2]) } });
    } else if (line === '---') {
      blocks.push({ object: 'block', type: 'divider', divider: {} });
    } else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
      blocks.push({ object: 'block', type: 'to_do', to_do: { rich_text: richText(line.slice(6)), checked: line.startsWith('- [x] ') } });
    } else if (line.startsWith('- ')) {
      blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: richText(line.slice(2)) } });
    } else if (numbered) {
      blocks.push({ object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: richText(numbered[1]) } });
    } else if (line.startsWith('> ')) {
      blocks.push({ object: 'block', type: 'quote', quote: { rich_text: richText(line.slice(2)) } });
    } else if (/\b(UNKNOWN|AI_SUGGESTED|HUMAN_APPROVED)\b/.test(line)) {
      blocks.push({ object: 'block', type: 'callout', callout: { rich_text: richText(line), icon: { type: 'emoji', emoji: line.includes('HUMAN_APPROVED') ? '✅' : line.includes('UNKNOWN') ? '❓' : '✨' } } });
    } else {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: richText(line) } });
    }
    index += 1;
  }
  return blocks;
}

async function uploadNotionSvg(title: string, source: string) {
  const filename = diagramFilename(title, source);
  const created = await notionRequest<NotionFileUpload>('POST', '/file_uploads', {
    mode: 'single_part',
    filename,
    content_type: 'image/svg+xml',
  });
  const token = process.env.NOTION_ACCESS_TOKEN;
  if (!token) throw new Error('Notion is not configured: NOTION_ACCESS_TOKEN is missing');
  const form = new FormData();
  form.append('file', new Blob([renderMermaidDiagramSvg(title, source)], { type: 'image/svg+xml' }), filename);
  const response = await fetch(created.upload_url ?? `https://api.notion.com/v1/file_uploads/${created.id}/send`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'notion-version': NOTION_VERSION },
    body: form,
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const message = payload && typeof payload === 'object' && 'message' in payload ? String(payload.message) : `Notion file upload failed with ${response.status}`;
    throw new Error(message);
  }
  return created.id;
}

async function documentBlocks(markdown: string) {
  const blocks: NotionBlock[] = [];
  for (const segment of splitNotionMermaid(markdown)) {
    if (segment.type === 'markdown') {
      blocks.push(...markdownBlocks(segment.value));
      continue;
    }
    const uploadId = await uploadNotionSvg(segment.title, segment.source);
    blocks.push({
      object: 'block',
      type: 'image',
      image: {
        type: 'file_upload',
        file_upload: { id: uploadId },
        caption: plainRichText(`${segment.title} · rendered from the versioned architecture source`),
      },
    });
  }
  return blocks;
}

async function appendBlocks(pageId: string, blocks: NotionBlock[]) {
  for (let index = 0; index < blocks.length; index += PAGE_BLOCK_LIMIT) {
    await notionRequest('PATCH', `/blocks/${pageId}/children`, { children: blocks.slice(index, index + PAGE_BLOCK_LIMIT) });
  }
}

async function createPage(parentPageId: string, title: string, content: string): Promise<NotionPage> {
  const blocks = await documentBlocks(content);
  const page = await notionRequest<NotionPage>('POST', '/pages', {
    parent: { type: 'page_id', page_id: parentPageId },
    properties: { title: { type: 'title', title: plainRichText(title) } },
    children: blocks.slice(0, PAGE_BLOCK_LIMIT),
  });
  if (blocks.length > PAGE_BLOCK_LIMIT) await appendBlocks(page.id, blocks.slice(PAGE_BLOCK_LIMIT));
  return page;
}

function sourceCatalogue(project: Project, sources: ProjectSource[]) {
  return `# Project sources — ${project.name}

> Sources are immutable evidence. Extracted text is displayed for review and is never rewritten by the document compiler.

${sources.map((source) => `## ${source.name}
- Source ID: ${source.id}
- Type: ${source.mimeType}
- Intake kind: ${source.kind}
- Status: ${source.status}
- SHA-256: \`${source.sha256}\`

${source.status === 'EXTRACTED' ? source.extractedText.slice(0, 40_000) : `Extraction failed: ${source.extractionError ?? 'Unknown error'}`}`).join('\n\n') || 'No source artifacts are available.'}`;
}

function projectHub(input: { project: Project; knowledge: ProjectKnowledge; documents: ProjectDocument[]; decision?: ArbDecision | null }) {
  const blockers = input.knowledge.gaps.filter((gap) => gap.status === 'OPEN' && gap.severity === 'BLOCKER');
  return `# ${input.project.name}

> Axiom project knowledge hub — compiled from graph v${input.knowledge.graphVersion}. Generated documents are reviewable views, not the source of truth.

## Executive summary
${input.knowledge.summary}

## Delivery status
| Field | Value |
|---|---|
| Project ID | ${input.project.id} |
| Lifecycle | ${input.project.status} |
| Graph version | ${input.knowledge.graphVersion} |
| Readiness | ${input.knowledge.readiness?.score ?? 'UNKNOWN'}/100 |
| Open blockers | ${blockers.length} |
| Architecture decision | ${input.decision ? `${input.decision.optionName} — ${input.decision.truthStatus}` : 'Not approved'} |
| Current artifacts | ${input.documents.length} |

## Attention required
${blockers.map((gap) => `- **${gap.id}** ${gap.title}: ${gap.description}`).join('\n') || '- No P0 blocker remains. Non-blocking unknowns are listed in the Requirements Catalogue.'}

## Architecture comparison
${architectureComparisonMarkdown(input.knowledge.architectureOptions)}

## Technology direction
| Layer | Recommendation | Rationale | Alternatives | Status |
|---|---|---|---|---|
${input.knowledge.techStack.map((item) => `| ${item.layer} | ${item.recommendation.replaceAll('|', '\\|')} | ${item.rationale.replaceAll('|', '\\|')} | ${item.alternatives.join('; ').replaceAll('|', '\\|')} | ${item.truthStatus} |`).join('\n') || '| UNKNOWN | UNKNOWN | No recommendation available | UNKNOWN | UNKNOWN |'}

## Knowledge model
1. Review immutable sources.
2. Resolve high-impact clarification questions.
3. Review requirements, NFRs, risks, constraints, and readiness.
4. Compare architecture options and record an explicit human decision.
5. Review HLD and Wireframe Studio hypotheses before build planning.
`;
}

function pageIndex(entries: Array<{ title: string; url: string; detail: string }>) {
  return `## Project index
${entries.map((entry) => `- [${entry.title}](${entry.url}) — ${entry.detail}`).join('\n')}`;
}

export async function publishProjectToNotion(input: {
  project: Project;
  sources: ProjectSource[];
  documents: ProjectDocument[];
  knowledge: ProjectKnowledge;
  arbDecision?: ArbDecision | null;
  previousPublication?: NotionPublicationType | null;
}) {
  const status = notionStatus();
  if (!status.configured) throw new Error(`Notion is not configured: ${status.missing.join(', ')} missing`);
  const graphVersion = input.knowledge.graphVersion;
  const documentHashes = Object.fromEntries(input.documents.map((document) => [document.type, document.sha256]));
  if (input.previousPublication?.rendererVersion === 'svg-v2' && input.previousPublication.sourceGraphVersion === graphVersion && JSON.stringify(input.previousPublication.documentHashes) === JSON.stringify(documentHashes)) return input.previousPublication;

  const parentPageId = normalizePageId(process.env.NOTION_PARENT_PAGE_ID as string);
  const hubContent = projectHub({ project: input.project, knowledge: input.knowledge, documents: input.documents, decision: input.arbDecision });
  const projectPage = input.previousPublication
    ? { id: input.previousPublication.projectPageId, url: input.previousPublication.projectPageUrl }
    : await createPage(parentPageId, `${input.project.name} — Axiom project`, hubContent);
  if (input.previousPublication) {
    await appendBlocks(projectPage.id, markdownBlocks(`---\n## Graph v${graphVersion} publication\n${hubContent}`));
  }

  const sourcesPage = await createPage(projectPage.id, `01 — Sources · graph v${graphVersion}`, sourceCatalogue(input.project, input.sources));
  const documentPageIds: Record<string, string> = { sources: sourcesPage.id };
  const indexEntries = [{ title: 'Sources', url: sourcesPage.url, detail: `Immutable source catalogue for graph v${graphVersion}` }];
  for (const document of input.documents) {
    const page = await createPage(projectPage.id, `${document.title} · v${document.version} · graph v${document.sourceGraphVersion}`, document.content);
    documentPageIds[document.type] = page.id;
    indexEntries.push({ title: document.title, url: page.url, detail: `v${document.version}, ${document.truthStatus}, SHA-256 ${document.sha256.slice(0, 12)}…` });
  }
  await appendBlocks(projectPage.id, markdownBlocks(pageIndex(indexEntries)));

  return NotionPublication.parse({
    id: `NOTION-PUB-${randomUUID()}`,
    workspaceId: input.project.workspaceId,
    projectId: input.project.id,
    projectPageId: projectPage.id,
    projectPageUrl: projectPage.url,
    sourceGraphVersion: graphVersion,
    documentPageIds,
    documentHashes,
    rendererVersion: 'svg-v2',
    publishedAt: new Date().toISOString(),
  });
}
