import 'server-only';

import {
  OrganizationIdSchema,
  PlatformEngineeringPlanPreviewSchema,
  PlatformOrganizationSchema,
  PlatformProjectIdSchema,
  PlatformProjectSchema,
  type PlatformEngineeringPlanPreview,
  type PlatformProject,
} from './contracts';
import { requestPlatform } from './request';
import * as platformSdk from './generated/sdk.gen';
import { currentSessionToken } from './session';

export type EngineeringPlanPageState =
  | { status: 'ready'; project: PlatformProject; plan: PlatformEngineeringPlanPreview | null; canGenerate: boolean }
  | { status: 'unauthenticated' | 'forbidden' | 'not-found' }
  | { status: 'unavailable'; message: string };

export async function getEngineeringPlanPage(organizationIdInput: string, projectIdInput: string): Promise<EngineeringPlanPageState> {
  const organizationId = OrganizationIdSchema.safeParse(organizationIdInput);
  const projectId = PlatformProjectIdSchema.safeParse(projectIdInput);
  if (!organizationId.success || !projectId.success) return { status: 'not-found' };
  const token = await currentSessionToken();
  if (!token) return { status: 'unauthenticated' };
  const organizationPath = { organizationId: organizationId.data };
  const projectPath = { organizationId: organizationId.data, projectId: projectId.data };
  const [organizationResponse, projectResponse, planResponse] = await Promise.all([
    requestPlatform((client) => platformSdk.getOrganization({ client, path: organizationPath }), token),
    requestPlatform((client) => platformSdk.getProject({ client, path: projectPath }), token),
    requestPlatform((client) => platformSdk.getLatestEngineeringPlan({ client, path: projectPath }), token),
  ]);
  if ([organizationResponse, projectResponse, planResponse].some((response) => response.status === 401)) return { status: 'unauthenticated' };
  if ([organizationResponse, projectResponse, planResponse].some((response) => response.status === 403)) return { status: 'forbidden' };
  if (projectResponse.status === 404 || organizationResponse.status === 404) return { status: 'not-found' };
  if (organizationResponse.status !== 200 || projectResponse.status !== 200 || ![200, 404].includes(planResponse.status)) return { status: 'unavailable', message: 'We could not load the Engineering Plan.' };
  const organization = PlatformOrganizationSchema.safeParse(organizationResponse.body);
  const parsedProject = PlatformProjectSchema.safeParse(projectResponse.body);
  const parsedPlan = planResponse.status === 404 ? null : PlatformEngineeringPlanPreviewSchema.safeParse(planResponse.body);
  if (!organization.success || !parsedProject.success || (parsedPlan !== null && !parsedPlan.success)) return { status: 'unavailable', message: 'The platform returned an unexpected Engineering Plan response.' };
  return {
    status: 'ready', project: parsedProject.data, plan: parsedPlan === null ? null : parsedPlan.data,
    canGenerate: ['OWNER', 'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT'].includes(organization.data.role),
  };
}
