import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { WireframeRevision, WireframeTemplateId } from '../../../../../../src/projects/schemas';
import { getProject, saveWireframeRevision } from '../../../../../../src/projects/store';

export const runtime = 'nodejs';

const RequestBody = z.object({
  screenId: z.string().min(1),
  templateId: WireframeTemplateId,
  sourceGraphVersion: z.number().int().positive(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED']).default('DRAFT'),
  elements: z.array(z.record(z.string(), z.unknown())).max(2_000),
}).strict();

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return NextResponse.json({ revisions: bundle.wireframeRevisions.sort((a, b) => b.revision - a.revision) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const parsed = RequestBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid wireframe revision' }, { status: 400 });
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (parsed.data.sourceGraphVersion !== bundle.project.graphVersion) return NextResponse.json({ error: 'Wireframe revision is stale for the current project graph' }, { status: 409 });
  const revision = WireframeRevision.parse({
    id: `WFREV-${randomUUID()}`,
    projectId: id,
    ...parsed.data,
    revision: Math.max(0, ...bundle.wireframeRevisions.filter((item) => item.screenId === parsed.data.screenId).map((item) => item.revision)) + 1,
    createdAt: new Date().toISOString(),
  });
  await saveWireframeRevision(revision);
  return NextResponse.json({ revision }, { status: 201 });
}
