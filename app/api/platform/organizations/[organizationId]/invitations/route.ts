import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse, parseIdempotencyKey, parseOrganizationId, rejectCrossOriginMutation } from '@/src/platform/bff';
import { PlatformCreateInvitationRequestSchema, PlatformCreateInvitationResponseSchema, PlatformGovernanceListQuerySchema, PlatformInvitationListSchema } from '@/src/platform/contracts';
import * as platformSdk from '@/src/platform/generated/sdk.gen';
import { requestPlatform } from '@/src/platform/request';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const requestId = bffRequestId(request);
  const { organizationId: rawId } = await context.params;
  const organizationId = parseOrganizationId(rawId);
  const query = PlatformGovernanceListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!organizationId.success) return bffError(404, 'NOT_FOUND', 'Organization was not found.', requestId);
  if (!query.success) return bffError(400, 'INVALID_REQUEST', 'Invitation list query is invalid.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const response = await requestPlatform(
    (client) => platformSdk.listOrganizationInvitations({
      client,
      path: { organizationId: organizationId.data },
      query: query.data,
    }),
    authentication.token,
    requestId,
  );
  if (response.status === 200 && !PlatformInvitationListSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected response.', response.requestId);
  return forwardPlatformResponse(response);
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This invitation request is not allowed.');
  if (originError) return originError;
  const { organizationId: rawId } = await context.params;
  const organizationId = parseOrganizationId(rawId);
  const idempotencyKey = parseIdempotencyKey(request);
  const creation = PlatformCreateInvitationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!organizationId.success) return bffError(404, 'NOT_FOUND', 'Organization was not found.', requestId);
  if (!idempotencyKey.success || !creation.success) return bffError(400, 'INVALID_REQUEST', 'Invitation request is invalid.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const response = await requestPlatform(
    (client) => platformSdk.createOrganizationInvitation({
      client,
      path: { organizationId: organizationId.data },
      headers: { 'Idempotency-Key': idempotencyKey.data },
      body: creation.data,
    }),
    authentication.token,
    requestId,
  );
  if ((response.status === 200 || response.status === 201) && !PlatformCreateInvitationResponseSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected response.', response.requestId);
  return forwardPlatformResponse(response);
}
