import { NextResponse } from 'next/server';
import { resolveWhyQuestion } from '../../../src/traceability/why';

export const runtime = 'nodejs';
export const maxDuration = 15;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    return NextResponse.json(resolveWhyQuestion(body));
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : String(cause) },
      { status: 400 },
    );
  }
}
