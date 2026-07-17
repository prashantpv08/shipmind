import { NextResponse } from 'next/server';
import { MAX_PROJECT_UPLOAD_BYTES, persistUploadedSource } from '../../../../../src/projects/extract';
import { addSources, getProject } from '../../../../../src/projects/store';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Source upload must use multipart form data' }, { status: 400 });
  }
  const files = form.getAll('files').filter((item): item is File => item instanceof File);
  const relativePaths = form.getAll('relativePaths').map(String);
  const kinds = form.getAll('kinds').map(String);
  if (!files.length) return NextResponse.json({ error: 'At least one source file is required' }, { status: 400 });
  if (files.length > 20) return NextResponse.json({ error: 'A maximum of 20 sources can be uploaded at once' }, { status: 400 });
  if (files.reduce((total, file) => total + file.size, 0) > MAX_PROJECT_UPLOAD_BYTES) return NextResponse.json({ error: 'The upload exceeds the 25 MB project batch limit' }, { status: 413 });

  try {
    const sources = [];
    for (const [index, file] of files.entries()) {
      const requestedKind = kinds[index];
      sources.push(await persistUploadedSource({
        workspaceId: bundle.project.workspaceId,
        projectId: bundle.project.id,
        file,
        relativePath: relativePaths[index] || undefined,
        kind: requestedKind === 'MEETING_TRANSCRIPT' ? 'MEETING_TRANSCRIPT' : relativePaths[index] ? 'FOLDER_FILE' : 'FILE',
      }));
    }
    await addSources(id, sources);
    return NextResponse.json({ sources }, { status: 201 });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 400 });
  }
}
