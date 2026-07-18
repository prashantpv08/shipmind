import { NextResponse } from 'next/server';
import { z } from 'zod';
import { publishJiraBacklog } from '../../../../../../src/integrations/jira';
import { compileJiraBacklogPlan } from '../../../../../../src/projects/delivery';
import { getProject, saveJiraPublication } from '../../../../../../src/projects/store';

export const runtime = 'nodejs';

const RequestBody = z.object({ confirm: z.literal(true), planHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = RequestBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Confirm the exact backlog plan before creating Jira issues' }, { status: 400 });
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.knowledge || !bundle.documentApproval || !bundle.arbDecision) {
    return NextResponse.json({ error: 'Approve the document baseline and architecture before Jira publication' }, { status: 409 });
  }
  try {
    const plan = compileJiraBacklogPlan({ project: bundle.project, knowledge: bundle.knowledge, documentApproval: bundle.documentApproval, decision: bundle.arbDecision });
    if (plan.sha256 !== parsed.data.planHash) return NextResponse.json({ error: 'The backlog preview changed. Review the current plan before creating Jira issues.' }, { status: 409 });
    const publication = await publishJiraBacklog(plan, bundle.jiraPublication);
    await saveJiraPublication(publication);
    return NextResponse.json({ plan, publication });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 502 });
  }
}
