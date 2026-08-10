import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ProjectDocument, type KnowledgeEntity, type ProjectDocument as ProjectDocumentType } from './schemas';

const RevisionOutput = z.object({
  replacementMarkdown: z.string().min(20).max(30_000),
  summary: z.string().min(3).max(500),
}).strict();

export type DocumentSection = { heading: string; level: number; body: string };

export function documentSections(content: string): DocumentSection[] {
  const matches = [...content.matchAll(/^(#{2,3})\s+(.+)$/gm)];
  return matches.map((match, index) => ({
    heading: match[2].trim(),
    level: match[1].length,
    body: content.slice((match.index ?? 0) + match[0].length, matches[index + 1]?.index ?? content.length).trim(),
  }));
}

function replaceSection(content: string, heading: string, replacementBody: string) {
  const matches = [...content.matchAll(/^(#{2,3})\s+(.+)$/gm)];
  const index = matches.findIndex((match) => match[2].trim() === heading);
  if (index < 0) throw new Error('Document section not found');
  const start = (matches[index].index ?? 0) + matches[index][0].length;
  const end = matches[index + 1]?.index ?? content.length;
  return `${content.slice(0, start)}\n${replacementBody.trim()}\n\n${content.slice(end).trimStart()}`.trim();
}

interface RevisionProvider {
  readonly name: 'axiom-fixture';
  revise(input: { documentTitle: string; heading: string; currentBody: string; instruction: string; groundedContext: string }): Promise<z.infer<typeof RevisionOutput>>;
}

class FixtureRevisionProvider implements RevisionProvider {
  readonly name = 'axiom-fixture' as const;

  async revise(input: { currentBody: string; instruction: string }) {
    return RevisionOutput.parse({
      replacementMarkdown: `${input.currentBody}

### Human-directed update
> ${input.instruction}

This update is recorded as a review instruction. Any new product claim remains **AI_SUGGESTED** until it is confirmed against project sources or explicitly approved.`,
      summary: 'Added the human review instruction without inventing unsupported project facts.',
    });
  }
}

function providerForEnvironment(): RevisionProvider {
  return new FixtureRevisionProvider();
}

export async function reviseDocument(input: {
  document: ProjectDocumentType;
  section: string;
  instruction: string;
  entities: KnowledgeEntity[];
  generatedAt?: string;
}) {
  const section = documentSections(input.document.content).find((candidate) => candidate.heading === input.section);
  if (!section) throw new Error('Document section not found');
  const provider = providerForEnvironment();
  const groundedContext = input.entities.map((entity) => `${entity.id} [${entity.truthStatus}] ${entity.text}`).join('\n').slice(0, 24_000);
  const output = await provider.revise({
    documentTitle: input.document.title,
    heading: section.heading,
    currentBody: section.body,
    instruction: input.instruction,
    groundedContext,
  });
  const content = replaceSection(input.document.content, section.heading, output.replacementMarkdown);
  const document = ProjectDocument.parse({
    ...input.document,
    version: input.document.version + 1,
    content,
    sha256: createHash('sha256').update(content).digest('hex'),
    truthStatus: 'AI_SUGGESTED',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    parentVersion: input.document.version,
    revisedSection: input.section,
    revisionInstruction: input.instruction,
    revisionProvider: provider.name,
  });
  return { document, summary: output.summary, provider: provider.name };
}
