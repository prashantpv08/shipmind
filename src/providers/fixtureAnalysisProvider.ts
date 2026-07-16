import { calculateReadiness } from '@/domain/readiness';
import { validateAnalysisRun } from '@/domain/sourceValidation';
import { NOW } from '@/fixtures/notifyflow';
import type { AnalysisRun, SourceDocument } from '@/domain/schemas';
import type { AnalysisProvider } from './analysisProvider';

const projectId = 'project-notifyflow';
const provenance = (ids: string[], kind: 'SOURCE' | 'FIXTURE' = ids.length ? 'SOURCE' : 'FIXTURE') => ({ kind, label: kind === 'SOURCE' ? 'Grounded in NotifyFlow brief' : 'Fixture inference; not stated in brief', sourceSpanIds: ids });
const base = (id: string, status: 'GROUNDED' | 'INFERRED' | 'UNKNOWN' | 'OPEN' = 'GROUNDED', ids: string[] = []) => ({ id, projectId, status, provenance: provenance(ids, status === 'GROUNDED' ? 'SOURCE' : 'FIXTURE'), sourceSpanIds: ids, createdAt: NOW, updatedAt: NOW });

export function buildFixtureAnalysis(document: SourceDocument): AnalysisRun {
  const runId = 'analysis-notifyflow-day1';
  const partial = {
    requirements: [
      { ...base('req-notification-service', 'GROUNDED', ['span-1']), title: 'Provide a tenant-aware notification service', description: 'Build a customer notification service for SaaS tenants.', priority: 'MUST' as const, acceptanceHint: 'Service accepts notification work for a tenant-scoped customer.' },
      { ...base('req-email-sms', 'GROUNDED', ['span-2']), title: 'Support email and SMS channels', description: 'Notifications must route through email and SMS channels.', priority: 'MUST' as const, acceptanceHint: 'Request can specify email or SMS channel.' },
      { ...base('req-retries', 'GROUNDED', ['span-3']), title: 'Retry failed deliveries', description: 'Provider or delivery failures require retry behavior.', priority: 'MUST' as const, acceptanceHint: 'Failed delivery attempts are retried according to a defined policy.' },
      { ...base('req-status', 'GROUNDED', ['span-4']), title: 'Track delivery status', description: 'Users need delivery-status tracking for submitted notifications.', priority: 'MUST' as const, acceptanceHint: 'A notification status can be retrieved after submission.' },
      { ...base('req-audit', 'GROUNDED', ['span-5']), title: 'Preserve audit logs', description: 'Notification actions must produce audit history.', priority: 'MUST' as const, acceptanceHint: 'Submission and status changes write audit events.' },
      { ...base('req-dashboard', 'GROUNDED', ['span-6']), title: 'Provide a simple admin dashboard', description: 'Administrators need a simple dashboard for first release operations.', priority: 'SHOULD' as const, acceptanceHint: 'Dashboard shows notification status and audit context.' }
    ],
    nonFunctionalRequirements: [
      { ...base('nfr-cloud', 'GROUNDED', ['span-7']), title: 'Run first release on AWS', description: 'The first release should be deployable on AWS.', category: 'OPERABILITY' as const, measurableTarget: 'AWS hosting constraint' },
      { ...base('nfr-cost', 'GROUNDED', ['span-8']), title: 'Stay below monthly cost target', description: 'The service should remain below USD 1,000 per month.', category: 'COST' as const, measurableTarget: '≤ USD 1,000/month' },
      { ...base('nfr-scale', 'GROUNDED', ['span-9']), title: 'Handle expected monthly volume', description: 'Expected volume is up to one million notifications per month.', category: 'PERFORMANCE' as const, measurableTarget: 'Up to 1,000,000 notifications/month' },
      { ...base('nfr-isolation', 'GROUNDED', ['span-10']), title: 'Prevent cross-tenant data exposure', description: 'Customers must not see another tenant’s data.', category: 'SECURITY' as const, measurableTarget: 'Tenant-isolated reads and writes' },
      { ...base('nfr-future-scale', 'GROUNDED', ['span-12']), title: 'Allow later scaling', description: 'The product expects the service to scale later.', category: 'SCALABILITY' as const, measurableTarget: 'Scalable design, exact thresholds unknown' }
    ],
    assumptions: [
      { ...base('asm-provider', 'INFERRED'), title: 'External delivery providers will be used', description: 'Email and SMS support implies third-party or cloud provider delivery APIs, but providers are not named.', confidence: 'MEDIUM' as const },
      { ...base('asm-dashboard-users', 'INFERRED', ['span-6']), title: 'Admin dashboard users are internal operators', description: 'The brief says admin dashboard but does not identify whether admins are internal staff or tenant admins.', confidence: 'LOW' as const },
      { ...base('asm-mvp-speed', 'GROUNDED', ['span-11']), title: 'Time-to-first-release matters', description: 'The product team wants the first usable release quickly.', confidence: 'HIGH' as const }
    ],
    risks: [
      { ...base('risk-tenant-leak', 'GROUNDED', ['span-10']), title: 'Tenant isolation failure', description: 'Cross-tenant data exposure would violate an explicit product requirement.', severity: 'HIGH' as const, mitigation: 'Define trusted tenant identity and enforce tenant-scoped storage and reads.' },
      { ...base('risk-cost', 'GROUNDED', ['span-8', 'span-9']), title: 'Cost target may conflict with volume', description: 'The cost cap and one-million-notification volume need provider pricing validation.', severity: 'MEDIUM' as const, mitigation: 'Estimate provider, queue, storage, and observability costs before implementation.' },
      { ...base('risk-retry-duplicates', 'INFERRED', ['span-3']), title: 'Retries can create duplicate notifications', description: 'Retry behavior is requested, but idempotency and delivery semantics are missing.', severity: 'HIGH' as const, mitigation: 'Define idempotency keys, retry limits, and duplicate handling before build.' }
    ],
    gaps: [
      { ...base('gap-identity', 'UNKNOWN'), title: 'Tenant identity and authorization are undefined', description: 'The brief requires isolation but does not define authentication, authorization, or trusted tenant source.', gapType: 'MISSING' as const, severity: 'BLOCKING' as const },
      { ...base('gap-retry-policy', 'UNKNOWN', ['span-3']), title: 'Retry policy is unspecified', description: 'Retries are required, but attempts, backoff, dead-letter behavior, and provider outage handling are absent.', gapType: 'MISSING' as const, severity: 'BLOCKING' as const },
      { ...base('gap-latency', 'UNKNOWN'), title: 'Delivery latency target is missing', description: 'No acceptance or final delivery latency target is provided.', gapType: 'MISSING' as const, severity: 'HIGH' as const },
      { ...base('gap-peak', 'UNKNOWN', ['span-9']), title: 'Peak request rate is missing', description: 'Monthly volume does not define peak requests per second or burst behavior.', gapType: 'AMBIGUOUS' as const, severity: 'HIGH' as const },
      { ...base('gap-retention', 'UNKNOWN', ['span-5']), title: 'Audit and message retention are missing', description: 'Audit logs are required, but retention periods and message body storage rules are not stated.', gapType: 'MISSING' as const, severity: 'MEDIUM' as const }
    ]
  };
  const readinessScore = calculateReadiness(projectId, runId, partial);
  return validateAnalysisRun({ id: runId, projectId, status: 'VALID', provenance: { kind: 'FIXTURE', label: 'Validated Day 1 NotifyFlow fixture', sourceSpanIds: [] }, createdAt: NOW, updatedAt: NOW, provider: 'FIXTURE', startedAt: NOW, completedAt: NOW, objective: 'Create a tenant-safe notification service that supports email/SMS delivery, retries, status tracking, auditability, AWS deployment, and cost-conscious scale for the first usable release.', ...partial, readinessScore }, document);
}

export class FixtureAnalysisProvider implements AnalysisProvider {
  async analyze(_projectId: string, document: SourceDocument) {
    return buildFixtureAnalysis(document);
  }
}
