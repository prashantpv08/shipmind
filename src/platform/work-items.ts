import 'server-only';

import type { z } from 'zod';

import {
  OrganizationIdSchema,
  PlatformArchitectureBaselineSchema,
  PlatformArtifactBaselineSchema,
  PlatformBusinessContextBaselineSchema,
  PlatformOrganizationSchema,
  PlatformProjectIdSchema,
  PlatformProjectReadinessResponseSchema,
  PlatformProjectSchema,
  PlatformWorkItemGenerationPreviewSchema,
  type PlatformWorkItemGenerationPreview,
  type PlatformArchitectureBaseline,
  type PlatformArtifactBaseline,
  type PlatformBusinessContextBaseline,
  type PlatformProjectReadiness,
} from './contracts';
import { requestPlatform } from './request';
import { currentSessionToken } from './session';

export type WorkItemReviewState =
  | { status: 'ready'; project: z.infer<typeof PlatformProjectSchema>; readiness: PlatformProjectReadiness | null; businessContextBaseline: PlatformBusinessContextBaseline; businessContextBlockingReason: string | null; artifactBaseline: PlatformArtifactBaseline; architectureBaseline: PlatformArchitectureBaseline; preview: PlatformWorkItemGenerationPreview | null; canManageArtifacts: boolean; canGenerateArchitecture: boolean; canApproveArchitecture: boolean; canGenerateBacklog: boolean; canReview: boolean }
  | { status: 'unauthenticated' | 'forbidden' | 'not-found' }
  | { status: 'unavailable'; message: string };

export async function getWorkItemReview(organizationIdInput: string, projectIdInput: string): Promise<WorkItemReviewState> {
  const organizationId = OrganizationIdSchema.safeParse(organizationIdInput);
  const projectId = PlatformProjectIdSchema.safeParse(projectIdInput);
  if (!organizationId.success || !projectId.success) return { status: 'not-found' };
  const token = await currentSessionToken();
  if (!token) return { status: 'unauthenticated' };
  const org = encodeURIComponent(organizationId.data);
  const project = encodeURIComponent(projectId.data);
  const [organizationResponse, projectResponse, readinessResponse, businessContextResponse, artifactResponse, architectureResponse, previewResponse] = await Promise.all([
    requestPlatform(`/api/v1/organizations/${org}`, token),
    requestPlatform(`/api/v1/organizations/${org}/projects/${project}`, token),
    requestPlatform(`/api/v1/organizations/${org}/projects/${project}/readiness`, token),
    requestPlatform(`/api/v1/organizations/${org}/projects/${project}/business-context/current`, token),
    requestPlatform(`/api/v1/organizations/${org}/projects/${project}/artifacts/current`, token),
    requestPlatform(`/api/v1/organizations/${org}/projects/${project}/architecture/current`, token),
    requestPlatform(`/api/v1/organizations/${org}/projects/${project}/work-item-generations/latest`, token),
  ]);
  const required = [organizationResponse, projectResponse, readinessResponse, businessContextResponse, artifactResponse, architectureResponse];
  if (required.some((response) => response.status === 401) || previewResponse.status === 401) return { status: 'unauthenticated' };
  if (required.some((response) => response.status === 403) || previewResponse.status === 403) return { status: 'forbidden' };
  if (required.some((response) => response.status === 404)) return { status: 'not-found' };
  if (required.some((response) => response.status !== 200) || ![200, 404].includes(previewResponse.status)) return { status: 'unavailable', message: 'We could not load the backlog review.' };
  const organization = PlatformOrganizationSchema.safeParse(organizationResponse.body);
  const parsedProject = PlatformProjectSchema.safeParse(projectResponse.body);
  const parsedReadiness = PlatformProjectReadinessResponseSchema.safeParse(readinessResponse.body);
  const businessContextBaseline = PlatformBusinessContextBaselineSchema.safeParse(businessContextResponse.body);
  const artifactBaseline = PlatformArtifactBaselineSchema.safeParse(artifactResponse.body);
  const architectureBaseline = PlatformArchitectureBaselineSchema.safeParse(architectureResponse.body);
  const preview = previewResponse.status === 404 ? null : PlatformWorkItemGenerationPreviewSchema.safeParse(previewResponse.body);
  if (!organization.success || !parsedProject.success || !parsedReadiness.success || !businessContextBaseline.success || !artifactBaseline.success || !architectureBaseline.success || parsedReadiness.data.projectId !== parsedProject.data.id || parsedReadiness.data.graphVersion !== parsedProject.data.graphVersion || businessContextBaseline.data.projectId !== parsedProject.data.id || businessContextBaseline.data.graphVersion !== parsedProject.data.graphVersion || artifactBaseline.data.projectId !== parsedProject.data.id || artifactBaseline.data.graphVersion !== parsedProject.data.graphVersion || artifactBaseline.data.artifacts.some((artifact) => artifact.projectId !== parsedProject.data.id || artifact.sourceGraphVersion !== parsedProject.data.graphVersion) || architectureBaseline.data.projectId !== parsedProject.data.id || architectureBaseline.data.graphVersion !== parsedProject.data.graphVersion || (architectureBaseline.data.generation !== null && (architectureBaseline.data.generation.projectId !== parsedProject.data.id || architectureBaseline.data.generation.graphVersion !== parsedProject.data.graphVersion)) || architectureBaseline.data.artifacts.some((artifact) => artifact.projectId !== parsedProject.data.id || artifact.sourceGraphVersion !== parsedProject.data.graphVersion) || (preview !== null && !preview.success)) return { status: 'unavailable', message: 'The platform returned an unexpected backlog response.' };
  const currentContext = businessContextBaseline.data;
  const businessContextBlockingReason = currentContext.version === null
    ? 'Generate and approve the exact current Business Context before downstream planning.'
    : currentContext.review?.decision !== 'ACCEPT' || currentContext.review.truthStatus !== 'HUMAN_APPROVED'
      ? 'The exact current Business Context requires human approval before downstream planning.'
      : currentContext.version.payload.applicability.status === 'APPLICABLE'
        ? 'An exact compatible approved Experience Baseline is required before downstream planning.'
        : currentContext.version.payload.applicability.status !== 'NOT_APPLICABLE'
          ? 'Experience applicability must be resolved before downstream planning.'
          : null;
  const role = organization.data.role;
  return {
    status: 'ready',
    project: parsedProject.data,
    readiness: parsedReadiness.data.readiness,
    businessContextBaseline: currentContext,
    businessContextBlockingReason,
    artifactBaseline: artifactBaseline.data,
    architectureBaseline: architectureBaseline.data,
    preview: preview === null ? null : preview.data,
    canManageArtifacts: ['OWNER', 'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT'].includes(role),
    canGenerateArchitecture: ['OWNER', 'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT'].includes(role),
    canApproveArchitecture: ['OWNER', 'ADMINISTRATOR', 'ARCHITECT'].includes(role),
    canGenerateBacklog: ['OWNER', 'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT'].includes(role),
    canReview: ['OWNER', 'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT', 'REVIEWER'].includes(role),
  };
}
