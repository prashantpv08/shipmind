import { NextResponse } from 'next/server';
import { compileProjectDocuments } from '../../../../../src/projects/documents';
import { migrateLegacyClarificationAnswers } from '../../../../../src/projects/intelligence';
import { getProject, saveKnowledgeAndDocuments } from '../../../../../src/projects/store';

export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.knowledge) return NextResponse.json({ migrated: false, bundle });

  try {
    const migratedAt = new Date().toISOString();
    const migration = migrateLegacyClarificationAnswers({ knowledge: bundle.knowledge, migratedAt });
    if (!migration.migrated) return NextResponse.json({ migrated: false, bundle });
    const documents = compileProjectDocuments({
      project: { ...bundle.project, graphVersion: migration.knowledge.graphVersion, updatedAt: migratedAt },
      knowledge: migration.knowledge,
      sources: bundle.sources,
      previousDocuments: bundle.documents,
      generatedAt: migratedAt,
    });
    await saveKnowledgeAndDocuments(migration.knowledge, documents);
    const updatedBundle = await getProject(id);
    return NextResponse.json({ migrated: true, bundle: updatedBundle });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 409 });
  }
}
