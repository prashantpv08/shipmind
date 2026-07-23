import 'server-only';

import {
  OrganizationIdSchema,
  PlatformBillingOverviewSchema,
  type PlatformBillingOverview,
} from './contracts';
import { requestPlatform } from './request';
import { currentSessionToken } from './session';

export type OrganizationBillingState =
  | { status: 'ready'; overview: PlatformBillingOverview }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'unavailable'; message: string };

export async function getOrganizationBilling(
  organizationIdInput: string,
): Promise<OrganizationBillingState> {
  const organizationId = OrganizationIdSchema.safeParse(organizationIdInput);
  if (!organizationId.success) return { status: 'not-found' };

  const token = await currentSessionToken();
  if (!token) return { status: 'unauthenticated' };

  const response = await requestPlatform(
    `/api/v1/organizations/${encodeURIComponent(organizationId.data)}/billing/overview`,
    token,
  );
  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 403) return { status: 'forbidden' };
  if (response.status === 404) return { status: 'not-found' };
  if (response.status !== 200) {
    return { status: 'unavailable', message: 'We could not load the organization budget from the platform.' };
  }

  const parsed = PlatformBillingOverviewSchema.safeParse(response.body);
  if (!parsed.success) {
    return { status: 'unavailable', message: 'The platform returned an unexpected billing response.' };
  }
  return { status: 'ready', overview: parsed.data };
}
