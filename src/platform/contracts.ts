import { z } from 'zod';

export const OrganizationIdSchema = z.string().regex(/^ORG-[A-Za-z0-9_-]{1,124}$/);

export const PlatformOrganizationSchema = z.object({
  id: OrganizationIdSchema,
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  status: z.literal('ACTIVE'),
  role: z.enum(['OWNER', 'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT', 'DEVELOPER', 'REVIEWER', 'VIEWER']),
}).strict();

export const CurrentUserOrganizationsSchema = z.object({
  organizations: z.array(PlatformOrganizationSchema).max(100),
});

export type PlatformOrganization = z.infer<typeof PlatformOrganizationSchema>;

export const PlatformProjectIdSchema = z.string().regex(/^PROJ-[A-Za-z0-9_-]{1,123}$/);
export const PlatformWorkspaceIdSchema = z.string().regex(/^WS-[A-Za-z0-9_-]{1,125}$/);

export const PlatformProjectSchema = z.object({
  id: PlatformProjectIdSchema,
  workspaceId: PlatformWorkspaceIdSchema,
  name: z.string().min(1).max(160),
  status: z.enum([
    'DRAFT',
    'SOURCES_READY',
    'ANALYZED',
    'NEEDS_CLARIFICATION',
    'DOCUMENTED',
    'DOCUMENTS_APPROVED',
    'DESIGN_READY',
    'ARB_APPROVED',
    'HLD_READY',
    'PUBLISHED',
    'BACKLOG_READY',
    'ARCHIVED',
  ]),
  graphVersion: z.number().int().nonnegative(),
  rowVersion: z.number().int().positive(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();

export const PlatformProjectListSchema = z.object({
  projects: z.array(PlatformProjectSchema).max(100),
  nextCursor: z.string().min(1).max(512).nullable(),
}).strict();

export const PlatformProjectListQuerySchema = z.object({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  workspaceId: PlatformWorkspaceIdSchema.optional(),
}).strict();

export type PlatformProject = z.infer<typeof PlatformProjectSchema>;

export const PlatformCreateProjectRequestSchema = z.object({
  workspaceId: PlatformWorkspaceIdSchema,
  name: z.string().trim().min(2).max(160),
}).strict();

export const PlatformIdempotencyKeySchema = z.string().regex(/^[A-Za-z0-9._:-]{8,128}$/);
export const PlatformProjectEtagSchema = z.string().regex(/^"PROJ-[A-Za-z0-9_-]{1,123}:[1-9][0-9]*"$/);

export const PlatformWorkspaceSchema = z.object({
  id: PlatformWorkspaceIdSchema,
  name: z.string().min(1).max(120),
  rowVersion: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();

export const PlatformWorkspaceListSchema = z.object({
  workspaces: z.array(PlatformWorkspaceSchema).max(100),
  nextCursor: z.string().min(1).max(512).nullable(),
}).strict();

export type PlatformWorkspace = z.infer<typeof PlatformWorkspaceSchema>;

export const PlatformMemberSchema = z.object({
  userId: z.string().regex(/^USER-[A-Za-z0-9_-]{1,123}$/),
  email: z.email().max(320),
  displayName: z.string().min(1).max(200),
  role: PlatformOrganizationSchema.shape.role,
  status: z.enum(['ACTIVE', 'REVOKED']),
  rowVersion: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();

export const PlatformInvitationIdSchema = z.string().regex(/^INV-[A-Za-z0-9_-]{1,124}$/);
export const PlatformInvitationRoleSchema = z.enum([
  'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT', 'DEVELOPER', 'REVIEWER', 'VIEWER',
]);
export const PlatformInvitationSchema = z.object({
  id: PlatformInvitationIdSchema,
  email: z.email().max(320),
  role: PlatformInvitationRoleSchema,
  status: z.enum(['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED']),
  expiresAt: z.iso.datetime(),
  rowVersion: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).strict();
export const PlatformMemberListSchema = z.object({
  members: z.array(PlatformMemberSchema).max(100),
  nextCursor: z.string().min(1).max(512).nullable(),
}).strict();
export const PlatformInvitationListSchema = z.object({
  invitations: z.array(PlatformInvitationSchema).max(100),
  nextCursor: z.string().min(1).max(512).nullable(),
}).strict();
export const PlatformGovernanceListQuerySchema = z.object({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();
export const PlatformCreateInvitationRequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(320)),
  role: PlatformInvitationRoleSchema,
}).strict();
export const PlatformInvitationTokenSchema = z.string().regex(/^INV-[A-Za-z0-9_-]{1,124}\.[A-Za-z0-9_-]{43}$/);
export const PlatformCreateInvitationResponseSchema = z.object({
  invitation: PlatformInvitationSchema,
  delivery: z.object({ mode: z.literal('MANUAL_LOCAL'), acceptanceToken: PlatformInvitationTokenSchema }).strict(),
  replayed: z.boolean(),
}).strict();
export const PlatformInvitationEtagSchema = z.string().regex(/^"INV-[A-Za-z0-9_-]{1,124}:[1-9][0-9]*"$/);

export type PlatformMember = z.infer<typeof PlatformMemberSchema>;
export type PlatformInvitation = z.infer<typeof PlatformInvitationSchema>;
export type PlatformInvitationRole = z.infer<typeof PlatformInvitationRoleSchema>;

export const PlatformWorkItemIdSchema = z.string().regex(/^WI-[A-Za-z0-9_-]{1,125}$/);
export const PlatformWorkItemGenerationIdSchema = z.string().regex(/^WIGEN-[A-Za-z0-9_-]{1,123}$/);
export const PlatformWorkItemReviewEtagSchema = z.string().regex(/^"WIGEN-[A-Za-z0-9_-]{1,123}:[a-f0-9]{64}"$/);
export const PlatformSourceEntityIdSchema = z.string().regex(/^[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]{1,120}$/);
export const PlatformWorkItemGenerationBlockerSchema = z.object({
  gapId: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(2_000),
  severity: z.string().min(1).max(100),
  truthStatus: z.literal('UNKNOWN'),
  clarification: z.object({
    id: z.string().min(1).max(200),
    question: z.string().min(1).max(1_000),
    whyItMatters: z.string().min(1).max(1_000),
    affectedEntityIds: z.array(PlatformSourceEntityIdSchema).max(100),
  }).strict().nullable(),
}).strict();
export const PlatformWorkItemGenerationBlockedResponseSchema = z.object({
  error: z.object({
    code: z.literal('CLARIFICATION_REQUIRED'),
    message: z.string().min(1),
    requestId: z.string().min(1),
    retryable: z.literal(false),
    details: z.object({ blockers: z.array(PlatformWorkItemGenerationBlockerSchema).min(1).max(100) }).strict(),
  }).strict(),
}).strict();
export type PlatformWorkItemGenerationBlocker = z.infer<typeof PlatformWorkItemGenerationBlockerSchema>;
export const PlatformClarificationQuestionIdSchema = z.string().regex(/^(?:CQ|QUESTION)-[A-Za-z0-9_-]{1,120}$/);
export const PlatformAnswerClarificationRequestSchema = z.object({ answer: z.string().trim().min(1).max(2_000) }).strict();
export const PlatformReadinessCategoryKeySchema = z.enum(['FUNCTIONAL_SCOPE', 'NFR', 'DATA', 'INTEGRATION', 'FAILURE_HANDLING', 'SECURITY_PRIVACY', 'TESTABILITY', 'DELIVERY']);
export const PlatformProjectReadinessSchema = z.object({
  score: z.number().int().min(0).max(100),
  rawScore: z.number().int().min(0).max(100),
  categories: z.array(z.object({
    key: PlatformReadinessCategoryKeySchema,
    label: z.string().min(1),
    score: z.number().int().nonnegative(),
    maximum: z.number().int().positive(),
    explanation: z.string().min(1),
    openGapIds: z.array(z.string().min(1)),
  }).strict()).length(8),
  openBlockerIds: z.array(z.string().min(1)),
  caps: z.array(z.string().min(1)),
  calculatedAt: z.iso.datetime(),
}).strict();
export const PlatformProjectReadinessResponseSchema = z.object({
  projectId: PlatformProjectIdSchema,
  graphVersion: z.number().int().nonnegative(),
  readiness: PlatformProjectReadinessSchema.nullable(),
}).strict();
export type PlatformProjectReadiness = z.infer<typeof PlatformProjectReadinessSchema>;
export const PlatformClarificationAnswerResponseSchema = z.object({
  project: PlatformProjectSchema,
  clarification: z.object({
    id: PlatformClarificationQuestionIdSchema,
    gapId: z.string().min(1).max(200),
    status: z.literal('ANSWERED'),
    truthStatus: z.literal('HUMAN_CONFIRMED'),
    answeredAt: z.iso.datetime(),
  }).strict(),
  previousGraphVersion: z.number().int().positive(),
  graphVersion: z.number().int().positive(),
  readiness: PlatformProjectReadinessSchema,
  replayed: z.boolean(),
}).strict();
const PlatformAcceptanceCriterionSchema = z.object({
  id: z.string().regex(/^AC-[A-Za-z0-9_-]{1,125}$/),
  statement: z.string().min(15).max(1_000),
  verificationKind: z.enum(['AUTOMATED_TEST', 'INTEGRATION_TEST', 'CONTRACT_TEST', 'MANUAL_REVIEW', 'METRIC']),
  verificationMethod: z.string().min(10).max(1_000),
  sourceEntityIds: z.array(PlatformSourceEntityIdSchema).min(1).max(20),
}).strict();
export const PlatformWorkItemSchema = z.object({
  id: PlatformWorkItemIdSchema,
  version: z.number().int().positive(),
  type: z.enum(['INITIATIVE', 'EPIC', 'STORY', 'TASK', 'DEFECT']),
  parentId: PlatformWorkItemIdSchema.nullable(),
  title: z.string().min(8).max(180),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  estimate: z.enum(['XS', 'S', 'M', 'L', 'XL', 'UNKNOWN']),
  outcome: z.string().min(20).max(2_000),
  context: z.string().min(20).max(4_000),
  scope: z.array(z.string().min(8).max(1_000)).min(1).max(30),
  outOfScope: z.array(z.string().min(8).max(1_000)).max(30),
  acceptanceCriteria: z.array(PlatformAcceptanceCriterionSchema).max(30),
  dependencyIds: z.array(PlatformWorkItemIdSchema).max(30),
  risks: z.array(z.object({ description: z.string().min(10).max(500), impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']), mitigation: z.string().min(10).max(500) }).strict()).max(20),
  openQuestions: z.array(z.object({ id: z.string().regex(/^QUESTION-[A-Za-z0-9_-]{1,120}$/), question: z.string().min(10).max(500), whyItMatters: z.string().min(10).max(500), blocking: z.boolean(), affectedSourceEntityIds: z.array(PlatformSourceEntityIdSchema).max(20) }).strict()).max(20),
  evidenceExpectations: z.array(z.string().min(10).max(1_000)).max(20),
  sourceEntityIds: z.array(PlatformSourceEntityIdSchema).min(1).max(50),
  userStory: z.object({ persona: z.string().min(2).max(200), capability: z.string().min(10).max(500), benefit: z.string().min(10).max(500) }).strict().optional(),
  defect: z.object({ observedBehavior: z.string().min(10).max(1_000), expectedBehavior: z.string().min(10).max(1_000), reproductionSteps: z.array(z.string().min(5).max(500)).min(1).max(20) }).strict().optional(),
  truthStatus: z.literal('AI_SUGGESTED'),
  reviewStatus: z.literal('DRAFT'),
}).strict();
const PlatformTicketQualityFindingSchema = z.object({
  code: z.string().min(1), severity: z.enum(['BLOCKER', 'ERROR', 'WARNING']), message: z.string().min(1),
  workItemId: PlatformWorkItemIdSchema.optional(), path: z.string().min(1).optional(), relatedIds: z.array(z.string().min(1)).optional(),
}).strict();
export const PlatformTicketQualityReportSchema = z.object({
  evaluatorVersion: z.literal('ticket-quality-v1'), passed: z.boolean(), clarificationRequired: z.boolean(),
  findings: z.array(PlatformTicketQualityFindingSchema),
  metrics: z.object({ schemaValid: z.boolean(), workItemCount: z.number().int().nonnegative(), implementableWorkItemCount: z.number().int().nonnegative(), requiredFieldCompleteness: z.number().min(0).max(1), validSourceReferenceRate: z.number().min(0).max(1), approvedRequirementCoverage: z.number().min(0).max(1), duplicatePairCount: z.number().int().nonnegative(), blockingQuestionCount: z.number().int().nonnegative() }).strict(),
}).strict();
export const PlatformWorkItemGenerationPreviewSchema = z.object({
  id: PlatformWorkItemGenerationIdSchema,
  projectId: PlatformProjectIdSchema,
  sourceGraphVersion: z.number().int().positive(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED']),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  generationContentHash: z.string().regex(/^[a-f0-9]{64}$/),
  schemaVersion: z.literal('work-item-v1'),
  evaluatorVersion: z.literal('ticket-quality-v1'),
  promptVersion: z.literal('fixture-grounded-agile-v1'),
  workflowVersion: z.literal('ticket-workflow-v1'),
  provenance: z.object({
    runId: z.string().regex(/^ARUN-[A-Za-z0-9_-]{1,123}$/),
    modelCallId: z.string().regex(/^MCALL-[A-Za-z0-9_-]{1,122}$/),
    tier: z.enum(['ECONOMY', 'BALANCED', 'BEST']),
    provider: z.enum(['LOCAL_FIXTURE', 'OPENAI', 'GROQ']),
    modelDefinitionId: z.string().regex(/^MODEL-[A-Za-z0-9_-]{1,122}$/),
    immutableModelId: z.string().min(1).max(300),
    promptVersion: z.string().min(1).max(100),
    workflowVersion: z.string().min(1).max(100),
    policyId: z.string().regex(/^MPOL-[A-Za-z0-9_-]{1,122}$/),
    policyVersion: z.number().int().positive(),
    budget: z.union([
      z.object({ status: z.literal('NOT_APPLICABLE'), reason: z.literal('NON_BILLABLE_LOCAL_FIXTURE') }).strict(),
      z.object({ status: z.literal('RESERVED'), reservationId: z.string().regex(/^URES-[A-Za-z0-9_-]{1,123}$/) }).strict(),
    ]),
    usage: z.union([
      z.object({ evidenceStatus: z.literal('NOT_APPLICABLE'), reason: z.literal('NON_BILLABLE_LOCAL_FIXTURE') }).strict(),
      z.object({ evidenceStatus: z.literal('MEASURED'), measurementSource: z.literal('PROVIDER_RESPONSE'), inputTokens: z.number().int().nonnegative(), cachedInputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative(), totalTokens: z.number().int().nonnegative() }).strict(),
    ]),
    attemptCount: z.number().int().min(1).max(3),
    fallbackUsed: z.boolean(),
    latencyMs: z.number().int().nonnegative(),
    completedAt: z.iso.datetime(),
  }).strict().nullable(),
  qualityReport: PlatformTicketQualityReportSchema,
  workItems: z.array(PlatformWorkItemSchema).min(1).max(200),
  generatedAt: z.iso.datetime(),
  review: z.object({
    id: z.string().regex(/^WIREVIEW-[A-Za-z0-9_-]{1,120}$/),
    generationId: PlatformWorkItemGenerationIdSchema,
    decision: z.enum(['ACCEPT', 'ACCEPT_WITH_EDITS', 'REJECT']),
    reasonCategory: z.enum(['MEETS_REQUIREMENTS', 'SCOPE_ADJUSTMENT', 'TECHNICAL_CORRECTION', 'PRIORITY_OR_ESTIMATE', 'MISSING_REQUIREMENT', 'UNGROUNDED', 'UNTESTABLE', 'DUPLICATE_OR_OVERLAP', 'DEPENDENCY_ERROR', 'CRITICAL_UNKNOWN', 'OTHER']),
    comment: z.string().min(10).max(2_000),
    generationContentHash: z.string().regex(/^[a-f0-9]{64}$/),
    reviewedContentHash: z.string().regex(/^[a-f0-9]{64}$/),
    reviewedByUserId: z.string().regex(/^USER-[A-Za-z0-9_-]{1,123}$/),
    reviewedAt: z.iso.datetime(),
  }).strict().nullable(),
  replayed: z.boolean(),
}).strict();
export const PlatformGenerateWorkItemsRequestSchema = z.object({ sourceGraphVersion: z.number().int().positive(), tier: z.enum(['ECONOMY', 'BALANCED', 'BEST']) }).strict();
const PlatformWorkItemEditSchema = z.object({
  workItemId: PlatformWorkItemIdSchema,
  expectedVersion: z.number().int().positive(),
  title: z.string().trim().min(8).max(180).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  estimate: z.enum(['XS', 'S', 'M', 'L', 'XL', 'UNKNOWN']).optional(),
  outcome: z.string().trim().min(20).max(2_000).optional(),
  context: z.string().trim().min(20).max(4_000).optional(),
  scope: z.array(z.string().trim().min(8).max(1_000)).min(1).max(30).optional(),
  outOfScope: z.array(z.string().trim().min(8).max(1_000)).max(30).optional(),
}).strict().refine((value) => Object.keys(value).some((key) => !['workItemId', 'expectedVersion'].includes(key)));
export const PlatformSubmitWorkItemReviewRequestSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('ACCEPT'), reasonCategory: z.literal('MEETS_REQUIREMENTS'), comment: z.string().trim().min(10).max(2_000) }).strict(),
  z.object({ decision: z.literal('ACCEPT_WITH_EDITS'), reasonCategory: z.enum(['SCOPE_ADJUSTMENT', 'TECHNICAL_CORRECTION', 'PRIORITY_OR_ESTIMATE', 'OTHER']), comment: z.string().trim().min(10).max(2_000), edits: z.array(PlatformWorkItemEditSchema).min(1).max(200).refine((edits) => new Set(edits.map((edit) => edit.workItemId)).size === edits.length) }).strict(),
  z.object({ decision: z.literal('REJECT'), reasonCategory: z.enum(['MISSING_REQUIREMENT', 'UNGROUNDED', 'UNTESTABLE', 'DUPLICATE_OR_OVERLAP', 'DEPENDENCY_ERROR', 'CRITICAL_UNKNOWN', 'OTHER']), comment: z.string().trim().min(10).max(2_000) }).strict(),
]);

export type PlatformWorkItem = z.infer<typeof PlatformWorkItemSchema>;
export type PlatformWorkItemGenerationPreview = z.infer<typeof PlatformWorkItemGenerationPreviewSchema>;

export const PlatformModelProviderCodeSchema = z.enum(['LOCAL_FIXTURE', 'OPENAI', 'GROQ']);
export const PlatformModelProviderIdSchema = z.string().regex(/^MPROV-[A-Za-z0-9_-]{1,121}$/);
export const PlatformModelDefinitionIdSchema = z.string().regex(/^MODEL-[A-Za-z0-9_-]{1,122}$/);
const PlatformModelLifecycleSchema = z.enum(['LOCAL_ONLY', 'CANDIDATE', 'QUALIFIED', 'SUSPENDED', 'RETIRED']);
const PlatformModelExecutionStatusSchema = z.enum(['ENABLED', 'DISABLED']);
const PlatformModelDataPolicyStatusSchema = z.enum(['NO_EXTERNAL_TRANSFER', 'REQUIRES_REVIEW', 'APPROVED']);
export const PlatformModelProviderSchema = z.object({
  id: PlatformModelProviderIdSchema,
  code: PlatformModelProviderCodeSchema,
  displayName: z.string().min(1).max(200),
  lifecycleStatus: PlatformModelLifecycleSchema,
  executionStatus: PlatformModelExecutionStatusSchema,
  dataPolicyStatus: PlatformModelDataPolicyStatusSchema,
  allowedRegions: z.array(z.string().min(1).max(100)).max(50),
  updatedAt: z.iso.datetime(),
}).strict().superRefine((provider, context) => {
  if (provider.executionStatus === 'ENABLED' && !['LOCAL_ONLY', 'QUALIFIED'].includes(provider.lifecycleStatus)) {
    context.addIssue({ code: 'custom', message: 'Only local or qualified providers can be enabled', path: ['executionStatus'] });
  }
});
export const PlatformModelDefinitionSchema = z.object({
  id: PlatformModelDefinitionIdSchema,
  providerId: PlatformModelProviderIdSchema,
  immutableModelId: z.string().min(1).max(300),
  displayName: z.string().min(1).max(200),
  lifecycleStatus: PlatformModelLifecycleSchema,
  executionStatus: PlatformModelExecutionStatusSchema,
  capabilities: z.object({ structuredOutput: z.boolean(), tools: z.boolean(), vision: z.boolean() }).strict(),
  contextWindowTokens: z.number().int().positive().nullable(),
  maxOutputTokens: z.number().int().positive().nullable(),
  pricing: z.discriminatedUnion('status', [
    z.object({ status: z.literal('NOT_APPLICABLE') }).strict(),
    z.object({ status: z.literal('UNVERIFIED') }).strict(),
    z.object({
      status: z.literal('VERIFIED'),
      currency: z.string().regex(/^[A-Z]{3}$/),
      inputMicrosPerMillionTokens: z.number().int().nonnegative(),
      cachedInputMicrosPerMillionTokens: z.number().int().nonnegative().nullable(),
      outputMicrosPerMillionTokens: z.number().int().nonnegative(),
      verifiedAt: z.iso.datetime(),
    }).strict(),
  ]),
  dataPolicyStatus: PlatformModelDataPolicyStatusSchema,
  allowedRegions: z.array(z.string().min(1).max(100)).max(50),
  evaluation: z.object({
    status: z.enum(['LOCAL_FIXTURE_ONLY', 'NOT_EVALUATED', 'QUALIFIED', 'FAILED']),
    scores: z.record(z.string().min(1).max(100), z.number().min(0).max(1)),
    evaluationRunId: z.string().min(1).max(200).nullable(),
    evaluatedAt: z.iso.datetime().nullable(),
  }).strict(),
  updatedAt: z.iso.datetime(),
}).strict().superRefine((model, context) => {
  if (model.executionStatus === 'ENABLED' && !['LOCAL_ONLY', 'QUALIFIED'].includes(model.lifecycleStatus)) {
    context.addIssue({ code: 'custom', message: 'Only local or qualified models can be enabled', path: ['executionStatus'] });
  }
  if (model.executionStatus === 'ENABLED' && model.lifecycleStatus === 'QUALIFIED') {
    if (model.evaluation.status !== 'QUALIFIED') context.addIssue({ code: 'custom', message: 'Enabled hosted models require qualification evidence', path: ['evaluation', 'status'] });
    if (model.pricing.status !== 'VERIFIED') context.addIssue({ code: 'custom', message: 'Enabled hosted models require verified pricing', path: ['pricing', 'status'] });
    if (model.dataPolicyStatus !== 'APPROVED') context.addIssue({ code: 'custom', message: 'Enabled hosted models require an approved data policy', path: ['dataPolicyStatus'] });
    if (model.allowedRegions.length === 0) context.addIssue({ code: 'custom', message: 'Enabled hosted models require an approved region', path: ['allowedRegions'] });
  }
});
export const PlatformModelPolicySchema = z.object({
  id: z.string().regex(/^MPOL-[A-Za-z0-9_-]{1,122}$/),
  organizationId: OrganizationIdSchema,
  economyModelDefinitionId: PlatformModelDefinitionIdSchema,
  balancedModelDefinitionId: PlatformModelDefinitionIdSchema,
  bestModelDefinitionId: PlatformModelDefinitionIdSchema,
  rowVersion: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
}).strict();
export const PlatformModelCatalogSchema = z.object({
  providers: z.array(PlatformModelProviderSchema).max(50),
  models: z.array(PlatformModelDefinitionSchema).max(500),
  policy: PlatformModelPolicySchema,
}).strict().superRefine((catalog, context) => {
  const modelById = new Map(catalog.models.map((model) => [model.id, model]));
  for (const [field, modelId] of [
    ['economyModelDefinitionId', catalog.policy.economyModelDefinitionId],
    ['balancedModelDefinitionId', catalog.policy.balancedModelDefinitionId],
    ['bestModelDefinitionId', catalog.policy.bestModelDefinitionId],
  ] as const) {
    if (modelById.get(modelId)?.executionStatus !== 'ENABLED') {
      context.addIssue({ code: 'custom', message: 'Policy tiers must resolve to enabled model definitions', path: ['policy', field] });
    }
  }
});
export type PlatformModelCatalog = z.infer<typeof PlatformModelCatalogSchema>;
export type PlatformModelDefinition = z.infer<typeof PlatformModelDefinitionSchema>;


export const PlatformProductCreditUnitsSchema = z.number().int().min(0).max(2_000_000_000);
export const PlatformUsageReservationIdSchema = z.string().regex(/^URES-[A-Za-z0-9_-]{1,123}$/);
export const PlatformBudgetPolicyIdSchema = z.string().regex(/^BPOL-[A-Za-z0-9_-]{1,123}$/);
export const PlatformBudgetPolicyEtagSchema = z.string().regex(/^"BPOL-[A-Za-z0-9_-]{1,123}:[1-9][0-9]*"$/);
export const PlatformUsageLedgerEntrySchema = z.object({
  id: z.string().regex(/^ULED-[A-Za-z0-9_-]{1,123}$/),
  reservationId: PlatformUsageReservationIdSchema,
  eventType: z.enum(['RESERVATION', 'RECONCILIATION', 'EXPIRATION']),
  reservedCreditUnits: PlatformProductCreditUnitsSchema,
  chargedCreditUnits: PlatformProductCreditUnitsSchema,
  releasedCreditUnits: PlatformProductCreditUnitsSchema,
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  toolChargeMicros: z.number().int().nonnegative(),
  providerCostMicros: z.number().int().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  outcome: z.enum(['SUCCEEDED', 'FAILED', 'CANCELLED', 'CACHED']).nullable(),
  retryCount: z.number().int().nonnegative(),
  fallbackUsed: z.boolean(),
  cacheHit: z.boolean(),
  projectId: PlatformProjectIdSchema.nullable(),
  userId: z.string().regex(/^USER-[A-Za-z0-9_-]{1,123}$/),
  workflow: z.string().min(1),
  workflowVersion: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  generationId: z.string().nullable(),
  runId: z.string().min(1),
  occurredAt: z.iso.datetime(),
}).strict();
export const PlatformUpdateBudgetPolicyRequestSchema = z.object({
  dailyCreditLimit: PlatformProductCreditUnitsSchema,
  userDailyCreditLimit: PlatformProductCreditUnitsSchema,
  projectDailyCreditLimit: PlatformProductCreditUnitsSchema,
  alertThresholdPercent: z.number().int().min(1).max(100),
}).strict().refine((value) => value.userDailyCreditLimit <= value.dailyCreditLimit, {
  message: 'User daily limit cannot exceed the organization daily limit.',
  path: ['userDailyCreditLimit'],
}).refine((value) => value.projectDailyCreditLimit <= value.dailyCreditLimit, {
  message: 'Project daily limit cannot exceed the organization daily limit.',
  path: ['projectDailyCreditLimit'],
});
export const PlatformBudgetPolicySchema = z.object({
  id: PlatformBudgetPolicyIdSchema,
  dailyCreditLimit: PlatformProductCreditUnitsSchema,
  userDailyCreditLimit: PlatformProductCreditUnitsSchema,
  projectDailyCreditLimit: PlatformProductCreditUnitsSchema,
  alertThresholdPercent: z.number().int().min(1).max(100),
  rowVersion: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
  replayed: z.boolean(),
}).strict();
export const PlatformExpiredReservationRecoverySchema = z.object({
  releasedReservations: z.number().int().nonnegative(),
  releasedCreditUnits: PlatformProductCreditUnitsSchema,
}).strict();
export const PlatformBillingOverviewSchema = z.object({
  plan: z.object({
    id: z.string().regex(/^PLAN-[A-Za-z0-9_-]{1,123}$/),
    code: z.string().min(1),
    name: z.string().min(1),
    currency: z.string().regex(/^[A-Z]{3}$/),
  }).strict(),
  subscription: z.object({
    id: z.string().regex(/^SUB-[A-Za-z0-9_-]{1,124}$/),
    status: z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE']),
    billingPeriodStart: z.iso.datetime(),
    billingPeriodEnd: z.iso.datetime(),
  }).strict(),
  entitlements: z.object({
    aiUsageEnabled: z.boolean(),
    maxCreditsPerRequest: PlatformProductCreditUnitsSchema,
    maxDailyCredits: PlatformProductCreditUnitsSchema,
    maxUserDailyCredits: PlatformProductCreditUnitsSchema,
    maxProjectDailyCredits: PlatformProductCreditUnitsSchema,
  }).strict(),
  policy: PlatformBudgetPolicySchema.omit({ replayed: true }),
  balance: z.object({
    id: z.string().regex(/^BAL-[A-Za-z0-9_-]{1,124}$/),
    allocatedCreditUnits: PlatformProductCreditUnitsSchema,
    reservedCreditUnits: PlatformProductCreditUnitsSchema,
    consumedCreditUnits: PlatformProductCreditUnitsSchema,
    remainingCreditUnits: PlatformProductCreditUnitsSchema,
    committedPercent: z.number().min(0).max(100),
    alertThresholdPercent: z.number().int().min(1).max(100),
    status: z.enum(['AVAILABLE', 'APPROACHING', 'EXHAUSTED']),
    rowVersion: z.number().int().positive(),
  }).strict(),
  dailyUsage: z.object({
    committedCreditUnits: PlatformProductCreditUnitsSchema,
    remainingCreditUnits: PlatformProductCreditUnitsSchema,
  }).strict(),
  expiredReservations: z.object({
    count: z.number().int().nonnegative(),
    reservedCreditUnits: PlatformProductCreditUnitsSchema,
  }).strict(),
  recentUsage: z.array(PlatformUsageLedgerEntrySchema).max(25),
}).strict();

export type PlatformBillingOverview = z.infer<typeof PlatformBillingOverviewSchema>;
export type PlatformBudgetPolicy = z.infer<typeof PlatformBudgetPolicySchema>;
export type PlatformUpdateBudgetPolicyRequest = z.infer<typeof PlatformUpdateBudgetPolicyRequestSchema>;
