import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse, parseOrganizationId } from '@/src/platform/bff';
import { PlatformModelCatalogSchema } from '@/src/platform/contracts';
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
  if (!organizationId.success) {
    return bffError(404, 'NOT_FOUND', 'Organization was not found.', requestId);
  }

  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;

  const response = await requestPlatform(
    (client) => platformSdk.getModelCatalog({ client, path: { organizationId: organizationId.data } }),
    authentication.token,
    requestId,
  );
  if (response.status === 200 && !PlatformModelCatalogSchema.safeParse(response.body).success) {
    return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected response.', response.requestId);
  }
  return forwardPlatformResponse(response);
}
