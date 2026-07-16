import type { AnalysisRun, ReadinessScore } from './schemas';

const now = '2026-07-16T00:00:00.000Z';

export function calculateReadiness(
  projectId: string,
  runId: string,
  partial: Pick<AnalysisRun, 'requirements' | 'nonFunctionalRequirements' | 'gaps'>
): ReadinessScore {
  const blockers = partial.gaps.filter((gap) => gap.severity === 'BLOCKING').length;
  const nfr = (category: string) => partial.nonFunctionalRequirements.some((requirement) => requirement.category === category && requirement.status === 'GROUNDED');
  const categories = [
    { id: 'objective', label: 'Objective clarity', score: 85, rationale: 'The brief clearly asks for a customer notification service.' },
    { id: 'actors', label: 'Actor clarity', score: 55, rationale: 'SaaS customers and admins are named, but operator and API caller roles are not defined.' },
    { id: 'functional', label: 'Functional completeness', score: Math.min(90, partial.requirements.length * 11), rationale: 'Core capabilities are present, but detailed behavior remains open.' },
    { id: 'nfr', label: 'NFR completeness', score: Math.min(80, partial.nonFunctionalRequirements.length * 14), rationale: 'Some scale, cost, tenant isolation, and cloud constraints exist.' },
    { id: 'failure', label: 'Failure handling', score: partial.gaps.some((gap) => gap.title.includes('Retry')) ? 35 : 65, rationale: 'Retry is required, but policy and outage behavior are missing.' },
    { id: 'security', label: 'Security expectations', score: nfr('SECURITY') ? 60 : 20, rationale: 'Tenant isolation is explicit; authz and identity source are missing.' },
    { id: 'performance', label: 'Performance expectations', score: nfr('PERFORMANCE') ? 45 : 15, rationale: 'Monthly volume is present, but latency and peak rate are missing.' },
    { id: 'operations', label: 'Operational expectations', score: nfr('OPERABILITY') ? 50 : 20, rationale: 'Audit logs are requested, but observability and incident operations are unspecified.' },
    { id: 'blockers', label: 'Unresolved blockers', score: blockers === 0 ? 100 : Math.max(0, 100 - blockers * 35), rationale: `${blockers} blocking gap(s) must be resolved before implementation.` }
  ];
  const overall = Math.round(categories.reduce((sum, item) => sum + item.score, 0) / categories.length);
  return { id: `score-${runId}`, projectId, status: blockers ? 'OPEN' : 'VALID', provenance: { kind: 'SYSTEM', label: 'Deterministic readiness calculator', sourceSpanIds: [] }, createdAt: now, updatedAt: now, overall, categories };
}
