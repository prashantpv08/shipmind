import { NextResponse } from 'next/server';
import { ReviseDocumentRequest } from '../../../../../../../src/projects/schemas';
import { reviseDocument } from '../../../../../../../src/projects/revise-document';
import { getProject, saveDocuments } from '../../../../../../../src/projects/store';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string; documentId: string }> }) {
  const { id, documentId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const parsed = ReviseDocumentRequest.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid document revision request' }, { status: 400 });
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.knowledge) return NextResponse.json({ error: 'Project knowledge is required for a grounded revision' }, { status: 409 });
  const document = bundle.documents
    .filter((candidate) => candidate.id === documentId && candidate.sourceGraphVersion === bundle.project.graphVersion)
    .sort((a, b) => b.version - a.version)[0];
  if (!document) return NextResponse.json({ error: 'Current document not found' }, { status: 404 });
  try {
    const revision = await reviseDocument({ document, section: parsed.data.section, instruction: parsed.data.instruction, entities: bundle.knowledge.entities });
    await saveDocuments(id, [revision.document]);
    return NextResponse.json(revision);
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 502 });
  }
}
