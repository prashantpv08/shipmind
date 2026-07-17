import { NextResponse } from 'next/server';
import { compileArtifactPack } from '../../../src/artifacts/compile';
import { ArtifactCompileRequest, ArtifactPack } from '../../../src/domain/schemas';

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const parsed = ArtifactCompileRequest.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({
      error: parsed.error.issues[0]?.message ?? 'Invalid artifact compile request',
    }, { status: 400 });
  }

  try {
    const pack = ArtifactPack.parse(compileArtifactPack(parsed.data));
    return NextResponse.json(pack);
  } catch (cause) {
    return NextResponse.json({
      error: cause instanceof Error ? cause.message : String(cause),
    }, { status: 500 });
  }
}
