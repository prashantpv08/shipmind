import 'server-only';

import {
  OrganizationIdSchema,
  PlatformAnalysisRunSchema,
  PlatformLatestAnalysisRunSchema,
  PlatformOrganizationSchema,
  PlatformProjectIdSchema,
  PlatformProjectSchema,
  PlatformSourceListSchema,
  type PlatformAnalysisRun,
  type PlatformProject,
  type PlatformSource,
} from './contracts';
import { requestPlatform } from './request';
import * as platformSdk from './generated/sdk.gen';
import { currentSessionToken } from './session';

export type ProjectSourcesState =
  | { status: 'ready'; project: PlatformProject; sources: PlatformSource[]; latestRun: PlatformAnalysisRun | null; canManage: boolean }
  | { status: 'unauthenticated' | 'forbidden' | 'not-found' }
  | { status: 'unavailable'; message: string };

export async function getProjectSources(organizationIdInput: string, projectIdInput: string): Promise<ProjectSourcesState> {
  const organizationId = OrganizationIdSchema.safeParse(organizationIdInput);
  const projectId = PlatformProjectIdSchema.safeParse(projectIdInput);
  if (!organizationId.success || !projectId.success) return { status: 'not-found' };
  const token = await currentSessionToken();
  if (!token) return { status: 'unauthenticated' };
  const organizationPath = { organizationId: organizationId.data };
  const projectPath = { organizationId: organizationId.data, projectId: projectId.data };
  const [organizationResponse, projectResponse, sourcesResponse, runResponse] = await Promise.all([
    requestPlatform((client) => platformSdk.getOrganization({ client, path: organizationPath }), token),
    requestPlatform((client) => platformSdk.getProject({ client, path: projectPath }), token),
    requestPlatform((client) => platformSdk.listProjectSources({ client, path: projectPath }), token),
    requestPlatform((client) => platformSdk.getLatestProjectAnalysisRun({ client, path: projectPath }), token),
  ]);
  const responses = [organizationResponse, projectResponse, sourcesResponse, runResponse];
  if (responses.some((response) => response.status === 401)) return { status: 'unauthenticated' };
  if (responses.some((response) => response.status === 403)) return { status: 'forbidden' };
  if (responses.some((response) => response.status === 404)) return { status: 'not-found' };
  if (responses.some((response) => response.status !== 200)) return { status: 'unavailable', message: 'We could not load project sources from the platform.' };
  const organization = PlatformOrganizationSchema.safeParse(organizationResponse.body);
  const project = PlatformProjectSchema.safeParse(projectResponse.body);
  const sources = PlatformSourceListSchema.safeParse(sourcesResponse.body);
  const latest = PlatformLatestAnalysisRunSchema.safeParse(runResponse.body);
  if (!organization.success || !project.success || !sources.success || !latest.success) return { status: 'unavailable', message: 'The platform returned an unexpected source response.' };
  const latestRun = latest.data.run === null ? null : PlatformAnalysisRunSchema.parse(latest.data.run);
  return {
    status: 'ready', project: project.data, sources: sources.data.sources, latestRun,
    canManage: ['OWNER', 'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT'].includes(organization.data.role),
  };
}
