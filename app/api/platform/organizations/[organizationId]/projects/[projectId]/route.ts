import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse, parseOrganizationProjectIds } from '@/src/platform/bff';
import { PlatformProjectSchema } from '@/src/platform/contracts';
import * as platformSdk from '@/src/platform/generated/sdk.gen';
import { requestPlatform } from '@/src/platform/request';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ organizationId: string; projectId: string }> },
){
  const requestId = bffRequestId(request);
  const { organizationId, projectId } = parseOrganizationProjectIds(await context.params);

  if (!organizationId.success || !projectId.success) {
    return bffError(404, 'NOT_FOUND', 'Project was not found.', requestId);
  }

  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;

  const platformResponse = await requestPlatform(
    (client) => platformSdk.getProject({ client, path: { organizationId: organizationId.data, projectId: projectId.data } }),
    authentication.token,
    requestId,
  );

  if (platformResponse.status === 200 && !PlatformProjectSchema.safeParse(platformResponse.body).success) {
    return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected response.', platformResponse.requestId);
  }
  return forwardPlatformResponse(platformResponse, { etag: true });
}
