import { NextResponse } from 'next/server';
import { deleteProject, getProject } from '../../../../src/projects/store';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return NextResponse.json(bundle);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deleted = await deleteProject(id);
  if (!deleted) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
