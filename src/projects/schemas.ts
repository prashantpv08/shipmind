import { z } from 'zod';
import { GUIDED_TEXT_LIMIT_MESSAGE, MAX_GUIDED_TEXT_CHARACTERS } from './validation';
import { architectureBudgetErrors } from './architecture-budget';

export const ProjectStatus = z.enum(['DRAFT', 'SOURCES_READY', 'ANALYZED', 'NEEDS_CLARIFICATION', 'DOCUMENTED', 'DOCUMENTS_APPROVED', 'DESIGN_READY', 'ARB_APPROVED', 'HLD_READY', 'PUBLISHED', 'BACKLOG_READY']);
export const SourceKind = z.enum(['FILE', 'FOLDER_FILE', 'MEETING_TRANSCRIPT']);
export const SourceStatus = z.enum(['EXTRACTED', 'FAILED']);
export const KnowledgeCategory = z.enum(['REQUIREMENT', 'NFR', 'DECISION', 'CONSTRAINT', 'RISK', 'OPEN_QUESTION']);
export const ProjectDocumentType = z.enum(['requirements', 'srs', 'nfr', 'hld', 'adr']);
export const GapSeverity = z.enum(['BLOCKER', 'HIGH', 'MEDIUM', 'LOW']);
export const GapStatus = z.enum(['OPEN', 'ANSWERED', 'ACCEPTED_RISK', 'DEFERRED']);
export const GapCategory = z.enum(['FUNCTIONAL_SCOPE', 'NFR', 'DATA', 'INTEGRATION', 'FAILURE_HANDLING', 'SECURITY_PRIVACY', 'TESTABILITY', 'DELIVERY']);
export const WireframeTemplateId = z.enum([
  'regulated-workflow',
  'saas-admin',
  'operations-console',
  'mobile-onboarding',
  'marketplace',
  'developer-portal',
  'ai-copilot',
  'analytics-dashboard',
  'healthcare-portal',
  'fintech-banking',
  'crm-sales',
  'collaboration-workspace',
]);

export const Workspace = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();

export const Project = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(160),
  status: ProjectStatus,
  graphVersion: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();

export const ProjectSource = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1).max(240),
  relativePath: z.string().max(500).optional(),
  kind: SourceKind,
  mimeType: z.string().min(1).max(160),
  size: z.number().int().nonnegative().max(10 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  extractedText: z.string().max(250_000),
  rawPath: z.string().min(1),
  status: SourceStatus,
  extractionError: z.string().max(500).optional(),
  createdAt: z.iso.datetime(),
}).strict();

export const KnowledgeEntity = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  category: KnowledgeCategory,
  text: z.string().min(1),
  truthStatus: z.enum(['SOURCE_GROUNDED', 'HUMAN_CONFIRMED', 'UNKNOWN']),
  sourceId: z.string().optional(),
  clarificationQuestionId: z.string().optional(),
  quote: z.string().optional(),
  startOffset: z.number().int().nonnegative().optional(),
  endOffset: z.number().int().positive().optional(),
}).strict().refine((value) => value.truthStatus !== 'SOURCE_GROUNDED' || Boolean(value.sourceId && value.quote && value.startOffset !== undefined && value.endOffset !== undefined), {
  message: 'Source-grounded knowledge must include exact source evidence',
}).refine((value) => value.truthStatus !== 'HUMAN_CONFIRMED' || Boolean(value.clarificationQuestionId), {
  message: 'Human-confirmed knowledge must reference its clarification question',
});

export const ProjectGap = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  type: z.enum(['MISSING', 'AMBIGUOUS', 'CONFLICTING', 'UNTESTABLE']),
  category: GapCategory,
  title: z.string().min(1),
  description: z.string().min(1),
  severity: GapSeverity,
  impactAreas: z.array(z.string().min(1)).min(1),
  affectedEntityIds: z.array(z.string().min(1)),
  affectedArtifacts: z.array(z.enum(['SRS', 'NFR', 'HLD', 'ADR', 'WIREFRAME', 'TEST_STRATEGY', 'BACKLOG'])).min(1),
  rationale: z.string().min(1),
  status: GapStatus,
  truthStatus: z.enum(['UNKNOWN', 'HUMAN_CONFIRMED']),
}).strict();

export const ClarificationOption = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
}).strict();

export const ClarificationQuestion = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  gapId: z.string().min(1),
  question: z.string().min(1),
  whyItMatters: z.string().min(1),
  affectedEntityIds: z.array(z.string().min(1)),
  options: z.array(ClarificationOption).min(2).max(4),
  status: z.enum(['OPEN', 'ANSWERED']),
  answer: z.string().min(1).max(2_000).optional(),
  answeredAt: z.iso.datetime().optional(),
  truthStatus: z.enum(['UNKNOWN', 'HUMAN_CONFIRMED']),
}).strict().refine((value) => value.status !== 'ANSWERED' || Boolean(value.answer && value.answeredAt && value.truthStatus === 'HUMAN_CONFIRMED'), {
  message: 'Answered clarification questions require an answer, timestamp, and human-confirmed truth status',
});

export const ReadinessCategory = z.object({
  key: GapCategory,
  label: z.string().min(1),
  score: z.number().int().nonnegative(),
  maximum: z.number().int().positive(),
  explanation: z.string().min(1),
  openGapIds: z.array(z.string().min(1)),
}).strict().refine((value) => value.score <= value.maximum, { message: 'Readiness category score cannot exceed its maximum' });

export const ProjectReadiness = z.object({
  score: z.number().int().min(0).max(100),
  rawScore: z.number().int().min(0).max(100),
  categories: z.array(ReadinessCategory).length(8),
  openBlockerIds: z.array(z.string().min(1)),
  caps: z.array(z.string().min(1)),
  calculatedAt: z.iso.datetime(),
}).strict();

export const TechStackRecommendation = z.object({
  id: z.string().min(1),
  layer: z.enum(['EXPERIENCE', 'APPLICATION', 'DATA', 'ASYNC', 'INTEGRATION', 'OBSERVABILITY', 'DELIVERY']),
  recommendation: z.string().min(1),
  rationale: z.string().min(1),
  alternatives: z.array(z.string().min(1)).min(1),
  sourceEntityIds: z.array(z.string().min(1)),
  truthStatus: z.literal('AI_SUGGESTED'),
}).strict();

const ArchitecturePlanningFields = z.object({
  productSurface: z.enum(['STATIC_SITE', 'WEB_APP', 'MOBILE_APP', 'WEB_AND_MOBILE', 'API_SERVICE']),
  deliveryPriority: z.enum(['LOWEST_COST', 'FASTEST_DELIVERY', 'BALANCED', 'SCALE_READY']),
  developmentBudget: z.object({ currency: z.enum(['USD', 'INR', 'EUR', 'GBP']), maximum: z.number().int().positive().max(100_000_000) }).strict(),
  monthlyHostingBudget: z.object({ currency: z.enum(['USD', 'INR', 'EUR', 'GBP']), maximum: z.number().int().nonnegative().max(10_000_000) }).strict(),
  teamSize: z.number().int().positive().max(500),
  teamSkills: z.array(z.enum(['AI_ASSISTED', 'HTML_CSS_JS', 'REACT_TYPESCRIPT', 'PHP_LARAVEL', 'PYTHON', 'GO', 'JAVA', 'DOTNET', 'DART_FLUTTER', 'SWIFT', 'KOTLIN'])).min(1),
  expectedScale: z.enum(['PROTOTYPE', 'SMALL', 'GROWING', 'HIGH_SCALE']),
  hostingPreference: z.enum(['RECOMMEND_FOR_ME', 'CONNECT_EXISTING', 'SELF_HOSTED']),
  preferredProvider: z.string().trim().min(2).max(80).optional(),
  mobileCapabilities: z.array(z.enum(['PUSH_NOTIFICATIONS', 'OFFLINE', 'CAMERA', 'LOCATION', 'PAYMENTS', 'BLUETOOTH'])).max(6),
  selectedPackageId: z.enum(['LEAN', 'BALANCED', 'SCALE_READY']),
}).strict();

function validateArchitecturePlanningInput(value: z.infer<typeof ArchitecturePlanningFields>, context: z.RefinementCtx) {
  if (value.hostingPreference === 'CONNECT_EXISTING' && !value.preferredProvider) context.addIssue({ code: 'custom', path: ['preferredProvider'], message: 'Name the provider you want to connect' });
  const errors = architectureBudgetErrors(value);
  if (errors.development) context.addIssue({ code: 'custom', path: ['developmentBudget', 'maximum'], message: errors.development });
  if (errors.monthlyHosting) context.addIssue({ code: 'custom', path: ['monthlyHostingBudget', 'maximum'], message: errors.monthlyHosting });
}

export const ArchitecturePlanningInput = ArchitecturePlanningFields.superRefine(validateArchitecturePlanningInput);

export const ArchitectureBrief = ArchitecturePlanningFields.extend({
  id: z.string().min(1),
  projectId: z.string().min(1),
  graphVersion: z.number().int().positive(),
  truthStatus: z.literal('HUMAN_CONFIRMED'),
  updatedAt: z.iso.datetime(),
}).strict().superRefine(validateArchitecturePlanningInput);

export const ApprovedStackSnapshot = z.object({
  packageId: z.enum(['LEAN', 'BALANCED', 'SCALE_READY']),
  packageName: z.string().min(1),
  frontend: z.string().min(1),
  backend: z.string().min(1),
  database: z.string().min(1),
  mobile: z.string().min(1),
  hosting: z.string().min(1),
  estimatedMonthlyCost: z.string().min(1),
  validationSummary: z.array(z.string().min(1)).min(1),
  truthStatus: z.literal('HUMAN_APPROVED'),
}).strict();

export const ArchitectureOption = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  recommended: z.boolean().default(false),
  deploymentModel: z.string().min(1).default('UNKNOWN'),
  components: z.array(z.object({ name: z.string().min(1), responsibility: z.string().min(1) }).strict()).min(2).default([
    { name: 'Application', responsibility: 'Implements the approved product workflow.' },
    { name: 'Data store', responsibility: 'Persists product state and audit history.' },
  ]),
  dataFlows: z.array(z.string().min(1)).min(1).default(['Request enters the application, is validated, processed, and persisted.']),
  technologies: z.array(z.string().min(1)).min(1).default(['Technology selection requires review']),
  why: z.array(z.string().min(1)).min(1),
  whyNot: z.array(z.string().min(1)).min(1),
  assumptions: z.array(z.string().min(1)).min(1).default(['Workload and team constraints require validation.']),
  failureModes: z.array(z.object({ failure: z.string().min(1), mitigation: z.string().min(1) }).strict()).min(2).default([
    { failure: 'A dependency becomes unavailable.', mitigation: 'Use bounded retries, timeouts, and an explicit degraded state.' },
    { failure: 'Load exceeds the approved assumption.', mitigation: 'Measure saturation and scale the constrained component.' },
  ]),
  reconsiderationTriggers: z.array(z.object({ metric: z.string().min(1), condition: z.string().min(1) }).strict()).min(1).default([
    { metric: 'Operational load', condition: 'Reconsider when measured load exceeds the approved operating assumption.' },
  ]),
  estimatedCost: z.object({ range: z.string().min(1), basis: z.string().min(1), truthStatus: z.literal('AI_SUGGESTED') }).strict().default({ range: 'UNKNOWN', basis: 'Requires workload and provider inputs.', truthStatus: 'AI_SUGGESTED' }),
  scoreBreakdown: z.record(z.string(), z.number().int().min(0).max(5)).default({}),
  risks: z.array(z.string().min(1)).min(1),
  truthStatus: z.literal('AI_SUGGESTED'),
}).strict();

export const ProjectKnowledge = z.object({
  projectId: z.string().min(1),
  graphVersion: z.number().int().positive(),
  summary: z.string().min(1),
  entities: z.array(KnowledgeEntity),
  gaps: z.array(ProjectGap).default([]),
  clarificationQuestions: z.array(ClarificationQuestion).max(5).default([]),
  readiness: ProjectReadiness.optional(),
  techStack: z.array(TechStackRecommendation).max(7).default([]),
  architectureOptions: z.array(ArchitectureOption).length(3),
  analyzedAt: z.iso.datetime(),
  analyzer: z.enum(['axiom-deterministic-grounded-v1', 'axiom-deterministic-grounded-v2']),
}).strict().superRefine((value, context) => {
  if (value.analyzer !== 'axiom-deterministic-grounded-v2') return;
  if (value.gaps.length < 5) context.addIssue({ code: 'too_small', origin: 'array', minimum: 5, inclusive: true, path: ['gaps'], message: 'V2 project intelligence requires at least five gaps' });
  if (value.clarificationQuestions.length < 3) context.addIssue({ code: 'too_small', origin: 'array', minimum: 3, inclusive: true, path: ['clarificationQuestions'], message: 'V2 project intelligence requires at least three clarification questions' });
  if (value.techStack.length !== 7) context.addIssue({ code: 'custom', path: ['techStack'], message: 'V2 project intelligence requires seven technology-layer recommendations' });
  if (!value.readiness) context.addIssue({ code: 'custom', path: ['readiness'], message: 'V2 project intelligence requires deterministic readiness' });
});

export const ArbDecision = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  optionId: z.string().min(1),
  optionName: z.string().min(1),
  rationale: z.array(z.string().min(1)).min(1),
  rejectedOptionIds: z.array(z.string().min(1)).min(1),
  risks: z.array(z.string().min(1)).min(1),
  architectureBriefId: z.string().min(1).optional(),
  stack: ApprovedStackSnapshot.optional(),
  graphVersion: z.number().int().positive(),
  version: z.number().int().positive(),
  truthStatus: z.literal('HUMAN_APPROVED'),
  approvedAt: z.iso.datetime(),
}).strict();

export const ProjectDocument = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  type: ProjectDocumentType,
  version: z.number().int().positive(),
  sourceGraphVersion: z.number().int().positive(),
  title: z.string().min(1),
  content: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  truthStatus: z.enum(['AI_SUGGESTED', 'HUMAN_APPROVED']),
  generatedAt: z.iso.datetime(),
  parentVersion: z.number().int().positive().optional(),
  revisedSection: z.string().min(1).max(180).optional(),
  revisionInstruction: z.string().min(1).max(2_000).optional(),
  revisionProvider: z.enum(['axiom-fixture', 'openai-responses']).optional(),
}).strict();

export const DocumentApproval = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  graphVersion: z.number().int().positive(),
  documentHashes: z.record(z.string(), z.string()),
  truthStatus: z.literal('HUMAN_APPROVED'),
  approvedAt: z.iso.datetime(),
}).strict();

export const NotionPublication = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  projectPageId: z.string().min(1),
  projectPageUrl: z.url(),
  sourceGraphVersion: z.number().int().positive(),
  documentPageIds: z.record(z.string(), z.string()),
  documentHashes: z.record(z.string(), z.string()),
  rendererVersion: z.enum(['markdown-v1', 'svg-v2']).default('markdown-v1'),
  publishedAt: z.iso.datetime(),
}).strict();

export const JiraBacklogStory = z.object({
  localId: z.string().min(1),
  summary: z.string().min(1).max(255),
  description: z.string().min(1),
  acceptanceCriteria: z.array(z.string().min(1)).min(2),
  sourceEntityIds: z.array(z.string().min(1)),
  priority: z.enum(['P0', 'P1']),
  truthStatus: z.literal('AI_SUGGESTED'),
}).strict();

export const JiraBacklogPlan = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  sourceGraphVersion: z.number().int().positive(),
  documentApprovalId: z.string().min(1),
  arbDecisionId: z.string().min(1),
  epic: z.object({
    summary: z.string().min(1).max(255),
    description: z.string().min(1),
    sourceEntityIds: z.array(z.string().min(1)),
    truthStatus: z.literal('AI_SUGGESTED'),
  }).strict(),
  stories: z.array(JiraBacklogStory).min(1).max(20),
  truthStatus: z.literal('AI_SUGGESTED'),
  generatedAt: z.iso.datetime(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export const JiraPublication = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  sourceGraphVersion: z.number().int().positive(),
  planId: z.string().min(1),
  planHash: z.string().regex(/^[a-f0-9]{64}$/),
  projectKey: z.string().min(1),
  epicKey: z.string().min(1),
  epicUrl: z.url(),
  stories: z.array(z.object({
    localId: z.string().min(1),
    key: z.string().min(1),
    url: z.url(),
  }).strict()).min(1),
  createdAt: z.iso.datetime(),
}).strict();

export const WireframeNode = z.object({
  id: z.string().min(1),
  kind: z.enum(['rectangle', 'text', 'arrow']),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  text: z.string().min(1).optional(),
  fontSize: z.number().int().min(10).max(48).optional(),
  backgroundColor: z.string().min(1).optional(),
  strokeColor: z.string().min(1).optional(),
  truthStatus: z.enum(['SOURCE_GROUNDED', 'AI_SUGGESTED', 'UNKNOWN']),
  sourceEntityIds: z.array(z.string().min(1)),
}).strict().refine((node) => node.kind !== 'text' || Boolean(node.text), { message: 'Text nodes require text' });

export const WireframeScreen = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  purpose: z.string().min(1),
  truthStatus: z.literal('AI_SUGGESTED'),
  sourceEntityIds: z.array(z.string().min(1)),
  unresolvedGapIds: z.array(z.string().min(1)).default([]),
  requiredStates: z.array(z.enum(['DEFAULT', 'LOADING', 'EMPTY', 'VALIDATION_ERROR', 'FAILURE'])).min(1).default(['DEFAULT', 'LOADING', 'EMPTY', 'VALIDATION_ERROR', 'FAILURE']),
  nodes: z.array(WireframeNode).min(1),
}).strict();

export const WireframeHandoff = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  version: z.literal(1),
  templateId: WireframeTemplateId.default('regulated-workflow'),
  templateName: z.string().min(1).default('Regulated workflow'),
  sourceGraphVersion: z.number().int().positive(),
  arbDecisionId: z.string().min(1).optional(),
  documentApprovalId: z.string().min(1).optional(),
  hldDocumentId: z.string().min(1),
  truthStatus: z.literal('AI_SUGGESTED'),
  reviewStatus: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'SUPERSEDED']).default('DRAFT'),
  screens: z.array(WireframeScreen).min(4).max(6),
  flows: z.array(z.object({
    id: z.string().min(1),
    fromScreenId: z.string().min(1),
    toScreenId: z.string().min(1),
    label: z.string().min(1),
    truthStatus: z.literal('AI_SUGGESTED'),
  }).strict()).default([]),
  coverage: z.object({
    totalEntityCount: z.number().int().nonnegative(),
    coveredEntityCount: z.number().int().nonnegative(),
    uncoveredEntityIds: z.array(z.string().min(1)),
  }).strict().default({ totalEntityCount: 0, coveredEntityCount: 0, uncoveredEntityIds: [] }),
  groundedStatements: z.array(z.object({
    entityId: z.string().min(1),
    category: KnowledgeCategory,
    text: z.string().min(1),
    sourceId: z.string().min(1),
  }).strict()),
  assumptions: z.array(z.string().min(1)).min(1),
  openQuestions: z.array(z.string().min(1)).min(1),
  gaps: z.array(ProjectGap).default([]),
  generatedAt: z.iso.datetime(),
  generator: z.enum(['axiom-deterministic-wireframe-v1', 'axiom-deterministic-wireframe-v2']),
}).strict().refine((value) => Boolean(value.arbDecisionId || value.documentApprovalId), {
  message: 'Wireframe handoff requires an approved architecture or approved document baseline',
});

export const WireframeRevision = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  screenId: z.string().min(1),
  templateId: WireframeTemplateId,
  sourceGraphVersion: z.number().int().positive(),
  revision: z.number().int().positive(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED']),
  elements: z.array(z.record(z.string(), z.unknown())).max(2_000),
  createdAt: z.iso.datetime(),
}).strict();

export const ProjectDatabase = z.object({
  version: z.literal(1),
  workspaces: z.array(Workspace),
  projects: z.array(Project),
  sources: z.array(ProjectSource),
  knowledge: z.array(ProjectKnowledge),
  architectureBriefs: z.array(ArchitectureBrief).default([]),
  arbDecisions: z.array(ArbDecision),
  documents: z.array(ProjectDocument),
  documentApprovals: z.array(DocumentApproval).default([]),
  notionPublications: z.array(NotionPublication),
  jiraPublications: z.array(JiraPublication).default([]),
  wireframeRevisions: z.array(WireframeRevision).default([]),
}).strict();

export const CreateProjectRequest = z.object({
  workspaceId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(160),
}).strict();

export const ReviseDocumentRequest = z.object({
  section: z.string().trim().min(1).max(180),
  instruction: z.string().trim().min(3).max(MAX_GUIDED_TEXT_CHARACTERS, GUIDED_TEXT_LIMIT_MESSAGE),
}).strict();

export type Workspace = z.infer<typeof Workspace>;
export type Project = z.infer<typeof Project>;
export type ProjectSource = z.infer<typeof ProjectSource>;
export type KnowledgeEntity = z.infer<typeof KnowledgeEntity>;
export type ProjectGap = z.infer<typeof ProjectGap>;
export type ClarificationQuestion = z.infer<typeof ClarificationQuestion>;
export type ProjectReadiness = z.infer<typeof ProjectReadiness>;
export type TechStackRecommendation = z.infer<typeof TechStackRecommendation>;
export type ArchitecturePlanningInput = z.infer<typeof ArchitecturePlanningInput>;
export type ArchitectureBrief = z.infer<typeof ArchitectureBrief>;
export type ApprovedStackSnapshot = z.infer<typeof ApprovedStackSnapshot>;
export type ArchitectureOption = z.infer<typeof ArchitectureOption>;
export type ProjectKnowledge = z.infer<typeof ProjectKnowledge>;
export type ArbDecision = z.infer<typeof ArbDecision>;
export type ProjectDocument = z.infer<typeof ProjectDocument>;
export type DocumentApproval = z.infer<typeof DocumentApproval>;
export type NotionPublication = z.infer<typeof NotionPublication>;
export type JiraBacklogStory = z.infer<typeof JiraBacklogStory>;
export type JiraBacklogPlan = z.infer<typeof JiraBacklogPlan>;
export type JiraPublication = z.infer<typeof JiraPublication>;
export type WireframeScreen = z.infer<typeof WireframeScreen>;
export type WireframeNode = z.infer<typeof WireframeNode>;
export type WireframeHandoff = z.infer<typeof WireframeHandoff>;
export type WireframeRevision = z.infer<typeof WireframeRevision>;
export type WireframeTemplateId = z.infer<typeof WireframeTemplateId>;
export type ProjectDatabase = z.infer<typeof ProjectDatabase>;
