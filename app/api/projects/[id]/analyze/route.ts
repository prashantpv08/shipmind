import { NextResponse } from 'next/server';
import { analyzeProjectSources, extractProjectEntities } from '../../../../../src/projects/analyze';
import { projectIntelligenceProviderForEnv } from '../../../../../src/projects/intelligence-provider';
import { getProject, saveKnowledge } from '../../../../../src/projects/store';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.sources.some((source) => source.status === 'EXTRACTED')) return NextResponse.json({ error: 'No successfully extracted sources are available' }, { status: 409 });
  try {
    const provider = projectIntelligenceProviderForEnv();
    const generatedIntelligence = provider
      ? await provider.analyze({
        projectId: id,
        projectName: bundle.project.name,
        entities: extractProjectEntities(id, bundle.sources),
        sources: bundle.sources,
      })
      : undefined;
    const knowledge = analyzeProjectSources(
      id,
      bundle.project.graphVersion + 1,
      bundle.sources,
      undefined,
      bundle.project.name,
      {
        generatedIntelligence,
        analyzer: generatedIntelligence ? 'axiom-groq-grounded-v1' : 'axiom-deterministic-grounded-v2',
      },
    );
    await saveKnowledge(knowledge);
    return NextResponse.json({ knowledge });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 500 });
  }
}
