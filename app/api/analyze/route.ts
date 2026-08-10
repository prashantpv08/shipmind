import { NextResponse } from 'next/server';
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
      await providerForEnv().analyze(parsed.data.brief),
    );
    return NextResponse.json(result);
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : String(cause);
    return NextResponse.json({
      error,
      run: {
        label: 'Demo fixture failed',
        providerName: 'notifyflow-day2-fixture',
        modelName: 'notifyflow-day2-fixture',
        mode: 'fixture',
        startedAt,
        completedAt: new Date().toISOString(),
        outcome: 'FAILED',
        error,
      },
    }, { status: 500 });
  }
}
