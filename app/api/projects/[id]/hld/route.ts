import { NextResponse } from 'next/server';
import { compileArchitectureDocuments } from '../../../../../src/projects/documents';
import { getProject, saveDocuments } from '../../../../../src/projects/store';

export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.knowledge || !bundle.arbDecision) return NextResponse.json({ error: 'A current human-approved ARB decision is required before HLD generation' }, { status: 409 });
  try {
    const documents = compileArchitectureDocuments({ project: bundle.project, knowledge: bundle.knowledge, decision: bundle.arbDecision, previousDocuments: bundle.documents });
    await saveDocuments(id, documents);
    return NextResponse.json({ document: documents.find((document) => document.type === 'hld'), documents });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 409 });
  }
}
