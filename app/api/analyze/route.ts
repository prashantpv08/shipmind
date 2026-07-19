import { NextResponse } from 'next/server';
import { safeLiveAiDescriptor } from '../../../src/ai/config';
import { providerForEnv } from '../../../src/ai/provider';
import { AnalysisResult, AnalyzeRequest } from '../../../src/domain/schemas';

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const parsed = AnalyzeRequest.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({
      error: parsed.error.issues[0]?.message ?? 'Invalid request body',
    }, { status: 400 });
  }

  const startedAt = new Date().toISOString();
  try {
    const result = AnalysisResult.parse(
      await providerForEnv(parsed.data.useFixture).analyze(parsed.data.brief),
    );
    return NextResponse.json(result);
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : String(cause);
    const { providerName, modelName } = safeLiveAiDescriptor();
    return NextResponse.json({
      error,
      run: {
        label: 'Live AI failed · no fixture substituted',
        providerName,
        modelName,
        mode: 'live',
        startedAt,
        completedAt: new Date().toISOString(),
        outcome: 'FAILED',
        error,
      },
    }, { status: 502 });
  }
}
