import { createHash } from 'node:crypto';
import { ProjectKnowledge, type KnowledgeEntity, type ProjectSource } from './schemas';
import { buildProjectIntelligence } from './intelligence';

type Category = KnowledgeEntity['category'];

const categoryMatchers: Array<{ category: Category; pattern: RegExp }> = [
  { category: 'OPEN_QUESTION', pattern: /\?\s*$/ },
  { category: 'DECISION', pattern: /\b(decided|agreed|approved|selected|chosen|we will|decision:)\b/i },
  { category: 'RISK', pattern: /\b(risk|threat|may fail|could fail|dependency|blocked by|concern)\b/i },
  { category: 'CONSTRAINT', pattern: /\b(budget|deadline|timeline|region|residency|constraint|limited to|must use|cannot use|no more than|below\s+(?:usd|\$))\b/i },
  { category: 'NFR', pattern: /\b(latency|throughput|availability|reliability|security|privacy|scalab|performance|audit|compliance|retention|rto|rpo|p95|p99|accessible|accessibility|cost)\b/i },
  { category: 'REQUIREMENT', pattern: /\b(must|shall|should|needs? to|required to|support|allow|provide|enable)\b/i },
];

function candidateSegments(content: string) {
  const matches = content.matchAll(/[^\n.!?]+(?:[.!?]+|$)/g);
  return Array.from(matches, (match) => ({
    text: match[0].trim(),
    startOffset: match.index + (match[0].length - match[0].trimStart().length),
  })).filter((item) => item.text.length >= 12 && item.text.length <= 1_500);
}

function stableEntityId(projectId: string, sourceId: string, category: Category, startOffset: number, text: string) {
  return `KN-${createHash('sha256').update(`${projectId}:${sourceId}:${category}:${startOffset}:${text}`).digest('hex').slice(0, 16).toUpperCase()}`;
}

export function analyzeProjectSources(projectId: string, graphVersion: number, sources: ProjectSource[], analyzedAt = new Date().toISOString(), projectName = 'Project') {
  const entities: KnowledgeEntity[] = [];
  for (const source of sources.filter((item) => item.status === 'EXTRACTED')) {
    for (const segment of candidateSegments(source.extractedText)) {
      const matcher = categoryMatchers.find((item) => item.pattern.test(segment.text));
      if (!matcher) continue;
      entities.push({
        id: stableEntityId(projectId, source.id, matcher.category, segment.startOffset, segment.text),
        projectId,
        category: matcher.category,
        text: segment.text,
        truthStatus: 'SOURCE_GROUNDED',
        sourceId: source.id,
        quote: segment.text,
        startOffset: segment.startOffset,
        endOffset: segment.startOffset + segment.text.length,
      });
    }
  }

  const present = new Set(entities.map((entity) => entity.category));
  const unknowns: Array<{ category: Category; text: string }> = [
    { category: 'OPEN_QUESTION', text: 'Architecture-driving ambiguities require human clarification before ARB approval.' },
    { category: 'NFR', text: 'No measurable non-functional requirements were found in the submitted sources.' },
    { category: 'RISK', text: 'No explicit delivery or architecture risks were found in the submitted sources.' },
  ];
  for (const unknown of unknowns) {
    if (present.has(unknown.category)) continue;
    entities.push({
      id: stableEntityId(projectId, 'UNKNOWN', unknown.category, 0, unknown.text),
      projectId,
      category: unknown.category,
      text: unknown.text,
      truthStatus: 'UNKNOWN',
    });
  }

  const firstSource = sources.find((source) => source.status === 'EXTRACTED');
  const summary = firstSource
    ? candidateSegments(firstSource.extractedText).slice(0, 3).map((item) => item.text).join(' ').slice(0, 1_200)
    : 'No source text was successfully extracted. Resolve source failures before architecture review.';

  const architectureOptions = [
    {
      id: `ARCH-MODULAR-${projectId}`,
      projectId,
      name: 'Modular monolith',
      summary: 'A single deployable system with explicit domain modules and replaceable external adapters.',
      recommended: true,
      deploymentModel: 'One containerized application on a managed runtime with a managed relational database and optional worker process.',
      components: [
        { name: 'Product experience', responsibility: 'Presents role-aware workflows and validates user input.' },
        { name: 'Domain modules', responsibility: 'Own product rules, lifecycle transitions, and use cases behind explicit interfaces.' },
        { name: 'Integration adapters', responsibility: 'Isolate external APIs, webhooks, object storage, and asynchronous delivery.' },
        { name: 'PostgreSQL', responsibility: 'Persists transactional state, audit history, and idempotency records.' },
      ],
      dataFlows: [
        'A request enters the experience layer, is authorized and validated, then invokes one domain use case.',
        'The domain transaction writes canonical state and an audit record before returning a result.',
        'Confirmed asynchronous work is committed to a durable queue through an adapter and processed with idempotent retries.',
      ],
      technologies: ['Next.js', 'TypeScript', 'PostgreSQL', 'Managed object storage', 'Managed durable queue when required', 'OpenTelemetry'],
      why: ['Fastest delivery path while requirements are still evolving', 'Lower operational burden and simpler end-to-end testing'],
      whyNot: ['Independent scaling and deployment boundaries are limited', 'Requires discipline to preserve module boundaries'],
      assumptions: ['One team owns the first release', 'Most modules share a release cadence', 'Measured load does not require independent service scaling'],
      failureModes: [
        { failure: 'Module boundaries erode into implicit coupling.', mitigation: 'Enforce dependency direction with module APIs and architecture tests.' },
        { failure: 'A slow provider consumes application capacity.', mitigation: 'Use timeouts and move confirmed long-running work to a durable worker.' },
      ],
      reconsiderationTriggers: [
        { metric: 'Team ownership', condition: 'Two or more teams require independent release control for stable domains.' },
        { metric: 'Capacity', condition: 'One module repeatedly saturates resources while the rest of the application remains below 40% utilization.' },
      ],
      estimatedCost: { range: 'Low to moderate', basis: 'Estimate assumes one managed application runtime, PostgreSQL, object storage, and modest queue usage; provider and load inputs remain unresolved.', truthStatus: 'AI_SUGGESTED' as const },
      scoreBreakdown: { deliverySpeed: 5, operationalSimplicity: 5, scalability: 3, reliability: 4, security: 4, portability: 4, teamFit: 5 },
      risks: ['Module coupling can increase without architecture fitness checks'],
      truthStatus: 'AI_SUGGESTED' as const,
    },
    {
      id: `ARCH-EVENT-${projectId}`,
      projectId,
      name: 'Managed event-driven services',
      summary: 'Managed APIs, functions, queues, and event handlers for asynchronous and variable workloads.',
      recommended: false,
      deploymentModel: 'Managed request handlers, durable queues, event consumers, managed relational storage, and object storage.',
      components: [
        { name: 'API boundary', responsibility: 'Authorizes and validates synchronous requests.' },
        { name: 'Workflow handlers', responsibility: 'Coordinate short-lived domain actions and publish durable work.' },
        { name: 'Managed queue', responsibility: 'Buffers work, supports retry, and isolates provider availability.' },
        { name: 'Managed data services', responsibility: 'Persist canonical records and immutable operational events.' },
      ],
      dataFlows: [
        'The API validates a request, commits canonical state and a durable work item, then returns an accepted result.',
        'Consumers process queued work idempotently and record each outcome.',
        'Status queries read canonical state; callbacks and notifications are correlated to the original request.',
      ],
      technologies: ['TypeScript handlers', 'Managed API runtime', 'PostgreSQL', 'Managed queue', 'Object storage', 'OpenTelemetry'],
      why: ['Natural fit for asynchronous workflows and burst handling', 'Managed services reduce infrastructure ownership'],
      whyNot: ['Increases cloud-provider coupling', 'Distributed tracing and failure recovery require deliberate design'],
      assumptions: ['A material portion of work is asynchronous', 'The selected provider offers acceptable regional and operational guarantees', 'The team can operate idempotent distributed workflows'],
      failureModes: [
        { failure: 'At-least-once delivery creates duplicate side effects.', mitigation: 'Require stable idempotency keys and transactional outcome records.' },
        { failure: 'Poison messages retry indefinitely.', mitigation: 'Bound attempts, route failures to a review queue, and alert on age and depth.' },
      ],
      reconsiderationTriggers: [
        { metric: 'Synchronous workflow share', condition: 'More than 80% of requests are short synchronous transactions with stable load.' },
        { metric: 'Provider portability', condition: 'A confirmed contractual requirement prohibits provider-specific queues or functions.' },
      ],
      estimatedCost: { range: 'Low at idle; moderate and workload-dependent', basis: 'Estimate assumes managed request, queue, database, storage, and observability services; exact traffic and retention are UNKNOWN.', truthStatus: 'AI_SUGGESTED' as const },
      scoreBreakdown: { deliverySpeed: 4, operationalSimplicity: 4, scalability: 5, reliability: 4, security: 4, portability: 2, teamFit: 3 },
      risks: ['Retries and duplicate events can create inconsistent outcomes without idempotency'],
      truthStatus: 'AI_SUGGESTED' as const,
    },
    {
      id: `ARCH-CONTAINER-${projectId}`,
      projectId,
      name: 'Containerized services',
      summary: 'Separately deployable services with explicit APIs and a managed container platform.',
      recommended: false,
      deploymentModel: 'Multiple independently deployed containers behind an ingress layer with isolated runtime and data ownership boundaries.',
      components: [
        { name: 'Domain services', responsibility: 'Own independently released business capabilities and their contracts.' },
        { name: 'Ingress and identity', responsibility: 'Apply edge policy, authentication, routing, and request correlation.' },
        { name: 'Service data stores', responsibility: 'Preserve explicit ownership and avoid shared-write coupling.' },
        { name: 'Platform layer', responsibility: 'Provides deployment, secrets, networking, telemetry, and incident tooling.' },
      ],
      dataFlows: [
        'The ingress authorizes and routes requests to the owning domain service.',
        'Services coordinate through versioned APIs or durable events and avoid cross-service database writes.',
        'Telemetry propagates a correlation context across every synchronous and asynchronous boundary.',
      ],
      technologies: ['Managed container platform', 'TypeScript or Go services', 'PostgreSQL per ownership boundary', 'Managed queue', 'API gateway or ingress', 'OpenTelemetry'],
      why: ['Supports independent service evolution and portability', 'Clear deployment boundaries for mature domain ownership'],
      whyNot: ['Highest operational and delivery overhead for an early project', 'Requires service ownership, observability, and platform skills'],
      assumptions: ['Stable domain boundaries are known', 'Independent teams own services end to end', 'Operational maturity justifies multiple deployables and data stores'],
      failureModes: [
        { failure: 'Synchronous service chains amplify latency and outages.', mitigation: 'Minimize call depth, set budgets and timeouts, and prefer owned read models or async coordination.' },
        { failure: 'Shared data access defeats service ownership.', mitigation: 'Assign one writer per data domain and expose versioned contracts.' },
      ],
      reconsiderationTriggers: [
        { metric: 'Independent ownership', condition: 'Do not select until at least two stable domains have dedicated teams and release cadences.' },
        { metric: 'Operational overhead', condition: 'Reconsider if platform work exceeds 20% of delivery capacity for two consecutive iterations.' },
      ],
      estimatedCost: { range: 'Moderate to high', basis: 'Estimate includes multiple runtimes, platform controls, service telemetry, and additional non-production environments; exact topology is UNKNOWN.', truthStatus: 'AI_SUGGESTED' as const },
      scoreBreakdown: { deliverySpeed: 2, operationalSimplicity: 1, scalability: 5, reliability: 3, security: 3, portability: 4, teamFit: 2 },
      risks: ['Premature service decomposition can slow delivery and obscure transactions'],
      truthStatus: 'AI_SUGGESTED' as const,
    },
  ];

  const sourceText = sources.filter((source) => source.status === 'EXTRACTED').map((source) => source.extractedText).join('\n');
  const intelligence = buildProjectIntelligence({ projectId, projectName, entities, sourceText, calculatedAt: analyzedAt });

  return ProjectKnowledge.parse({
    projectId,
    graphVersion,
    summary,
    entities,
    ...intelligence,
    architectureOptions,
    analyzedAt,
    analyzer: 'axiom-deterministic-grounded-v2',
  });
}
