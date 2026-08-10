import {
  PlatformBusinessContextMutationResponseSchema,
  PlatformBusinessContextReviewResponseSchema,
  PlatformGenerateBusinessContextRequestSchema,
  PlatformReviewBusinessContextRequestSchema,
} from './contracts';
import {
  authenticateBff,
  bffError,
  bffRequestId,
  forwardPlatformResponse,
  parseIdempotencyKey,
  parseOrganizationProjectIds,
  parseProjectIfMatch,
  rejectCrossOriginMutation,
} from './bff';
import { requestPlatform } from './request';
import * as platformSdk from './generated/sdk.gen';

type BusinessContextAction = 'generate' | 'review';
type BusinessContextRouteContext = { params: Promise<{ organizationId: string; projectId: string }> };

export async function handleBusinessContextMutation(request: Request, context: BusinessContextRouteContext, action: BusinessContextAction) {
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This Business Context request is not allowed.');
  if (originError) return originError;
  const { organizationId, projectId } = parseOrganizationProjectIds(await context.params);
  const idempotencyKey = parseIdempotencyKey(request);
  const ifMatch = parseProjectIfMatch(request);
  const rawBody = await request.json().catch(() => null);
  const body = action === 'generate'
    ? PlatformGenerateBusinessContextRequestSchema.safeParse(rawBody)
    : PlatformReviewBusinessContextRequestSchema.safeParse(rawBody);
  if (!organizationId.success || !projectId.success) return bffError(404, 'NOT_FOUND', 'Project was not found.', requestId);
  if (!idempotencyKey.success || !ifMatch.success || !body.success) return bffError(400, 'INVALID_REQUEST', 'Business Context request is invalid.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const headers = { 'Idempotency-Key': idempotencyKey.data, 'If-Match': ifMatch.data };
  const path = { organizationId: organizationId.data, projectId: projectId.data };
  const response = action === 'generate'
    ? await requestPlatform(
      (client) => platformSdk.generateBusinessContext({ client, path, headers, body: PlatformGenerateBusinessContextRequestSchema.parse(rawBody) }),
      authentication.token,
      requestId,
    )
    : await requestPlatform(
      (client) => platformSdk.reviewBusinessContext({ client, path, headers, body: PlatformReviewBusinessContextRequestSchema.parse(rawBody) }),
      authentication.token,
      requestId,
    );
  const responseSchema = action === 'generate' ? PlatformBusinessContextMutationResponseSchema : PlatformBusinessContextReviewResponseSchema;
  if (response.status === 201 && !responseSchema.safeParse(response.body).success) {
    return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected Business Context response.', response.requestId);
  }
  return forwardPlatformResponse(response, { etag: true, idempotencyReplayed: true });
}
