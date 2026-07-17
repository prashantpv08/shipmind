import type { WireframeTemplateId } from './schemas';

export type WireframeTemplate = {
  id: WireframeTemplateId;
  name: string;
  description: string;
  bestFor: string;
  category: string;
  accent: string;
  navigation: string[];
  previewLayout: 'sidebar' | 'topbar' | 'mobile' | 'command' | 'commerce';
  screens: Array<{ slug: string; title: string; purpose: string; primaryAction: string; sections: string[] }>;
};

export const WIREFRAME_TEMPLATES: WireframeTemplate[] = [
  {
    id: 'regulated-workflow',
    name: 'Regulated workflow',
    description: 'Evidence-led review, approval, exception, and audit journeys.',
    bestFor: 'Financial services, healthcare, policy, compliance, and case management',
    category: 'Governance', accent: '#6d5dfc', navigation: ['Overview', 'Cases', 'Evidence', 'Approvals'], previewLayout: 'sidebar',
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
    category: 'B2B SaaS', accent: '#3478f6', navigation: ['Home', 'Records', 'Members', 'Settings'], previewLayout: 'sidebar',
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
    category: 'Operations', accent: '#16a085', navigation: ['Command', 'Queue', 'Incidents', 'Audit'], previewLayout: 'command',
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
    category: 'Consumer mobile', accent: '#ff6b6b', navigation: ['Welcome', 'Profile', 'Verify', 'Complete'], previewLayout: 'mobile',
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
    category: 'Commerce', accent: '#e85d04', navigation: ['Discover', 'Saved', 'Orders', 'Account'], previewLayout: 'commerce',
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
    category: 'Developer tools', accent: '#7c3aed', navigation: ['Overview', 'Reference', 'Credentials', 'Logs'], previewLayout: 'sidebar',
    screens: [
      { slug: 'api-overview', title: 'API overview', purpose: 'Explain capabilities, prerequisites, and quick-start paths.', primaryAction: 'View quick start', sections: ['Capabilities', 'Quick start', 'Status'] },
      { slug: 'api-reference', title: 'API reference', purpose: 'Explore contracts, schemas, examples, and errors.', primaryAction: 'Try request', sections: ['Navigation', 'Endpoint contract', 'Examples'] },
      { slug: 'credentials', title: 'Credentials', purpose: 'Create and rotate credentials with explicit security boundaries.', primaryAction: 'Create credential', sections: ['Environments', 'Credentials', 'Security guidance'] },
      { slug: 'request-logs', title: 'Request logs', purpose: 'Diagnose integration behavior without exposing sensitive data.', primaryAction: 'Inspect request', sections: ['Filters', 'Requests', 'Error detail'] },
    ],
  },
  {
    id: 'ai-copilot',
    name: 'AI copilot',
    description: 'Conversational workbench with context, sources, actions, and reviewable outputs.',
    bestFor: 'AI assistants, research agents, content copilots, and engineering agents',
    category: 'AI native', accent: '#8b5cf6', navigation: ['New thread', 'Projects', 'Knowledge', 'Activity'], previewLayout: 'sidebar',
    screens: [
      { slug: 'copilot-home', title: 'Copilot home', purpose: 'Start from context, templates, or a focused user goal.', primaryAction: 'Start session', sections: ['Prompt composer', 'Recent work', 'Suggested starts'] },
      { slug: 'conversation', title: 'Conversation workbench', purpose: 'Keep reasoning, sources, and actions understandable while work progresses.', primaryAction: 'Run action', sections: ['Conversation', 'Context rail', 'Tool activity'] },
      { slug: 'output-review', title: 'Output review', purpose: 'Compare generated output with sources and requested constraints.', primaryAction: 'Accept revision', sections: ['Generated result', 'Source citations', 'Review changes'] },
      { slug: 'agent-history', title: 'Agent history', purpose: 'Inspect prior runs, decisions, failures, and recoverable state.', primaryAction: 'Resume run', sections: ['Run timeline', 'Decisions', 'Evidence'] },
    ],
  },
  {
    id: 'analytics-dashboard',
    name: 'Analytics dashboard',
    description: 'Metric exploration, segmentation, drill-down, anomalies, and reporting.',
    bestFor: 'Product analytics, finance reporting, executive dashboards, and BI products',
    category: 'Analytics', accent: '#0891b2', navigation: ['Overview', 'Explore', 'Reports', 'Alerts'], previewLayout: 'topbar',
    screens: [
      { slug: 'metrics-overview', title: 'Metrics overview', purpose: 'Show trusted KPIs, freshness, and meaningful movement.', primaryAction: 'Explore metric', sections: ['KPI strip', 'Trends', 'Data freshness'] },
      { slug: 'explore', title: 'Explore data', purpose: 'Build a focused view through filters and dimensions.', primaryAction: 'Apply view', sections: ['Query controls', 'Visualization', 'Breakdown'] },
      { slug: 'metric-detail', title: 'Metric detail', purpose: 'Explain one metric, its lineage, drivers, and anomalies.', primaryAction: 'Create alert', sections: ['Definition', 'Drivers', 'Anomalies'] },
      { slug: 'report-builder', title: 'Report builder', purpose: 'Compose, schedule, and govern a reusable report.', primaryAction: 'Publish report', sections: ['Report canvas', 'Audience', 'Schedule'] },
    ],
  },
  {
    id: 'healthcare-portal',
    name: 'Healthcare portal',
    description: 'Patient journeys, clinical workflows, consent, and protected records.',
    bestFor: 'Patient portals, care coordination, appointments, and clinical operations',
    category: 'Healthcare', accent: '#0f9f82', navigation: ['Today', 'Patients', 'Care plans', 'Messages'], previewLayout: 'sidebar',
    screens: [
      { slug: 'care-overview', title: 'Care overview', purpose: 'Summarize the patient journey with explicit privacy boundaries.', primaryAction: 'Open care plan', sections: ['Care summary', 'Upcoming actions', 'Consent status'] },
      { slug: 'patient-record', title: 'Patient record', purpose: 'Review a protected longitudinal record with provenance.', primaryAction: 'Add observation', sections: ['Clinical summary', 'Timeline', 'Access history'] },
      { slug: 'appointment', title: 'Appointment flow', purpose: 'Schedule or manage care with clear preparation and recovery.', primaryAction: 'Confirm appointment', sections: ['Availability', 'Preparation', 'Confirmation'] },
      { slug: 'care-task', title: 'Care task', purpose: 'Coordinate a care action with ownership and escalation.', primaryAction: 'Complete task', sections: ['Task details', 'Clinical evidence', 'Escalation'] },
    ],
  },
  {
    id: 'fintech-banking',
    name: 'Fintech banking',
    description: 'Accounts, transactions, approvals, controls, and financial confidence.',
    bestFor: 'Digital banking, treasury, payments, lending, and wealth products',
    category: 'Fintech', accent: '#2563eb', navigation: ['Accounts', 'Payments', 'Approvals', 'Insights'], previewLayout: 'topbar',
    screens: [
      { slug: 'financial-home', title: 'Financial overview', purpose: 'Present balances, movement, risk, and priority actions clearly.', primaryAction: 'Move money', sections: ['Accounts', 'Cash flow', 'Attention required'] },
      { slug: 'transactions', title: 'Transactions', purpose: 'Search and understand money movement with status and evidence.', primaryAction: 'View transaction', sections: ['Filters', 'Transaction ledger', 'Status'] },
      { slug: 'payment-flow', title: 'Payment flow', purpose: 'Create and verify a payment with controls before commitment.', primaryAction: 'Review payment', sections: ['Recipient', 'Amount and schedule', 'Policy checks'] },
      { slug: 'approval-detail', title: 'Approval detail', purpose: 'Make a controlled financial decision with audit context.', primaryAction: 'Approve payment', sections: ['Payment summary', 'Risk checks', 'Approval trail'] },
    ],
  },
  {
    id: 'crm-sales',
    name: 'CRM & sales',
    description: 'Pipeline, accounts, opportunities, activities, and forecasting.',
    bestFor: 'Sales platforms, customer success, partnerships, and revenue operations',
    category: 'CRM', accent: '#f59e0b', navigation: ['Pipeline', 'Accounts', 'Activity', 'Forecast'], previewLayout: 'sidebar',
    screens: [
      { slug: 'sales-home', title: 'Sales command center', purpose: 'Focus teams on pipeline movement and next-best actions.', primaryAction: 'Create opportunity', sections: ['Pipeline health', 'Priority deals', 'Tasks'] },
      { slug: 'pipeline', title: 'Pipeline', purpose: 'Explore opportunities by stage, owner, risk, and value.', primaryAction: 'Update stage', sections: ['Pipeline board', 'Filters', 'Forecast impact'] },
      { slug: 'account-detail', title: 'Account detail', purpose: 'Understand the relationship, history, stakeholders, and open work.', primaryAction: 'Log activity', sections: ['Account summary', 'Contacts', 'Timeline'] },
      { slug: 'opportunity-detail', title: 'Opportunity detail', purpose: 'Coordinate a revenue outcome with evidence and next steps.', primaryAction: 'Advance deal', sections: ['Deal health', 'Buying team', 'Action plan'] },
    ],
  },
  {
    id: 'collaboration-workspace',
    name: 'Collaboration workspace',
    description: 'Shared projects, documents, tasks, comments, and decision history.',
    bestFor: 'Project management, knowledge tools, design collaboration, and team hubs',
    category: 'Collaboration', accent: '#ec4899', navigation: ['Home', 'Projects', 'Docs', 'Inbox'], previewLayout: 'topbar',
    screens: [
      { slug: 'workspace-home', title: 'Workspace home', purpose: 'Orient the team around active work and shared context.', primaryAction: 'Create work', sections: ['Recent work', 'Team activity', 'Pinned knowledge'] },
      { slug: 'project-board', title: 'Project board', purpose: 'Plan and move work with visible owners and dependencies.', primaryAction: 'Add task', sections: ['Board', 'Filters', 'Milestones'] },
      { slug: 'collaborative-doc', title: 'Collaborative document', purpose: 'Create and review knowledge with comments and decision history.', primaryAction: 'Share for review', sections: ['Document canvas', 'Comments', 'Version history'] },
      { slug: 'team-inbox', title: 'Team inbox', purpose: 'Resolve mentions, approvals, and requested decisions.', primaryAction: 'Resolve item', sections: ['Priority inbox', 'Context preview', 'Resolution'] },
    ],
  },
];

export function getWireframeTemplate(id: WireframeTemplateId) {
  const template = WIREFRAME_TEMPLATES.find((candidate) => candidate.id === id);
  if (!template) throw new Error('Wireframe template not found');
  return template;
}
