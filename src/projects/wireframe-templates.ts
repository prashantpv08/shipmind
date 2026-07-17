import type { WireframeTemplateId } from './schemas';

export type WireframeTemplate = {
  id: WireframeTemplateId;
  name: string;
  description: string;
  bestFor: string;
  screens: Array<{ slug: string; title: string; purpose: string; primaryAction: string; sections: string[] }>;
};

export const WIREFRAME_TEMPLATES: WireframeTemplate[] = [
  {
    id: 'regulated-workflow',
    name: 'Regulated workflow',
    description: 'Evidence-led review, approval, exception, and audit journeys.',
    bestFor: 'Financial services, healthcare, policy, compliance, and case management',
    screens: [
      { slug: 'grounding', title: 'Grounding & assumptions', purpose: 'Separate source facts, design hypotheses, and unresolved decisions.', primaryAction: 'Review sources', sections: ['Grounded statements', 'Open gaps', 'Assumptions'] },
      { slug: 'decision-register', title: 'Decision register', purpose: 'Find, filter, and review governed records without implying approval.', primaryAction: 'Create draft', sections: ['Filters', 'Decision queue', 'Evidence status'] },
      { slug: 'decision-detail', title: 'Decision detail', purpose: 'Review one record with provenance, lifecycle, and approval boundaries.', primaryAction: 'Submit for review', sections: ['Definition', 'Evidence', 'Approval checklist'] },
      { slug: 'review-queue', title: 'Review queue', purpose: 'Resolve exceptions and specialist questions before approval.', primaryAction: 'Record resolution', sections: ['Priority queue', 'Resolution evidence', 'Audit history'] },
    ],
  },
  {
    id: 'saas-admin',
    name: 'SaaS administration',
    description: 'Workspace, member, permission, usage, and configuration flows.',
    bestFor: 'B2B SaaS products and internal platforms',
    screens: [
      { slug: 'overview', title: 'Workspace overview', purpose: 'Summarize product health, work, and attention areas.', primaryAction: 'Create item', sections: ['Key metrics', 'Recent activity', 'Attention required'] },
      { slug: 'records', title: 'Records', purpose: 'Search, filter, sort, and manage core product records.', primaryAction: 'Add record', sections: ['Search and filters', 'Data table', 'Bulk actions'] },
      { slug: 'record-detail', title: 'Record detail', purpose: 'Inspect one record, its status, history, and related work.', primaryAction: 'Save changes', sections: ['Record fields', 'Related items', 'Activity'] },
      { slug: 'members-access', title: 'Members & access', purpose: 'Manage membership and explicit permission boundaries.', primaryAction: 'Invite member', sections: ['Members', 'Roles', 'Pending invitations'] },
    ],
  },
  {
    id: 'operations-console',
    name: 'Operations console',
    description: 'Live status, work queues, incidents, recovery, and audit operations.',
    bestFor: 'Support, logistics, reliability, and business operations',
    screens: [
      { slug: 'command-center', title: 'Command center', purpose: 'Expose system state, workload, and operational risk.', primaryAction: 'Open incident', sections: ['Service health', 'Queue depth', 'Alerts'] },
      { slug: 'work-queue', title: 'Work queue', purpose: 'Prioritize and assign operational work.', primaryAction: 'Assign work', sections: ['Priority filters', 'Queue', 'SLA status'] },
      { slug: 'incident-detail', title: 'Incident detail', purpose: 'Coordinate evidence, decisions, recovery, and communication.', primaryAction: 'Update incident', sections: ['Timeline', 'Impact', 'Recovery checklist'] },
      { slug: 'audit-log', title: 'Audit log', purpose: 'Trace actions and outcomes across the operating workflow.', primaryAction: 'Export evidence', sections: ['Event filters', 'Change history', 'Evidence links'] },
    ],
  },
  {
    id: 'mobile-onboarding',
    name: 'Mobile onboarding',
    description: 'Progressive account, identity, consent, and completion journey.',
    bestFor: 'Consumer onboarding and guided applications',
    screens: [
      { slug: 'welcome', title: 'Welcome', purpose: 'Set expectations and collect informed consent.', primaryAction: 'Get started', sections: ['Value proposition', 'Trust statement', 'Consent'] },
      { slug: 'profile', title: 'Profile setup', purpose: 'Collect the minimum required identity and profile data.', primaryAction: 'Continue', sections: ['Progress', 'Profile fields', 'Privacy context'] },
      { slug: 'verification', title: 'Verification', purpose: 'Complete an evidence-backed verification step with recovery.', primaryAction: 'Verify', sections: ['Instructions', 'Evidence capture', 'Help and retry'] },
      { slug: 'completion', title: 'Completion', purpose: 'Confirm the outcome and make the next action clear.', primaryAction: 'Open product', sections: ['Confirmation', 'Next steps', 'Support'] },
    ],
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Discovery, comparison, detail, checkout, and order workflows.',
    bestFor: 'Commerce, catalogue, procurement, and booking products',
    screens: [
      { slug: 'discover', title: 'Discover', purpose: 'Help users find relevant items with explainable filters.', primaryAction: 'View item', sections: ['Search', 'Categories', 'Results'] },
      { slug: 'item-detail', title: 'Item detail', purpose: 'Support an informed decision with evidence and constraints.', primaryAction: 'Add to selection', sections: ['Summary', 'Details', 'Availability'] },
      { slug: 'selection', title: 'Selection', purpose: 'Review choices, cost, and policy before commitment.', primaryAction: 'Continue', sections: ['Selected items', 'Cost summary', 'Constraints'] },
      { slug: 'checkout', title: 'Checkout', purpose: 'Confirm identity, fulfillment, consent, and final outcome.', primaryAction: 'Confirm order', sections: ['Contact', 'Fulfillment', 'Review'] },
    ],
  },
  {
    id: 'developer-portal',
    name: 'Developer portal',
    description: 'API discovery, credentials, environments, usage, and troubleshooting.',
    bestFor: 'Developer products, integrations, and platform capabilities',
    screens: [
      { slug: 'api-overview', title: 'API overview', purpose: 'Explain capabilities, prerequisites, and quick-start paths.', primaryAction: 'View quick start', sections: ['Capabilities', 'Quick start', 'Status'] },
      { slug: 'api-reference', title: 'API reference', purpose: 'Explore contracts, schemas, examples, and errors.', primaryAction: 'Try request', sections: ['Navigation', 'Endpoint contract', 'Examples'] },
      { slug: 'credentials', title: 'Credentials', purpose: 'Create and rotate credentials with explicit security boundaries.', primaryAction: 'Create credential', sections: ['Environments', 'Credentials', 'Security guidance'] },
      { slug: 'request-logs', title: 'Request logs', purpose: 'Diagnose integration behavior without exposing sensitive data.', primaryAction: 'Inspect request', sections: ['Filters', 'Requests', 'Error detail'] },
    ],
  },
];

export function getWireframeTemplate(id: WireframeTemplateId) {
  const template = WIREFRAME_TEMPLATES.find((candidate) => candidate.id === id);
  if (!template) throw new Error('Wireframe template not found');
  return template;
}
