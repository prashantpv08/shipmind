import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { DocumentApproval } from '../../../../../../src/projects/schemas';
import { getProject, saveDocumentApproval } from '../../../../../../src/projects/store';

export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.knowledge) return NextResponse.json({ error: 'Analyze the project before approving documents' }, { status: 409 });
  const current = bundle.documents
    .filter((document) => document.sourceGraphVersion === bundle.project.graphVersion)
    .sort((a, b) => b.version - a.version)
    .filter((document, index, all) => all.findIndex((candidate) => candidate.type === document.type) === index);
  const required = ['requirements', 'srs', 'nfr', 'hld'];
  const missing = required.filter((type) => !current.some((document) => document.type === type));
  if (missing.length) return NextResponse.json({ error: `Generate the complete document baseline before approval: ${missing.join(', ')}` }, { status: 409 });
  const approval = DocumentApproval.parse({
    id: `DOCAPP-${randomUUID()}`,
    projectId: id,
    graphVersion: bundle.project.graphVersion,
    documentHashes: Object.fromEntries(current.map((document) => [document.type, document.sha256])),
    truthStatus: 'HUMAN_APPROVED',
    approvedAt: new Date().toISOString(),
  });
  await saveDocumentApproval(approval);
  return NextResponse.json({ approval });
}
