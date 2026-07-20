import 'server-only';

import {
  OrganizationIdSchema,
  PlatformOrganizationSchema,
  PlatformProjectListSchema,
  type PlatformProject,
  PlatformWorkspaceListSchema,
  type PlatformWorkspace,
} from './contracts';
import { requestPlatform } from './request';
import { currentSessionToken } from './session';

export type OrganizationProjectsState =
  | {
      status: 'ready';
      projects: PlatformProject[];
      nextCursor: string | null;
      workspaces: PlatformWorkspace[];
      moreWorkspaces: boolean;
      canCreate: boolean;
    }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'unavailable'; message: string };

export async function getOrganizationProjects(
  organizationIdInput: string,
  cursor?: string,
): Promise<OrganizationProjectsState> {
  const organizationId = OrganizationIdSchema.safeParse(organizationIdInput);
  if (!organizationId.success || (cursor !== undefined && (cursor.length < 1 || cursor.length > 512))) {
    return { status: 'not-found' };
  }

  const token = await currentSessionToken();
  if (!token) return { status: 'unauthenticated' };

  const query = new URLSearchParams({ limit: '50' });
  if (cursor !== undefined) query.set('cursor', cursor);
  const encodedOrganizationId = encodeURIComponent(organizationId.data);
  const [organizationResponse, projectResponse, workspaceResponse] = await Promise.all([
    requestPlatform(`/api/v1/organizations/${encodedOrganizationId}`, token),
    requestPlatform(`/api/v1/organizations/${encodedOrganizationId}/projects?${query.toString()}`, token),
    requestPlatform(`/api/v1/organizations/${encodedOrganizationId}/workspaces?limit=100`, token),
  ]);
  const responses = [organizationResponse, projectResponse, workspaceResponse];

  if (responses.some((response) => response.status === 401)) return { status: 'unauthenticated' };
  if (responses.some((response) => response.status === 403)) return { status: 'forbidden' };
  if (responses.some((response) => response.status === 404)) return { status: 'not-found' };
  if (responses.some((response) => response.status !== 200)) {
    return { status: 'unavailable', message: 'We could not load projects from the platform.' };
  }

  const organization = PlatformOrganizationSchema.safeParse(organizationResponse.body);
  const projectPage = PlatformProjectListSchema.safeParse(projectResponse.body);
  const workspacePage = PlatformWorkspaceListSchema.safeParse(workspaceResponse.body);
  if (!organization.success || !projectPage.success || !workspacePage.success) {
    return { status: 'unavailable', message: 'The platform returned an unexpected project response.' };
  }

  return {
    status: 'ready',
    ...projectPage.data,
    workspaces: workspacePage.data.workspaces,
    moreWorkspaces: workspacePage.data.nextCursor !== null,
    canCreate: ['OWNER', 'ADMINISTRATOR', 'PRODUCT_ANALYST', 'ARCHITECT'].includes(organization.data.role),
  };
}
