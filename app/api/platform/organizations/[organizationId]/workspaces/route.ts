import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse, parseOrganizationId } from '@/src/platform/bff';
import { PlatformWorkspaceListSchema } from '@/src/platform/contracts';
import * as platformSdk from '@/src/platform/generated/sdk.gen';
import { requestPlatform } from '@/src/platform/request';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
){
  const requestId = bffRequestId(request);
  const { organizationId: rawOrganizationId } = await context.params;
  const organizationId = parseOrganizationId(rawOrganizationId);
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');

  if (!organizationId.success || (cursor !== null && (cursor.length < 1 || cursor.length > 512))) {
    return bffError(400, 'INVALID_REQUEST', 'Workspace list request is invalid.', requestId);
  }

  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;

  const platformResponse = await requestPlatform(
    (client) => platformSdk.listWorkspaces({
      client,
      path: { organizationId: organizationId.data },
      query: { limit: 100, ...(cursor === null ? {} : { cursor }) },
    }),
    authentication.token,
    requestId,
  );

  if (platformResponse.status === 200 && !PlatformWorkspaceListSchema.safeParse(platformResponse.body).success) {
    return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected response.', platformResponse.requestId);
  }
  return forwardPlatformResponse(platformResponse);
}
