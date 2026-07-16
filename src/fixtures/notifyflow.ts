import { ProjectSchema, SourceDocumentSchema, type SourceDocument } from '@/domain/schemas';

export const NOW = '2026-07-16T00:00:00.000Z';
export const notifyFlowBrief = `# NotifyFlow Product Brief

Build a multi-tenant customer notification service for a SaaS product. It must support email and SMS, retries, delivery-status tracking, audit logs, and a simple admin dashboard. The first release should run on AWS and remain below USD 1,000 per month. We expect up to one million notifications per month.
Customers must not see another tenant's data. The product team wants the first usable release quickly and expects the service to scale later.
`;

const base = {
  projectId: 'project-notifyflow',
  status: 'GROUNDED' as const,
  provenance: { kind: 'SOURCE' as const, label: 'NotifyFlow product brief', sourceSpanIds: [] },
  createdAt: NOW,
  updatedAt: NOW
};

const snippets = [
  'multi-tenant customer notification service',
  'support email and SMS',
  'retries',
  'delivery-status tracking',
  'audit logs',
  'simple admin dashboard',
  'run on AWS',
  'below USD 1,000 per month',
  'one million notifications per month',
  "Customers must not see another tenant's data",
  'first usable release quickly',
  'scale later'
];

function span(text: string, index: number) {
  const start = notifyFlowBrief.indexOf(text);
  if (start < 0) throw new Error(`Missing NotifyFlow snippet: ${text}`);
  return { ...base, id: `span-${index + 1}`, documentId: 'source-notifyflow-brief', start, end: start + text.length, text };
}

export const notifyFlowProject = ProjectSchema.parse({
  ...base,
  id: 'project-notifyflow',
  name: 'NotifyFlow',
  slug: 'notifyflow',
  objective: 'Analyze the built-in NotifyFlow product brief.',
  sourceDocumentIds: ['source-notifyflow-brief']
});

export const notifyFlowSourceDocument: SourceDocument = SourceDocumentSchema.parse({
  ...base,
  id: 'source-notifyflow-brief',
  title: 'NotifyFlow Product Brief',
  content: notifyFlowBrief,
  spans: snippets.map(span)
});
