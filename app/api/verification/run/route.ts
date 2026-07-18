import { NextResponse } from 'next/server';
import { runControlledVerification } from '../../../../src/runner/execute';
import { VerificationRequest } from '../../../../src/runner/schemas';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const parsed = VerificationRequest.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({
      error: parsed.error.issues[0]?.message ?? 'Verification requires an approved generated implementation',
    }, { status: 400 });
  }

  try {
    return NextResponse.json(await runControlledVerification(parsed.data));
  } catch (cause) {
    return NextResponse.json({
      error: cause instanceof Error ? cause.message : String(cause),
    }, { status: 409 });
  }
}
