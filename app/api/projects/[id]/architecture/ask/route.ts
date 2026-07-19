import { NextResponse } from 'next/server';
import { z } from 'zod';
import { answerArchitectureQuestion } from '../../../../../../src/projects/architecture-answer';
import { getProject } from '../../../../../../src/projects/store';
import { GUIDED_TEXT_LIMIT_MESSAGE, MAX_GUIDED_TEXT_CHARACTERS } from '../../../../../../src/projects/validation';

export const runtime = 'nodejs';

const RequestBody = z.object({
  question: z.string().trim().min(3).max(MAX_GUIDED_TEXT_CHARACTERS, GUIDED_TEXT_LIMIT_MESSAGE),
  selectedOptionId: z.string().min(1).optional(),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const parsed = RequestBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid architecture question' }, { status: 400 });
  const bundle = await getProject(id);
  if (!bundle?.knowledge) return NextResponse.json({ error: 'Analyze the project before asking architecture questions' }, { status: 409 });
  return NextResponse.json(answerArchitectureQuestion({ knowledge: bundle.knowledge, ...parsed.data }));
}
