import { createHash } from 'node:crypto';
import {
  ProjectKnowledge,
  type ClarificationQuestion,
  type KnowledgeEntity,
  type ProjectGap,
  type ProjectKnowledge as ProjectKnowledgeType,
  type ProjectReadiness,
  type TechStackRecommendation,
} from './schemas';

function stableId(prefix: string, projectId: string, key: string) {
  return `${prefix}-${createHash('sha256').update(`${projectId}:${key}`).digest('hex').slice(0, 14).toUpperCase()}`;
}

type GapDraft = Omit<ProjectGap, 'id' | 'projectId' | 'status' | 'truthStatus'> & {
  question: string;
  whyItMatters: string;
  options: string[];
  signal: RegExp;
};

function affectedIds(entities: KnowledgeEntity[], categories: KnowledgeEntity['category'][] = []) {
  const matches = entities.filter((entity) => categories.includes(entity.category)).map((entity) => entity.id);
  return matches.slice(0, 8);
}

export function buildProjectIntelligence(input: {
  projectId: string;
  projectName: string;
  entities: KnowledgeEntity[];
  sourceText: string;
  calculatedAt: string;
}) {
  const requirementIds = affectedIds(input.entities, ['REQUIREMENT']);
  const nfrIds = affectedIds(input.entities, ['NFR']);
  const constraintIds = affectedIds(input.entities, ['CONSTRAINT', 'DECISION']);
  const subject = input.projectName.trim() || 'this project';
  const drafts: GapDraft[] = [
    {
      type: 'MISSING', category: 'FUNCTIONAL_SCOPE', title: 'Actors, permissions, and decision ownership', severity: 'BLOCKER',
      description: `The submitted sources do not define a complete role and permission model for ${subject}.`,
      impactAreas: ['requirements', 'security', 'wireframes'], affectedEntityIds: requirementIds, affectedArtifacts: ['SRS', 'HLD', 'WIREFRAME', 'BACKLOG'],
      rationale: 'Without explicit actors and authority boundaries, the product can generate unsafe workflows and untestable approvals.',
      question: `Which user roles will use ${subject}, and what may each role create, view, change, approve, or delete?`,
      whyItMatters: 'The answer defines authorization boundaries, user journeys, acceptance criteria, and the screens that Axiom may safely propose.',
      options: ['Administrator and standard member', 'Maker, reviewer, and approver', 'Single trusted operator for the MVP'],
      signal: /\b(actor|role|permission|authori[sz]|admin|approver|reviewer)\b/i,
    },
    {
      type: 'MISSING', category: 'SECURITY_PRIVACY', title: 'Security and sensitive-data boundaries', severity: 'BLOCKER',
      description: `Authentication, authorization, sensitive-data classification, and retention boundaries are incomplete for ${subject}.`,
      impactAreas: ['security', 'architecture', 'compliance'], affectedEntityIds: [...nfrIds, ...constraintIds].slice(0, 8), affectedArtifacts: ['SRS', 'NFR', 'HLD', 'ADR', 'TEST_STRATEGY'],
      rationale: 'Security boundaries influence architecture selection, data stores, integrations, auditability, and release criteria.',
      question: `Which data handled by ${subject} is sensitive, who may access it, and are there retention or residency rules?`,
      whyItMatters: 'The answer determines encryption, access control, logging, deletion, regional deployment, and verification requirements.',
      options: ['Business-confidential data only', 'Personal data requiring restricted access', 'Regulated data requiring specialist review'],
      signal: /\b(authentication|authorization|sensitive|personal data|pii|privacy|retention|residency|encrypt)\b/i,
    },
    {
      type: 'MISSING', category: 'INTEGRATION', title: 'External systems and ownership boundaries', severity: 'HIGH',
      description: `External providers, contracts, system ownership, and degraded behavior are not fully specified for ${subject}.`,
      impactAreas: ['architecture', 'interfaces', 'operations'], affectedEntityIds: requirementIds, affectedArtifacts: ['SRS', 'HLD', 'ADR', 'TEST_STRATEGY'],
      rationale: 'Integration contracts affect consistency, retries, timeouts, security, delivery sequencing, and cost.',
      question: `Which external systems must ${subject} integrate with, and which system owns each shared record?`,
      whyItMatters: 'The answer establishes API boundaries, ownership, failure behavior, and which dependencies should be isolated behind adapters.',
      options: ['No external integration in the first release', 'One synchronous system of record', 'Several providers with asynchronous coordination'],
      signal: /\b(api|integration|provider|third[- ]party|webhook|system of record|external system)\b/i,
    },
    {
      type: 'UNTESTABLE', category: 'NFR', title: 'Scale, latency, availability, and cost targets', severity: 'HIGH',
      description: `The operating envelope for ${subject} is not complete enough to verify architecture suitability.`,
      impactAreas: ['performance', 'reliability', 'cost'], affectedEntityIds: nfrIds, affectedArtifacts: ['NFR', 'HLD', 'ADR', 'TEST_STRATEGY'],
      rationale: 'Architecture and technology recommendations require measurable load, latency, availability, recovery, and budget assumptions.',
      question: `What peak load, response-time target, availability target, recovery objective, and monthly budget should ${subject} meet?`,
      whyItMatters: 'These numbers determine capacity, caching, async boundaries, database design, deployment shape, and verification thresholds.',
      options: ['Low-volume internal workflow', 'Moderate customer-facing workload', 'High-volume or business-critical workload'],
      signal: /\b(p95|p99|latency|requests per|throughput|availability|rto|rpo|monthly cost|budget)\b/i,
    },
    {
      type: 'MISSING', category: 'FAILURE_HANDLING', title: 'Failure, retry, and recovery behavior', severity: 'HIGH',
      description: `User-visible and operational recovery behavior is not fully defined for ${subject}.`,
      impactAreas: ['requirements', 'reliability', 'testing', 'wireframes'], affectedEntityIds: [...requirementIds, ...nfrIds].slice(0, 8), affectedArtifacts: ['SRS', 'NFR', 'HLD', 'WIREFRAME', 'TEST_STRATEGY'],
      rationale: 'Happy-path requirements alone cannot define reliable workflows or complete wireframe states.',
      question: `When a dependency, validation step, or background operation fails in ${subject}, what should users see and what should the system retry?`,
      whyItMatters: 'The answer creates error states, idempotency rules, retry limits, alerts, and recovery acceptance criteria.',
      options: ['Fail immediately with a retry action', 'Retry automatically, then require manual recovery', 'Queue work and notify the user asynchronously'],
      signal: /\b(retry|failure|error state|timeout|recovery|degraded|idempot)\b/i,
    },
    {
      type: 'MISSING', category: 'DATA', title: 'Core records, lifecycle, and audit history', severity: 'HIGH',
      description: `The canonical records, lifecycle states, ownership, and audit requirements for ${subject} remain incomplete.`,
      impactAreas: ['data', 'architecture', 'traceability'], affectedEntityIds: requirementIds, affectedArtifacts: ['SRS', 'HLD', 'ADR', 'WIREFRAME'],
      rationale: 'Data lifecycle and ownership are prerequisites for storage, APIs, concurrency, audit, and screen-state design.',
      question: `What are the core records in ${subject}, which lifecycle states do they use, and which history must be retained?`,
      whyItMatters: 'The answer shapes the data model, APIs, audit trail, workflow screens, and migration strategy.',
      options: ['Simple draft and completed lifecycle', 'Draft, review, approved, and archived lifecycle', 'Event history with domain-specific lifecycle states'],
      signal: /\b(entity|record|data model|lifecycle|state|status|audit history|ownership)\b/i,
    },
    {
      type: 'UNTESTABLE', category: 'TESTABILITY', title: 'Acceptance criteria and verification ownership', severity: 'MEDIUM',
      description: `The sources do not provide complete testable acceptance criteria for the primary ${subject} journeys.`,
      impactAreas: ['requirements', 'testing', 'delivery'], affectedEntityIds: requirementIds, affectedArtifacts: ['SRS', 'TEST_STRATEGY', 'BACKLOG'],
      rationale: 'A requirement is not implementation-ready until success, validation, authorization, and failure outcomes are verifiable.',
      question: `Who accepts ${subject}, and which outcomes must be demonstrated before its first release is considered ready?`,
      whyItMatters: 'The answer provides release gates and prevents generated stories, tests, and evidence from relying on invented criteria.',
      options: ['Product owner accepts business flows', 'Product and architecture jointly approve', 'Specialist security or compliance review is also required'],
      signal: /\b(acceptance criteria|definition of done|verification method|release gate|sign[- ]off)\b/i,
    },
    {
      type: 'MISSING', category: 'DELIVERY', title: 'Delivery constraints and operating ownership', severity: 'MEDIUM',
      description: `Timeline, team capability, deployment constraints, and operational ownership are incomplete for ${subject}.`,
      impactAreas: ['delivery', 'architecture', 'operations'], affectedEntityIds: constraintIds, affectedArtifacts: ['HLD', 'ADR', 'BACKLOG'],
      rationale: 'The best architecture is conditional on the team, deadline, platform constraints, budget, and ownership model.',
      question: `What deadline, team skills, hosting constraints, and operational ownership apply to ${subject}?`,
      whyItMatters: 'The answer changes delivery risk, technology fit, service boundaries, cost, and the point at which a more distributed architecture is justified.',
      options: ['Small team and rapid MVP delivery', 'Established platform team and managed cloud', 'Strict portability or on-premises requirement'],
      signal: /\b(deadline|timeline|team skill|hosting|cloud|on-prem|operations owner|support model)\b/i,
    },
  ];

  const missing = drafts.filter((draft) => !draft.signal.test(input.sourceText));
  const selected = [...missing, ...drafts.filter((draft) => !missing.includes(draft))].slice(0, Math.max(5, Math.min(8, missing.length || 5)));
  const gaps: ProjectGap[] = selected.map((draft) => ({
    id: stableId('GAP', input.projectId, draft.category),
    projectId: input.projectId,
    type: draft.type,
    category: draft.category,
    title: draft.title,
    description: missing.includes(draft) ? draft.description : `${draft.title} is mentioned, but its completeness and testability still require human confirmation for ${subject}.`,
    severity: draft.severity,
    impactAreas: draft.impactAreas,
    affectedEntityIds: draft.affectedEntityIds,
    affectedArtifacts: draft.affectedArtifacts,
    rationale: draft.rationale,
    status: 'OPEN',
    truthStatus: 'UNKNOWN',
  }));

  const clarificationQuestions: ClarificationQuestion[] = selected.slice(0, 5).map((draft) => {
    const gapId = stableId('GAP', input.projectId, draft.category);
    const questionId = stableId('CQ', input.projectId, draft.category);
    return {
      id: questionId,
      projectId: input.projectId,
      gapId,
      question: draft.question,
      whyItMatters: draft.whyItMatters,
      affectedEntityIds: draft.affectedEntityIds,
      options: draft.options.map((option, index) => ({ id: `${questionId}-OPT-${index + 1}`, label: option, value: option })),
      status: 'OPEN',
      truthStatus: 'UNKNOWN',
    };
  });

  return {
    gaps,
    clarificationQuestions,
    readiness: calculateReadiness(input.entities, gaps, input.calculatedAt),
    techStack: buildTechStack(input.projectId, input.entities, input.sourceText),
  };
}

const READINESS_WEIGHTS = [
  { key: 'FUNCTIONAL_SCOPE', label: 'Functional scope', maximum: 20 },
  { key: 'NFR', label: 'Non-functional requirements', maximum: 20 },
  { key: 'DATA', label: 'Data', maximum: 8 },
  { key: 'INTEGRATION', label: 'Integrations', maximum: 7 },
  { key: 'FAILURE_HANDLING', label: 'Error and edge cases', maximum: 15 },
  { key: 'SECURITY_PRIVACY', label: 'Security and privacy', maximum: 10 },
  { key: 'TESTABILITY', label: 'Testability', maximum: 10 },
  { key: 'DELIVERY', label: 'Delivery constraints', maximum: 10 },
] as const;

export function calculateReadiness(entities: KnowledgeEntity[], gaps: ProjectGap[], calculatedAt: string): ProjectReadiness {
  const open = gaps.filter((gap) => gap.status === 'OPEN');
  const categories = READINESS_WEIGHTS.map(({ key, label, maximum }) => {
    const openGaps = open.filter((gap) => gap.category === key);
    const hasGroundedSignal = key === 'FUNCTIONAL_SCOPE'
      ? entities.some((entity) => entity.category === 'REQUIREMENT' && entity.truthStatus === 'SOURCE_GROUNDED')
      : key === 'NFR' || key === 'SECURITY_PRIVACY'
        ? entities.some((entity) => entity.category === 'NFR' && entity.truthStatus === 'SOURCE_GROUNDED')
        : key === 'DELIVERY'
          ? entities.some((entity) => entity.category === 'CONSTRAINT' && entity.truthStatus === 'SOURCE_GROUNDED')
          : entities.some((entity) => entity.truthStatus === 'SOURCE_GROUNDED');
    const base = hasGroundedSignal ? Math.round(maximum * 0.45) : Math.round(maximum * 0.2);
    const score = openGaps.length === 0 ? maximum : Math.min(maximum - 1, base);
    return {
      key,
      label,
      score,
      maximum,
      explanation: openGaps.length === 0
        ? 'No unresolved gap remains in this category.'
        : `${openGaps.length} unresolved gap${openGaps.length === 1 ? '' : 's'} limits readiness.`,
      openGapIds: openGaps.map((gap) => gap.id),
    };
  });
  const rawScore = categories.reduce((total, category) => total + category.score, 0);
  const openBlockerIds = open.filter((gap) => gap.severity === 'BLOCKER').map((gap) => gap.id);
  const caps: string[] = [];
  let score = rawScore;
  if (openBlockerIds.length) {
    score = Math.min(score, 69);
    caps.push('Open blocker caps readiness at 69.');
  }
  if (open.some((gap) => gap.category === 'SECURITY_PRIVACY')) {
    score = Math.min(score, 79);
    caps.push('Unknown P0 security or privacy decision caps readiness at 79.');
  }
  return { score, rawScore, categories, openBlockerIds, caps, calculatedAt };
}

function buildTechStack(projectId: string, entities: KnowledgeEntity[], sourceText: string): TechStackRecommendation[] {
  const groundedIds = entities.filter((entity) => entity.truthStatus === 'SOURCE_GROUNDED').map((entity) => entity.id).slice(0, 6);
  const mobile = /\b(mobile|ios|android|onboarding)\b/i.test(sourceText);
  const aiWorkload = /\b(ai|model|llm|machine learning|inference|embedding)\b/i.test(sourceText);
  const highThroughput = /\b(high[- ]volume|million|stream|real[- ]time|p95|requests per second)\b/i.test(sourceText);
  const asyncWork = /\b(notification|queue|retry|background|webhook|asynchronous|workflow)\b/i.test(sourceText);
  const analytics = /\b(analytics|report|dashboard|metric|warehouse|business intelligence)\b/i.test(sourceText);
  const recommendations: Array<Omit<TechStackRecommendation, 'id' | 'sourceEntityIds' | 'truthStatus'>> = [
    { layer: 'EXPERIENCE', recommendation: mobile ? 'React Native application with a shared TypeScript design system and Next.js operations surface' : 'Next.js App Router with TypeScript and a tokenized component system', rationale: mobile ? 'The source signals a mobile journey; native navigation and device capabilities should be first-class while operations remain web-accessible.' : 'The source describes an interaction-rich product that benefits from server rendering, accessible workflows, and focused client islands.', alternatives: mobile ? ['Progressive web app when device APIs are not required', 'Native Swift/Kotlin for platform-specific experiences'] : ['React SPA for a fully client-side operating model', 'Native client when a mobile-only requirement is confirmed'] },
    { layer: 'APPLICATION', recommendation: aiWorkload ? 'TypeScript product service with an isolated Python model-serving boundary' : highThroughput ? 'Modular TypeScript control plane with Go workers for measured hot paths' : 'Modular TypeScript application service', rationale: aiWorkload ? 'Product orchestration stays strongly typed while model-specific libraries and scaling remain isolated behind a versioned contract.' : highThroughput ? 'The source includes throughput or latency signals; keep the control plane simple and reserve Go for profiled concurrency-heavy work.' : 'A single modular service keeps delivery and verification fast while preserving domain boundaries that can be extracted later.', alternatives: ['Go-only service when the whole workload is concurrency-bound', 'Managed functions for isolated bursty handlers'] },
    { layer: 'DATA', recommendation: analytics ? 'Managed PostgreSQL for transactions plus a governed analytics read model' : 'Managed PostgreSQL as the transactional source of truth', rationale: analytics ? 'Transactional ownership and analytical exploration have different access patterns; a derived read model prevents reporting from weakening core workflows.' : 'Provides constraints, transactions, indexing, audit-friendly relations, and explicit ownership for evolving product records.', alternatives: analytics ? ['PostgreSQL read replicas for modest reporting', 'Columnar warehouse after data volume and freshness targets are confirmed'] : ['SQLite for a single-node prototype', 'Document database when aggregate access patterns justify it'] },
    { layer: 'ASYNC', recommendation: asyncWork ? 'Managed durable queue with idempotent workers and a reviewed dead-letter path' : 'In-process jobs initially; introduce a durable queue only for confirmed asynchronous work', rationale: asyncWork ? 'The source signals retries, notifications, webhooks, or background work that must survive process and provider failures.' : 'Avoids distributed workflow overhead until duration, retry, or burst requirements demonstrate the need for durable coordination.', alternatives: ['Workflow engine for long-running multi-step orchestration', 'Event streaming when ordering, replay, and consumer fan-out are measured requirements'] },
    { layer: 'INTEGRATION', recommendation: 'Versioned REST and webhook contracts behind adapters', rationale: 'Makes ownership, validation, idempotency, timeouts, and provider replacement explicit at system boundaries.', alternatives: ['GraphQL for client-driven aggregation', 'Async events for decoupled workflows'] },
    { layer: 'OBSERVABILITY', recommendation: 'OpenTelemetry-compatible structured logs, metrics, and traces', rationale: 'Creates one correlation path across user actions, integrations, asynchronous work, and verification evidence.', alternatives: ['Provider-native telemetry for an MVP', 'Specialized APM when operational scale requires it'] },
    { layer: 'DELIVERY', recommendation: 'Containerized modular monolith on a managed runtime', rationale: 'Minimizes operational burden and deployment coordination while requirements and team ownership remain fluid.', alternatives: ['Serverless deployment for strongly bursty workloads', 'Independent services after ownership or scaling triggers are measured'] },
  ];
  return recommendations.map((recommendation) => ({
    id: stableId('TECH', projectId, recommendation.layer),
    ...recommendation,
    sourceEntityIds: groundedIds,
    truthStatus: 'AI_SUGGESTED',
  }));
}

export function applyClarificationAnswer(input: {
  knowledge: ProjectKnowledgeType;
  questionId: string;
  answer: string;
  answeredAt: string;
}) {
  const answer = input.answer.trim();
  if (!answer) throw new Error('Clarification answer is required');
  const question = input.knowledge.clarificationQuestions.find((item) => item.id === input.questionId);
  if (!question) throw new Error('Clarification question not found');
  if (question.status === 'ANSWERED') throw new Error('Clarification question is already answered');

  const clarificationQuestions = input.knowledge.clarificationQuestions.map((item) => item.id === question.id ? {
    ...item,
    status: 'ANSWERED' as const,
    answer,
    answeredAt: input.answeredAt,
    truthStatus: 'HUMAN_CONFIRMED' as const,
  } : item);
  const gaps = input.knowledge.gaps.map((gap) => gap.id === question.gapId ? {
    ...gap,
    status: 'ANSWERED' as const,
    truthStatus: 'HUMAN_CONFIRMED' as const,
  } : gap);
  const answerEntityId = stableId('KN-ANSWER', input.knowledge.projectId, question.id);
  const entities = [
    ...input.knowledge.entities.filter((entity) => entity.id !== answerEntityId),
    {
      id: answerEntityId,
      projectId: input.knowledge.projectId,
      category: 'DECISION' as const,
      text: `${question.question} Answer: ${answer}`,
      truthStatus: 'HUMAN_CONFIRMED' as const,
      clarificationQuestionId: question.id,
    },
  ];
  const graphVersion = input.knowledge.graphVersion + 1;
  return ProjectKnowledge.parse({
    ...input.knowledge,
    graphVersion,
    entities,
    gaps,
    clarificationQuestions,
    readiness: calculateReadiness(entities, gaps, input.answeredAt),
    analyzer: 'axiom-deterministic-grounded-v2',
  });
}
