import 'server-only';

import {
  OrganizationIdSchema,
  PlatformInvitationListSchema,
  PlatformMemberListSchema,
  PlatformOrganizationSchema,
  type PlatformInvitation,
  type PlatformMember,
} from './contracts';
import { requestPlatform } from './request';
import { currentSessionToken } from './session';

export type OrganizationGovernanceState =
  | { status: 'ready'; members: PlatformMember[]; invitations: PlatformInvitation[]; canManage: boolean }
  | { status: 'unauthenticated' | 'forbidden' | 'not-found' }
  | { status: 'unavailable'; message: string };

export async function getOrganizationGovernance(input: string): Promise<OrganizationGovernanceState> {
  const organizationId = OrganizationIdSchema.safeParse(input);
  if (!organizationId.success) return { status: 'not-found' };
  const token = await currentSessionToken();
  if (!token) return { status: 'unauthenticated' };
  const id = encodeURIComponent(organizationId.data);
  const [organization, members, invitations] = await Promise.all([
    requestPlatform(`/api/v1/organizations/${id}`, token),
    requestPlatform(`/api/v1/organizations/${id}/members?limit=100`, token),
    requestPlatform(`/api/v1/organizations/${id}/invitations?limit=100`, token),
  ]);
  const responses = [organization, members, invitations];
  if (responses.some((response) => response.status === 401)) return { status: 'unauthenticated' };
  if (responses.some((response) => response.status === 403)) return { status: 'forbidden' };
  if (responses.some((response) => response.status === 404)) return { status: 'not-found' };
  if (responses.some((response) => response.status !== 200)) {
    return { status: 'unavailable', message: 'We could not load organization access governance.' };
  }
  const parsedOrganization = PlatformOrganizationSchema.safeParse(organization.body);
  const parsedMembers = PlatformMemberListSchema.safeParse(members.body);
  const parsedInvitations = PlatformInvitationListSchema.safeParse(invitations.body);
  if (!parsedOrganization.success || !parsedMembers.success || !parsedInvitations.success) {
    return { status: 'unavailable', message: 'The platform returned an unexpected governance response.' };
  }
  return {
    status: 'ready',
    members: parsedMembers.data.members,
    invitations: parsedInvitations.data.invitations,
    canManage: ['OWNER', 'ADMINISTRATOR'].includes(parsedOrganization.data.role),
  };
}
