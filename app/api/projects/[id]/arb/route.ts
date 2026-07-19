import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { compileArchitecturePackages } from '../../../../../src/projects/architecture-planning';
import { ArbDecision } from '../../../../../src/projects/schemas';
import { getProject, saveArbDecision } from '../../../../../src/projects/store';

export const runtime = 'nodejs';

const RequestBody = z.object({ optionId: z.string().min(1) }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const parsed = RequestBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid ARB selection' }, { status: 400 });
  const bundle = await getProject(id);
  if (!bundle) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  if (!bundle.knowledge) return NextResponse.json({ error: 'Analyze project sources before ARB approval' }, { status: 409 });
  if (!bundle.documentApproval || bundle.documentApproval.graphVersion !== bundle.project.graphVersion) {
    return NextResponse.json({ error: 'Approve the current document baseline before ARB approval' }, { status: 409 });
  }
  if (!bundle.architectureBrief || bundle.architectureBrief.graphVersion !== bundle.project.graphVersion) {
    return NextResponse.json({ error: 'Confirm budget, hosting, team, and product-surface inputs before ARB approval' }, { status: 409 });
  }
  const blockers = bundle.knowledge.gaps.filter((gap) => gap.status === 'OPEN' && gap.severity === 'BLOCKER');
  if (blockers.length) {
    return NextResponse.json({
      error: `Resolve ${blockers.length} blocking clarification${blockers.length === 1 ? '' : 's'} before ARB approval`,
      blockerIds: blockers.map((gap) => gap.id),
    }, { status: 409 });
  }
  const selected = bundle.knowledge.architectureOptions.find((option) => option.id === parsed.data.optionId);
  if (!selected) return NextResponse.json({ error: 'Architecture option not found' }, { status: 400 });
  const packages = compileArchitecturePackages({ projectName: bundle.project.name, entities: bundle.knowledge.entities, brief: bundle.architectureBrief, confirmed: true });
  const selectedPackage = packages.find((item) => item.id === bundle.architectureBrief?.selectedPackageId);
  if (!selectedPackage) return NextResponse.json({ error: 'Selected technology package is unavailable' }, { status: 409 });
  const decision = ArbDecision.parse({
    id: `ARB-${randomUUID()}`,
    projectId: id,
    optionId: selected.id,
    optionName: selected.name,
    rationale: selected.why,
    rejectedOptionIds: bundle.knowledge.architectureOptions.filter((option) => option.id !== selected.id).map((option) => option.id),
    risks: selected.risks,
    architectureBriefId: bundle.architectureBrief.id,
    stack: {
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
      frontend: selectedPackage.frontend,
      backend: selectedPackage.backend,
      database: selectedPackage.database,
      mobile: selectedPackage.mobile,
      hosting: selectedPackage.hosting,
      estimatedMonthlyCost: selectedPackage.estimatedMonthlyCost,
      validationSummary: selectedPackage.validation.map((item) => `${item.label}: ${item.status} — ${item.detail}`),
      truthStatus: 'HUMAN_APPROVED',
    },
    graphVersion: bundle.knowledge.graphVersion,
    version: (bundle.arbDecision?.version ?? 0) + 1,
    truthStatus: 'HUMAN_APPROVED',
    approvedAt: new Date().toISOString(),
  });
  await saveArbDecision(decision);
  return NextResponse.json({ decision });
}
