import {
  PlatformSubmitWorkItemReviewRequestSchema,
  PlatformWorkItemGenerationIdSchema,
  PlatformWorkItemGenerationPreviewSchema,
  PlatformWorkItemReviewEtagSchema,
} from '@/src/platform/contracts';
import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse, parseIdempotencyKey, parseOrganizationProjectIds, rejectCrossOriginMutation } from '@/src/platform/bff';
import * as platformSdk from '@/src/platform/generated/sdk.gen';
import { requestPlatform } from '@/src/platform/request';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; projectId: string; generationId: string }> }) {
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This backlog review request is not allowed.');
  if (originError) return originError;
  const params = await context.params;
  const { organizationId, projectId } = parseOrganizationProjectIds(params);
  const generationId = PlatformWorkItemGenerationIdSchema.safeParse(params.generationId);
  const idempotencyKey = parseIdempotencyKey(request);
  const ifMatch = PlatformWorkItemReviewEtagSchema.safeParse(request.headers.get('if-match'));
  const body = PlatformSubmitWorkItemReviewRequestSchema.safeParse(await request.json().catch(() => null));
  if (!organizationId.success || !projectId.success || !generationId.success) return bffError(404, 'NOT_FOUND', 'Work-item generation was not found.', requestId);
  if (!idempotencyKey.success || !ifMatch.success || !ifMatch.data.startsWith(`"${generationId.data}:`) || !body.success) return bffError(400, 'INVALID_REQUEST', 'Backlog review request is invalid.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const response = await requestPlatform(
    (client) => platformSdk.submitWorkItemReview({
      client,
      path: { organizationId: organizationId.data, projectId: projectId.data, generationId: generationId.data },
      headers: { 'Idempotency-Key': idempotencyKey.data, 'If-Match': ifMatch.data },
      body: body.data,
    }),
    authentication.token,
    requestId,
  );
  if (response.status === 201 && !PlatformWorkItemGenerationPreviewSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected response.', response.requestId);
  return forwardPlatformResponse(response, { etag: true, idempotencyReplayed: true });
}
