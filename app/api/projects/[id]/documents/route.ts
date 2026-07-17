import { NextResponse } from 'next/server';
import { compileProjectDocuments } from '../../../../../src/projects/documents';
import { getProject, saveDocuments } from '../../../../../src/projects/store';

export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.knowledge) return NextResponse.json({ error: 'Analyze project sources before generating documents' }, { status: 409 });
  try {
    const documents = compileProjectDocuments({ project: bundle.project, knowledge: bundle.knowledge, sources: bundle.sources, previousDocuments: bundle.documents });
    await saveDocuments(id, documents);
    return NextResponse.json({ documents });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 500 });
  }
}
