import { NextResponse } from 'next/server';
import { analyzeProjectSources } from '../../../../../src/projects/analyze';
import { getProject, saveKnowledge } from '../../../../../src/projects/store';

export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.sources.some((source) => source.status === 'EXTRACTED')) return NextResponse.json({ error: 'No successfully extracted sources are available' }, { status: 409 });
  try {
    const knowledge = analyzeProjectSources(id, bundle.project.graphVersion + 1, bundle.sources, undefined, bundle.project.name);
    await saveKnowledge(knowledge);
    return NextResponse.json({ knowledge });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 500 });
  }
}
