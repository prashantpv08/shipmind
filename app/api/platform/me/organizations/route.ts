import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse } from '@/src/platform/bff';
import { CurrentUserOrganizationsSchema } from '@/src/platform/contracts';
import * as platformSdk from '@/src/platform/generated/sdk.gen';
import { requestPlatform } from '@/src/platform/request';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestId = bffRequestId(request);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;

  const platformResponse = await requestPlatform(
    (client) => platformSdk.listCurrentUserOrganizations({ client }),
    authentication.token,
    requestId,
  );

  if (platformResponse.status === 200 && !CurrentUserOrganizationsSchema.safeParse(platformResponse.body).success) {
    return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected response.', platformResponse.requestId);
  }
  return forwardPlatformResponse(platformResponse);
}
