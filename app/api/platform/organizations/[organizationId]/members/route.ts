import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse, parseOrganizationId } from '@/src/platform/bff';
import { PlatformGovernanceListQuerySchema, PlatformMemberListSchema } from '@/src/platform/contracts';
import * as platformSdk from '@/src/platform/generated/sdk.gen';
import { requestPlatform } from '@/src/platform/request';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const requestId = bffRequestId(request);
  const { organizationId: rawId } = await context.params;
  const organizationId = parseOrganizationId(rawId);
  const query = PlatformGovernanceListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!organizationId.success) return bffError(404, 'NOT_FOUND', 'Organization was not found.', requestId);
  if (!query.success) return bffError(400, 'INVALID_REQUEST', 'Member list query is invalid.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const response = await requestPlatform(
    (client) => platformSdk.listOrganizationMembers({
      client,
      path: { organizationId: organizationId.data },
      query: query.data,
    }),
    authentication.token,
    requestId,
  );
  if (response.status === 200 && !PlatformMemberListSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected response.', response.requestId);
  return forwardPlatformResponse(response);
}
