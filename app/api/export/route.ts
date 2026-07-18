import { NextResponse } from 'next/server';
import { exportResponse } from '../../../src/export/compile';

export const runtime = 'nodejs';
export const maxDuration = 20;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const output = exportResponse(body);
    return new Response(output.content, {
      status: 200,
      headers: {
        'content-type': `${output.mediaType}; charset=utf-8`,
        'content-disposition': `attachment; filename="${output.filename}"`,
        'x-axiom-export-id': output.bundle.manifest.exportId,
        'cache-control': 'no-store',
      },
    });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 400 });
  }
}
