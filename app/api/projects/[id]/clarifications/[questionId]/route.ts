import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applyClarificationAnswer } from '../../../../../../src/projects/intelligence';
import { compileProjectDocuments } from '../../../../../../src/projects/documents';
import { getProject, saveKnowledgeAndDocuments } from '../../../../../../src/projects/store';
import { GUIDED_TEXT_LIMIT_MESSAGE, MAX_GUIDED_TEXT_CHARACTERS } from '../../../../../../src/projects/validation';

export const runtime = 'nodejs';

const RequestBody = z.object({ answer: z.string().trim().min(1).max(MAX_GUIDED_TEXT_CHARACTERS, GUIDED_TEXT_LIMIT_MESSAGE) }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string; questionId: string }> }) {
  const { id, questionId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const parsed = RequestBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid clarification answer' }, { status: 400 });
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.knowledge) return NextResponse.json({ error: 'Analyze project sources before answering clarifications' }, { status: 409 });
  try {
    const answeredAt = new Date().toISOString();
    const knowledge = applyClarificationAnswer({ knowledge: bundle.knowledge, questionId, answer: parsed.data.answer, answeredAt });
    const documents = compileProjectDocuments({
      project: { ...bundle.project, graphVersion: knowledge.graphVersion, status: knowledge.readiness?.openBlockerIds.length ? 'NEEDS_CLARIFICATION' : 'ANALYZED', updatedAt: answeredAt },
      knowledge,
      sources: bundle.sources,
      previousDocuments: bundle.documents,
      generatedAt: answeredAt,
    });
    await saveKnowledgeAndDocuments(knowledge, documents);
    return NextResponse.json({ knowledge, documents });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 409 });
  }
}
