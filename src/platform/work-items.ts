import 'server-only';

import type { z } from 'zod';

import {
  OrganizationIdSchema,
  PlatformOrganizationSchema,
  PlatformProjectIdSchema,
  PlatformProjectSchema,
  PlatformWorkItemGenerationPreviewSchema,
  type PlatformWorkItemGenerationPreview,
} from './contracts';
import { requestPlatform } from './request';
import { currentSessionToken } from './session';

export type WorkItemReviewState =
  | { status: 'ready'; project: z.infer<typeof PlatformProjectSchema>; preview: PlatformWorkItemGenerationPreview | null; canGenerate: boolean; canReview: boolean }
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
  const [organizationResponse, projectResponse, previewResponse] = await Promise.all([
    requestPlatform(`/api/v1/organizations/${org}`, token),
    requestPlatform(`/api/v1/organizations/${org}/projects/${project}`, token),
    requestPlatform(`/api/v1/organizations/${org}/projects/${project}/work-item-generations/latest`, token),
  ]);
  const required = [organizationResponse, projectResponse];
  if (required.some((response) => response.status === 401) || previewResponse.status === 401) return { status: 'unauthenticated' };
  if (required.some((response) => response.status === 403) || previewResponse.status === 403) return { status: 'forbidden' };
  if (required.some((response) => response.status === 404)) return { status: 'not-found' };
  if (required.some((response) => response.status !== 200) || ![200, 404].includes(previewResponse.status)) return { status: 'unavailable', message: 'We could not load the backlog review.' };
  const organization = PlatformOrganizationSchema.safeParse(organizationResponse.body);
  const parsedProject = PlatformProjectSchema.safeParse(projectResponse.body);
  const preview = previewResponse.status === 404 ? null : PlatformWorkItemGenerationPreviewSchema.safeParse(previewResponse.body);
  if (!organization.success || !parsedProject.success || (preview !== null && !preview.success)) return { status: 'unavailable', message: 'The platform returned an unexpected backlog response.' };
  return {
    status: 'ready',
    project: parsedProject.data,
    preview: preview === null ? null : preview.data,
    canGenerate: ['OWNER', 'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT'].includes(organization.data.role),
    canReview: ['OWNER', 'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT', 'REVIEWER'].includes(organization.data.role),
  };
}
