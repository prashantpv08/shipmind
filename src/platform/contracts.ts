/**
 * Compatibility names for the web application.
 *
 * Every field and validation rule comes from the generated platform contract.
 * Keep this module limited to aliases and type compositions; never declare API
 * fields here.
 */
import {
  zAnswerProjectClarificationBody,
  zAnswerProjectClarificationPath,
  zAnswerProjectClarificationResponse,
  zApproveArchitectureDecisionBody,
  zApproveArchitectureDecisionResponse,
  zApproveRequirementBaselineBody,
  zApproveRequirementBaselineResponse,
  zArchiveProjectHeaders,
  zCreateOrganizationInvitationBody,
  zCreateOrganizationInvitationHeaders,
  zCreateOrganizationInvitationResponse,
  zCreateProjectBody,
  zGenerateArchitectureOptionsBody,
  zGenerateArchitectureOptionsResponse,
  zGenerateBusinessContextBody,
  zGenerateBusinessContextResponse,
  zGenerateEngineeringPlanBody,
  zGenerateRequirementBaselineBody,
  zGenerateRequirementBaselineResponse,
  zGenerateWorkItemDraftBody,
  zGetBillingOverviewResponse,
  zGetBusinessContextPreviewResponse,
  zGetCurrentArchitectureBaselineResponse,
  zGetCurrentArtifactBaselineResponse,
  zGetCurrentBusinessContextResponse,
  zGetLatestEngineeringPlanResponse,
  zGetLatestProjectAnalysisRunResponse,
  zGetLatestWorkItemGenerationResponse,
  zGetModelCatalogResponse,
  zGetOrganizationPath,
  zGetOrganizationResponse,
  zGetProjectAnalysisRunPath,
  zGetProjectAnalysisRunResponse,
  zGetProjectPath,
  zGetProjectReadinessResponse,
  zGetProjectResponse,
  zListCurrentUserOrganizationsResponse,
  zListOrganizationInvitationsQuery,
  zListOrganizationInvitationsResponse,
  zListOrganizationMembersResponse,
  zListProjectSourcesResponse,
  zListProjectsQuery,
  zListProjectsResponse,
  zListWorkspacesResponse,
  zQueueProjectAnalysisBody,
  zResolveExperienceApplicabilityBody,
  zResolveExperienceApplicabilityResponse,
  zReviewBusinessContextBody,
  zReviewBusinessContextResponse,
  zRevokeOrganizationInvitationHeaders,
  zRevokeOrganizationInvitationPath,
  zRevokeOrganizationInvitationResponse,
  zSubmitWorkItemReviewBody,
  zSubmitWorkItemReviewHeaders,
  zSubmitWorkItemReviewPath,
  zUpdateBudgetPolicyBody,
  zUpdateBudgetPolicyHeaders,
  zUpdateBudgetPolicyPath,
  zUpdateBudgetPolicyResponse,
  zUploadProjectSourceBody,
  zUploadProjectSourceResponse,
  zRecoverExpiredUsageReservationsResponse,
} from './generated/zod.gen';
import { zGenerateWorkItemDraftError } from './generated/errors.gen';
import type {
  CreateOrganizationInvitationData,
  GenerateWorkItemDraftError,
  GetBillingOverviewResponse,
  GetBusinessContextPreviewResponse,
  GetCurrentArchitectureBaselineResponse,
  GetCurrentArtifactBaselineResponse,
  GetCurrentBusinessContextResponse,
  GetLatestEngineeringPlanResponse,
  GetLatestProjectAnalysisRunResponse,
  GetLatestWorkItemGenerationResponse,
  GetModelCatalogResponse,
  GetProjectAnalysisRunResponse,
  GetProjectReadinessResponse,
  GetProjectResponse,
  ListCurrentUserOrganizationsResponse,
  ListOrganizationInvitationsResponse,
  ListOrganizationMembersResponse,
  ListProjectSourcesResponse,
  ListProjectsResponse,
  ListWorkspacesResponse,
  ReviewBusinessContextData,
  UpdateBudgetPolicyData,
  UpdateBudgetPolicyResponse,
  UploadProjectSourceResponse,
} from './generated/types.gen';

export const OrganizationIdSchema = zGetOrganizationPath.shape.organizationId;
export const PlatformProjectIdSchema = zGetProjectPath.shape.projectId;
export const PlatformAnalysisRunIdSchema = zGetProjectAnalysisRunPath.shape.runId;
export const PlatformClarificationQuestionIdSchema = zAnswerProjectClarificationPath.shape.questionId;
export const PlatformInvitationIdSchema = zRevokeOrganizationInvitationPath.shape.invitationId;
export const PlatformBudgetPolicyIdSchema = zUpdateBudgetPolicyPath.shape.policyId;
export const PlatformWorkItemGenerationIdSchema = zSubmitWorkItemReviewPath.shape.generationId;

export const PlatformIdempotencyKeySchema = zCreateOrganizationInvitationHeaders.shape['Idempotency-Key'];
export const PlatformProjectEtagSchema = zArchiveProjectHeaders.shape['If-Match'];
export const PlatformInvitationEtagSchema = zRevokeOrganizationInvitationHeaders.shape['If-Match'];
export const PlatformBudgetPolicyEtagSchema = zUpdateBudgetPolicyHeaders.shape['If-Match'];
export const PlatformWorkItemReviewEtagSchema = zSubmitWorkItemReviewHeaders.shape['If-Match'];

export const CurrentUserOrganizationsSchema = zListCurrentUserOrganizationsResponse;
export const PlatformOrganizationSchema = zGetOrganizationResponse;
export const PlatformProjectSchema = zGetProjectResponse;
export const PlatformProjectListSchema = zListProjectsResponse;
export const PlatformProjectListQuerySchema = zListProjectsQuery;
export const PlatformCreateProjectRequestSchema = zCreateProjectBody;
export const PlatformWorkspaceListSchema = zListWorkspacesResponse;

export const PlatformBusinessContextPreviewSchema = zGetBusinessContextPreviewResponse;
export const PlatformBusinessContextBaselineSchema = zGetCurrentBusinessContextResponse;
export const PlatformGenerateBusinessContextRequestSchema = zGenerateBusinessContextBody;
export const PlatformReviewBusinessContextRequestSchema = zReviewBusinessContextBody.superRefine((value, context) => {
  if (value.decision === 'ACCEPT' && (value.feedbackCategory !== 'APPROVAL' || value.proposedGraphChanges.length !== 0)) {
    context.addIssue({ code: 'custom', message: 'Accept requires approval category and no edits' });
  }
  if (value.decision === 'ACCEPT_WITH_EDITS' && (value.feedbackCategory === 'APPROVAL' || value.proposedGraphChanges.length === 0)) {
    context.addIssue({ code: 'custom', message: 'Accept-with-edits requires categorized proposed changes' });
  }
  if (value.decision === 'REJECT' && (value.feedbackCategory === 'APPROVAL' || value.proposedGraphChanges.length !== 0)) {
    context.addIssue({ code: 'custom', message: 'Reject requires categorized feedback and no edits' });
  }
});
export const PlatformBusinessContextMutationResponseSchema = zGenerateBusinessContextResponse;
export const PlatformBusinessContextReviewResponseSchema = zReviewBusinessContextResponse;
export const PlatformResolveExperienceApplicabilityRequestSchema = zResolveExperienceApplicabilityBody;
export const PlatformExperienceApplicabilityDecisionResponseSchema = zResolveExperienceApplicabilityResponse;

export const PlatformSourceSchema = zUploadProjectSourceResponse;
export const PlatformSourceListSchema = zListProjectSourcesResponse;
export const PlatformUploadSourceRequestSchema = zUploadProjectSourceBody;
export const PlatformAnalysisRunSchema = zGetProjectAnalysisRunResponse;
export const PlatformLatestAnalysisRunSchema = zGetLatestProjectAnalysisRunResponse;
export const PlatformCreateAnalysisRunRequestSchema = zQueueProjectAnalysisBody;

export const PlatformMemberListSchema = zListOrganizationMembersResponse;
export const PlatformInvitationSchema = zRevokeOrganizationInvitationResponse;
export const PlatformInvitationListSchema = zListOrganizationInvitationsResponse;
export const PlatformGovernanceListQuerySchema = zListOrganizationInvitationsQuery;
export const PlatformCreateInvitationRequestSchema = zCreateOrganizationInvitationBody;
export const PlatformCreateInvitationResponseSchema = zCreateOrganizationInvitationResponse;

export const PlatformWorkItemGenerationBlockedResponseSchema = zGenerateWorkItemDraftError;
export const PlatformAnswerClarificationRequestSchema = zAnswerProjectClarificationBody;
export const PlatformClarificationAnswerResponseSchema = zAnswerProjectClarificationResponse;
export const PlatformProjectReadinessResponseSchema = zGetProjectReadinessResponse;
export const PlatformGenerateWorkItemsRequestSchema = zGenerateWorkItemDraftBody;
export const PlatformSubmitWorkItemReviewRequestSchema = zSubmitWorkItemReviewBody.superRefine((value, context) => {
  if (value.decision !== 'ACCEPT_WITH_EDITS') return;
  if (new Set(value.edits.map((edit) => edit.workItemId)).size !== value.edits.length) {
    context.addIssue({ code: 'custom', message: 'Each work item may be edited only once', path: ['edits'] });
  }
  value.edits.forEach((edit, index) => {
    if (!Object.keys(edit).some((key) => !['workItemId', 'expectedVersion'].includes(key))) {
      context.addIssue({ code: 'custom', message: 'An edit must change at least one field', path: ['edits', index] });
    }
  });
});
export const PlatformWorkItemGenerationPreviewSchema = zGetLatestWorkItemGenerationResponse;

export const PlatformArtifactBaselineSchema = zGetCurrentArtifactBaselineResponse;
export const PlatformGenerateArtifactsRequestSchema = zGenerateRequirementBaselineBody;
export const PlatformApproveArtifactsRequestSchema = zApproveRequirementBaselineBody;
export const PlatformArtifactGenerationResponseSchema = zGenerateRequirementBaselineResponse;
export const PlatformArtifactApprovalResponseSchema = zApproveRequirementBaselineResponse;

export const PlatformArchitectureBaselineSchema = zGetCurrentArchitectureBaselineResponse;
export const PlatformGenerateArchitectureRequestSchema = zGenerateArchitectureOptionsBody;
export const PlatformApproveArchitectureRequestSchema = zApproveArchitectureDecisionBody;
export const PlatformArchitectureMutationResponseSchema = zGenerateArchitectureOptionsResponse;
export const PlatformArchitectureApprovalResponseSchema = zApproveArchitectureDecisionResponse;

export const PlatformEngineeringPlanPreviewSchema = zGetLatestEngineeringPlanResponse;
export const PlatformGenerateEngineeringPlanRequestSchema = zGenerateEngineeringPlanBody;
export const PlatformModelCatalogSchema = zGetModelCatalogResponse.superRefine((catalog, context) => {
  for (const [index, provider] of catalog.providers.entries()) {
    if (provider.executionStatus === 'ENABLED' && !['LOCAL_ONLY', 'QUALIFIED'].includes(provider.lifecycleStatus)) {
      context.addIssue({ code: 'custom', message: 'Only local or qualified providers can be enabled', path: ['providers', index, 'executionStatus'] });
    }
  }
  for (const [index, model] of catalog.models.entries()) {
    if (model.executionStatus === 'ENABLED' && !['LOCAL_ONLY', 'QUALIFIED'].includes(model.lifecycleStatus)) {
      context.addIssue({ code: 'custom', message: 'Only local or qualified models can be enabled', path: ['models', index, 'executionStatus'] });
    }
    if (model.executionStatus === 'ENABLED' && model.lifecycleStatus === 'QUALIFIED') {
      if (model.evaluation.status !== 'QUALIFIED') context.addIssue({ code: 'custom', message: 'Enabled hosted models require qualification evidence', path: ['models', index, 'evaluation', 'status'] });
      if (model.pricing.status !== 'VERIFIED') context.addIssue({ code: 'custom', message: 'Enabled hosted models require verified pricing', path: ['models', index, 'pricing', 'status'] });
      if (model.dataPolicyStatus !== 'APPROVED') context.addIssue({ code: 'custom', message: 'Enabled hosted models require an approved data policy', path: ['models', index, 'dataPolicyStatus'] });
      if (model.allowedRegions.length === 0) context.addIssue({ code: 'custom', message: 'Enabled hosted models require an approved region', path: ['models', index, 'allowedRegions'] });
    }
  }
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
export const PlatformBillingOverviewSchema = zGetBillingOverviewResponse;
export const PlatformUpdateBudgetPolicyRequestSchema = zUpdateBudgetPolicyBody
  .refine((value) => value.userDailyCreditLimit <= value.dailyCreditLimit, {
    message: 'User daily limit cannot exceed the organization daily limit.',
    path: ['userDailyCreditLimit'],
  })
  .refine((value) => value.projectDailyCreditLimit <= value.dailyCreditLimit, {
    message: 'Project daily limit cannot exceed the organization daily limit.',
    path: ['projectDailyCreditLimit'],
  });
export const PlatformBudgetPolicySchema = zUpdateBudgetPolicyResponse;
export const PlatformExpiredReservationRecoverySchema = zRecoverExpiredUsageReservationsResponse;

export type PlatformOrganization = ListCurrentUserOrganizationsResponse['organizations'][number];
export type PlatformProject = GetProjectResponse;
export type PlatformWorkspace = ListWorkspacesResponse['workspaces'][number];
export type PlatformBusinessContextPreview = GetBusinessContextPreviewResponse;
export type PlatformBusinessContextBaseline = GetCurrentBusinessContextResponse;
export type PlatformBusinessContextReviewDecision = ReviewBusinessContextData['body']['decision'];
export type PlatformBusinessContextFeedbackCategory = ReviewBusinessContextData['body']['feedbackCategory'];
export type PlatformSource = UploadProjectSourceResponse;
export type PlatformAnalysisRun = GetProjectAnalysisRunResponse;
export type PlatformMember = ListOrganizationMembersResponse['members'][number];
export type PlatformInvitation = ListOrganizationInvitationsResponse['invitations'][number];
export type PlatformInvitationRole = CreateOrganizationInvitationData['body']['role'];
export type PlatformWorkItemGenerationBlocker = GenerateWorkItemDraftError['error']['details']['blockers'][number];
export type PlatformProjectReadiness = NonNullable<GetProjectReadinessResponse['readiness']>;
export type PlatformProjectArtifact = GetCurrentArtifactBaselineResponse['artifacts'][number];
export type PlatformArtifactApproval = NonNullable<GetCurrentArtifactBaselineResponse['approval']>;
export type PlatformArtifactBaseline = GetCurrentArtifactBaselineResponse;
export type PlatformArchitectureBaseline = GetCurrentArchitectureBaselineResponse;
export type PlatformWorkItem = GetLatestWorkItemGenerationResponse['workItems'][number];
export type PlatformWorkItemGenerationPreview = GetLatestWorkItemGenerationResponse;
export type PlatformEngineeringPlanPreview = GetLatestEngineeringPlanResponse;
export type PlatformModelCatalog = GetModelCatalogResponse;
export type PlatformBillingOverview = GetBillingOverviewResponse;
export type PlatformBudgetPolicy = UpdateBudgetPolicyResponse;
export type PlatformUpdateBudgetPolicyRequest = UpdateBudgetPolicyData['body'];

export type PlatformSourceList = ListProjectSourcesResponse;
export type PlatformAnalysisRunList = GetLatestProjectAnalysisRunResponse;
export type PlatformInvitationList = ListOrganizationInvitationsResponse;
export type PlatformMemberList = ListOrganizationMembersResponse;
export type PlatformProjectList = ListProjectsResponse;
