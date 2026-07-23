import 'server-only';

import {
  OrganizationIdSchema,
  PlatformModelCatalogSchema,
  type PlatformModelCatalog,
} from './contracts';
import { requestPlatform } from './request';
import { currentSessionToken } from './session';

export type OrganizationModelCatalogState =
  | { status: 'ready'; catalog: PlatformModelCatalog }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'unavailable'; message: string };

export async function getOrganizationModelCatalog(
  organizationIdInput: string,
): Promise<OrganizationModelCatalogState> {
  const organizationId = OrganizationIdSchema.safeParse(organizationIdInput);
  if (!organizationId.success) return { status: 'not-found' };

  const token = await currentSessionToken();
  if (!token) return { status: 'unauthenticated' };

  const response = await requestPlatform(
    `/api/v1/organizations/${encodeURIComponent(organizationId.data)}/models/catalog`,
    token,
  );
  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 403) return { status: 'forbidden' };
  if (response.status === 404) return { status: 'not-found' };
  if (response.status !== 200) {
    return { status: 'unavailable', message: 'We could not load the organization model catalog from the platform.' };
  }

  const parsed = PlatformModelCatalogSchema.safeParse(response.body);
  if (!parsed.success) {
    return { status: 'unavailable', message: 'The platform returned an unexpected model catalog response.' };
  }
  return { status: 'ready', catalog: parsed.data };
}

