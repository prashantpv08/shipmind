import { NextResponse } from 'next/server';
import { compileArchitecturePackages } from '../../../../../../src/projects/architecture-planning';
import { ArchitectureBrief, ArchitecturePlanningInput } from '../../../../../../src/projects/schemas';
import { getProject, saveArchitectureBrief } from '../../../../../../src/projects/store';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const parsed = ArchitecturePlanningInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid architecture brief' }, { status: 400 });
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.knowledge) return NextResponse.json({ error: 'Analyze project sources before architecture planning' }, { status: 409 });
  if (bundle.arbDecision?.graphVersion === bundle.project.graphVersion) return NextResponse.json({ error: 'The approved architecture must be superseded before changing its confirmed inputs' }, { status: 409 });
  const updatedAt = new Date().toISOString();
  const brief = ArchitectureBrief.parse({
    ...parsed.data,
    id: `ARCH-BRIEF-${id}-V${bundle.project.graphVersion}`,
    projectId: id,
    graphVersion: bundle.project.graphVersion,
    truthStatus: 'HUMAN_CONFIRMED',
    updatedAt,
  });
  await saveArchitectureBrief(brief);
  const packages = compileArchitecturePackages({ projectName: bundle.project.name, entities: bundle.knowledge.entities, brief, confirmed: true });
  return NextResponse.json({ brief, packages });
}
