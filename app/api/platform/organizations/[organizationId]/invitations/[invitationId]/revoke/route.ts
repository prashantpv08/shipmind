import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse, parseOrganizationId, rejectCrossOriginMutation } from '@/src/platform/bff';
import { PlatformInvitationEtagSchema, PlatformInvitationIdSchema, PlatformInvitationSchema } from '@/src/platform/contracts';
import * as platformSdk from '@/src/platform/generated/sdk.gen';
import { requestPlatform } from '@/src/platform/request';

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; invitationId: string }> }) {
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This revocation request is not allowed.');
  if (originError) return originError;
  const params = await context.params;
  const organizationId = parseOrganizationId(params.organizationId);
  const invitationId = PlatformInvitationIdSchema.safeParse(params.invitationId);
  const ifMatch = PlatformInvitationEtagSchema.safeParse(request.headers.get('if-match'));
  if (!organizationId.success || !invitationId.success) return bffError(404, 'NOT_FOUND', 'Invitation was not found.', requestId);
  if (!ifMatch.success || !ifMatch.data.startsWith(`"${invitationId.data}:`)) return bffError(400, 'INVALID_REQUEST', 'A current invitation ETag is required.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const response = await requestPlatform(
    (client) => platformSdk.revokeOrganizationInvitation({
      client,
      path: { organizationId: organizationId.data, invitationId: invitationId.data },
      headers: { 'If-Match': ifMatch.data },
    }),
    authentication.token,
    requestId,
  );
  if (response.status === 200 && !PlatformInvitationSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected response.', response.requestId);
  return forwardPlatformResponse(response, { etag: true });
}
