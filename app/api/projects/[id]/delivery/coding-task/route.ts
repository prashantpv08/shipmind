import { NextResponse } from 'next/server';
import { z } from 'zod';
import { compileCodingTaskPacket, compileJiraBacklogPlan } from '../../../../../../src/projects/delivery';
import { getProject } from '../../../../../../src/projects/store';

export const runtime = 'nodejs';

const RequestBody = z.object({ storyId: z.string().min(1) }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = RequestBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Select a Jira story before preparing coding context' }, { status: 400 });
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.knowledge || !bundle.documentApproval || !bundle.arbDecision || !bundle.jiraPublication) {
    return NextResponse.json({ error: 'Create the approved Jira backlog before preparing a coding task' }, { status: 409 });
  }
  try {
    const plan = compileJiraBacklogPlan({ project: bundle.project, knowledge: bundle.knowledge, documentApproval: bundle.documentApproval, decision: bundle.arbDecision });
    if (plan.sha256 !== bundle.jiraPublication.planHash) return NextResponse.json({ error: 'The Jira backlog is stale for the current approved graph' }, { status: 409 });
    return NextResponse.json({ packet: compileCodingTaskPacket(plan, bundle.jiraPublication, parsed.data.storyId), storyId: parsed.data.storyId });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 409 });
  }
}
