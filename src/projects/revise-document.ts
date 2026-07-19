import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { z } from 'zod';
import { strictJsonSchema } from '../ai/structured-output';
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
  readonly name: 'axiom-fixture' | 'groq' | 'openai-responses';
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

let groqClient: OpenAI | null = null;

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is required for Groq document revision');
  groqClient ??= new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
  return groqClient;
}

class GroqRevisionProvider implements RevisionProvider {
  readonly name = 'groq' as const;

  async revise(input: { documentTitle: string; heading: string; currentBody: string; instruction: string; groundedContext: string }) {
    const response = await getGroqClient().chat.completions.create({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: 'You revise one section of an engineering document. Preserve stable IDs, truth-status labels, exact source references, and explicit UNKNOWN values. Never invent measurements, approvals, evidence, or source quotations. Return only the replacement Markdown body for the requested section plus a short summary.',
        },
        {
          role: 'user',
          content: `Document: ${input.documentTitle}\nSection: ${input.heading}\nInstruction: ${input.instruction}\n\nCurrent section:\n${input.currentBody}\n\nGrounded project context:\n${input.groundedContext}`,
        },
      ],
      response_format: strictJsonSchema(RevisionOutput, 'document_revision'),
    });
    const content = response.choices[0]?.message.content;
    if (!content) throw new Error('Groq returned no validated document revision');
    return RevisionOutput.parse(JSON.parse(content));
  }
}

function providerForEnvironment(): RevisionProvider {
  if (process.env.AXIOM_AI_MODE !== 'live') return new FixtureRevisionProvider();
  return new GroqRevisionProvider();
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
