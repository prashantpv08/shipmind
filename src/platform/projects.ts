import 'server-only';

import {
  OrganizationIdSchema,
  PlatformProjectListSchema,
  type PlatformProject,
} from './contracts';
import { requestPlatform } from './request';
import { currentSessionToken } from './session';

export type OrganizationProjectsState =
  | { status: 'ready'; projects: PlatformProject[]; nextCursor: string | null }
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
  const response = await requestPlatform(
    `/api/v1/organizations/${encodeURIComponent(organizationId.data)}/projects?${query.toString()}`,
    token,
  );

  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 403) return { status: 'forbidden' };
  if (response.status === 404) return { status: 'not-found' };
  if (response.status !== 200) {
    return { status: 'unavailable', message: 'We could not load projects from the platform.' };
  }

  const parsed = PlatformProjectListSchema.safeParse(response.body);
  if (!parsed.success) {
    return { status: 'unavailable', message: 'The platform returned an unexpected project response.' };
  }

  return { status: 'ready', ...parsed.data };
}
