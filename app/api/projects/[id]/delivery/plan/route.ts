import { NextResponse } from 'next/server';
import { compileJiraBacklogPlan } from '../../../../../../src/projects/delivery';
import { getProject } from '../../../../../../src/projects/store';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.knowledge || !bundle.documentApproval || !bundle.arbDecision) {
    return NextResponse.json({ error: 'Approve the document baseline and architecture before delivery planning' }, { status: 409 });
  }
  try {
    const plan = compileJiraBacklogPlan({ project: bundle.project, knowledge: bundle.knowledge, documentApproval: bundle.documentApproval, decision: bundle.arbDecision });
    return NextResponse.json({ plan, publication: bundle.jiraPublication });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 409 });
  }
}
