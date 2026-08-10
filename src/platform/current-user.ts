import 'server-only';

import { CurrentUserOrganizationsSchema, type PlatformOrganization } from './contracts';
import { requestPlatform } from './request';
import * as platformSdk from './generated/sdk.gen';
import { currentSessionToken } from './session';

export type CurrentUserState =
  | { status: 'authenticated'; organizations: PlatformOrganization[] }
  | { status: 'unauthenticated' }
  | { status: 'unavailable'; message: string };

export async function getCurrentUserState(): Promise<CurrentUserState> {
  const token = await currentSessionToken();

  if (!token) {
    return { status: 'unauthenticated' };
  }

  const response = await requestPlatform((client) => platformSdk.listCurrentUserOrganizations({ client }), token);

  if (response.status === 401) {
    return { status: 'unauthenticated' };
  }

  if (response.status !== 200) {
    return { status: 'unavailable', message: 'We could not load your organization access.' };
  }

  const parsed = CurrentUserOrganizationsSchema.safeParse(response.body);
  if (!parsed.success) {
    return { status: 'unavailable', message: 'The platform returned an unexpected response.' };
  }

  return { status: 'authenticated', organizations: parsed.data.organizations };
}
