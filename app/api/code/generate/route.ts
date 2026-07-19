import { NextResponse } from 'next/server';
import { FixtureCodeGenerator } from '../../../../src/codegen/provider';
import { validateCodeGeneration, writeControlledWorkspace } from '../../../../src/codegen/workspace';
import { CodeGenerationOutput, CodeGenerationRequest } from '../../../../src/codegen/schemas';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const parsed = CodeGenerationRequest.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({
      error: parsed.error.issues[0]?.message ?? 'Invalid code-generation request',
    }, { status: 400 });
  }

  try {
    const draft = await new FixtureCodeGenerator().generate(parsed.data);
    const output = CodeGenerationOutput.parse(process.env.VERCEL
      ? validateCodeGeneration(draft)
      : await writeControlledWorkspace(draft));
    return NextResponse.json(output);
  } catch (cause) {
    return NextResponse.json({
      error: cause instanceof Error ? cause.message : String(cause),
    }, { status: 500 });
  }
}
