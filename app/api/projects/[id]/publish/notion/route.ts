import { NextResponse } from 'next/server';
import { publishProjectToNotion } from '../../../../../../src/integrations/notion';
import { getProject, saveNotionPublication } from '../../../../../../src/projects/store';

export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.knowledge || !bundle.documents.length) return NextResponse.json({ error: 'Generate project knowledge and documents before publishing to Notion' }, { status: 409 });
  try {
    const publication = await publishProjectToNotion({
      project: bundle.project,
      sources: bundle.sources,
      documents: bundle.documents.filter((document) => document.sourceGraphVersion === bundle.project.graphVersion),
      knowledge: bundle.knowledge,
      arbDecision: bundle.arbDecision?.graphVersion === bundle.project.graphVersion ? bundle.arbDecision : null,
      previousPublication: bundle.notionPublication,
    });
    await saveNotionPublication(publication);
    return NextResponse.json({ publication });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 502 });
  }
}
