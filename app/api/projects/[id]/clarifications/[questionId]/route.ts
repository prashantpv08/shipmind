import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applyClarificationAnswer } from '../../../../../../src/projects/intelligence';
import { compileProjectDocuments } from '../../../../../../src/projects/documents';
import { getProject, saveDocuments, saveKnowledge } from '../../../../../../src/projects/store';

export const runtime = 'nodejs';

const RequestBody = z.object({ answer: z.string().trim().min(1).max(2_000) }).strict();

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
    await saveKnowledge(knowledge);
    const documents = compileProjectDocuments({
      project: { ...bundle.project, graphVersion: knowledge.graphVersion, status: knowledge.readiness?.openBlockerIds.length ? 'NEEDS_CLARIFICATION' : 'ANALYZED', updatedAt: answeredAt },
      knowledge,
      sources: bundle.sources,
      previousDocuments: bundle.documents,
      generatedAt: answeredAt,
    });
    await saveDocuments(id, documents);
    return NextResponse.json({ knowledge, documents });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 409 });
  }
}
