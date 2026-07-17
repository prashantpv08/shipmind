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
  if (!bundle.knowledge) return NextResponse.json({ error: 'Analyze the project before wireframe generation' }, { status: 409 });
  const currentDecision = bundle.arbDecision?.graphVersion === bundle.project.graphVersion ? bundle.arbDecision : undefined;
  const currentDocumentApproval = bundle.documentApproval?.graphVersion === bundle.project.graphVersion ? bundle.documentApproval : undefined;
  if (!currentDecision && !currentDocumentApproval) return NextResponse.json({ error: 'Approve the current document baseline or architecture before wireframe generation' }, { status: 409 });
  const hld = bundle.documents
    .filter((document) => document.type === 'hld' && document.sourceGraphVersion === bundle.project.graphVersion)
    .sort((a, b) => b.version - a.version)[0];
  if (!hld) return NextResponse.json({ error: 'A current HLD is required before wireframe generation' }, { status: 409 });
  if (currentDocumentApproval && currentDocumentApproval.documentHashes.hld !== hld.sha256 && !currentDecision) {
    return NextResponse.json({ error: 'The HLD changed after document approval. Approve the current document baseline again.' }, { status: 409 });
  }
  try {
    const wireframe = compileWireframeHandoff({ project: bundle.project, knowledge: bundle.knowledge, decision: currentDecision, documentApproval: currentDocumentApproval, hld, templateId: parsed.data.templateId });
    return NextResponse.json({ wireframe });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 409 });
  }
}
