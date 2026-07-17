import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getProject } from '../../../../../src/projects/store';
import { WireframeTemplateId } from '../../../../../src/projects/schemas';
import { compileWireframeHandoff } from '../../../../../src/projects/wireframes';
import { WIREFRAME_TEMPLATES } from '../../../../../src/projects/wireframe-templates';

export const runtime = 'nodejs';

const RequestBody = z.object({ templateId: WireframeTemplateId.optional() }).strict();

export async function GET() {
  return NextResponse.json({ templates: WIREFRAME_TEMPLATES.map(({ screens, ...template }) => ({ ...template, screenCount: screens.length })) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let requestBody: unknown = {};
  if (request.headers.get('content-type')?.includes('application/json')) {
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }
  }
  const parsed = RequestBody.safeParse(requestBody);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid wireframe template' }, { status: 400 });
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.knowledge || !bundle.arbDecision) return NextResponse.json({ error: 'A current human-approved ARB decision is required before wireframe generation' }, { status: 409 });
  const hld = bundle.documents
    .filter((document) => document.type === 'hld' && document.sourceGraphVersion === bundle.project.graphVersion)
    .sort((a, b) => b.version - a.version)[0];
  if (!hld) return NextResponse.json({ error: 'A current HLD is required before wireframe generation' }, { status: 409 });
  try {
    const wireframe = compileWireframeHandoff({ project: bundle.project, knowledge: bundle.knowledge, decision: bundle.arbDecision, hld, templateId: parsed.data.templateId });
    return NextResponse.json({ wireframe });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 409 });
  }
}
