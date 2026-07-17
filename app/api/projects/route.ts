import { NextResponse } from 'next/server';
import { CreateProjectRequest } from '../../../src/projects/schemas';
import { createProject, listProjects } from '../../../src/projects/store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get('workspaceId') ?? undefined;
  return NextResponse.json({ projects: await listProjects(workspaceId) });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const parsed = CreateProjectRequest.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid project' }, { status: 400 });
  try {
    return NextResponse.json({ project: await createProject(parsed.data.name, parsed.data.workspaceId) }, { status: 201 });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 400 });
  }
}
