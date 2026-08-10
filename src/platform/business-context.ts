import 'server-only';

import {
  OrganizationIdSchema,
  PlatformBusinessContextBaselineSchema,
  PlatformBusinessContextPreviewSchema,
  PlatformOrganizationSchema,
  PlatformProjectIdSchema,
  PlatformProjectSchema,
  type PlatformBusinessContextBaseline,
  type PlatformBusinessContextPreview,
  type PlatformOrganization,
  type PlatformProject,
} from './contracts';
import { requestPlatform } from './request';
import * as platformSdk from './generated/sdk.gen';
import { currentSessionToken } from './session';

export type BusinessContextPageState =
  | { status: 'ready'; organization: PlatformOrganization; project: PlatformProject; preview: PlatformBusinessContextPreview; baseline: PlatformBusinessContextBaseline }
  | { status: 'unauthenticated' | 'forbidden' | 'not-found' | 'not-ready' }
  | { status: 'unavailable'; message: string };

export async function getBusinessContextPage(organizationIdInput: string, projectIdInput: string): Promise<BusinessContextPageState> {
  const organizationId = OrganizationIdSchema.safeParse(organizationIdInput);
  const projectId = PlatformProjectIdSchema.safeParse(projectIdInput);
  if (!organizationId.success || !projectId.success) return { status: 'not-found' };
  const token = await currentSessionToken();
  if (!token) return { status: 'unauthenticated' };
  const organizationPath = { organizationId: organizationId.data };
  const projectPath = { organizationId: organizationId.data, projectId: projectId.data };
  const [organizationResponse, projectResponse, previewResponse, baselineResponse] = await Promise.all([
    requestPlatform((client) => platformSdk.getOrganization({ client, path: organizationPath }), token),
    requestPlatform((client) => platformSdk.getProject({ client, path: projectPath }), token),
    requestPlatform((client) => platformSdk.getBusinessContextPreview({ client, path: projectPath }), token),
    requestPlatform((client) => platformSdk.getCurrentBusinessContext({ client, path: projectPath }), token),
  ]);
  if ([organizationResponse, projectResponse, previewResponse, baselineResponse].some((response) => response.status === 401)) return { status: 'unauthenticated' };
  if ([organizationResponse, projectResponse, previewResponse, baselineResponse].some((response) => response.status === 403)) return { status: 'forbidden' };
  if ([organizationResponse, projectResponse, previewResponse, baselineResponse].some((response) => response.status === 404)) return { status: 'not-found' };
  if (previewResponse.status === 409) return { status: 'not-ready' };
  if (organizationResponse.status !== 200 || projectResponse.status !== 200 || previewResponse.status !== 200 || baselineResponse.status !== 200) return { status: 'unavailable', message: 'We could not load the current Business Context and review state.' };
  const parsedOrganization = PlatformOrganizationSchema.safeParse(organizationResponse.body);
  const parsedProject = PlatformProjectSchema.safeParse(projectResponse.body);
  const parsedPreview = PlatformBusinessContextPreviewSchema.safeParse(previewResponse.body);
  const parsedBaseline = PlatformBusinessContextBaselineSchema.safeParse(baselineResponse.body);
  if (!parsedOrganization.success || !parsedProject.success || !parsedPreview.success || !parsedBaseline.success) return { status: 'unavailable', message: 'The platform returned an unexpected Business Context response.' };
  if (parsedBaseline.data.projectId !== parsedProject.data.id || parsedBaseline.data.graphVersion !== parsedProject.data.graphVersion) return { status: 'unavailable', message: 'The platform returned a stale Business Context review state.' };
  return { status: 'ready', organization: parsedOrganization.data, project: parsedProject.data, preview: parsedPreview.data, baseline: parsedBaseline.data };
}
