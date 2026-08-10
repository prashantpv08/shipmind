import {
  PlatformAnswerClarificationRequestSchema,
  PlatformClarificationAnswerResponseSchema,
  PlatformClarificationQuestionIdSchema,
} from '@/src/platform/contracts';
import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse, parseIdempotencyKey, parseOrganizationProjectIds, parseProjectIfMatch, rejectCrossOriginMutation } from '@/src/platform/bff';
import * as platformSdk from '@/src/platform/generated/sdk.gen';
import { requestPlatform } from '@/src/platform/request';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; projectId: string; questionId: string }> }) {
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This clarification answer is not allowed.');
  if (originError) return originError;
  const params = await context.params;
  const { organizationId, projectId } = parseOrganizationProjectIds(params);
  const questionId = PlatformClarificationQuestionIdSchema.safeParse(params.questionId);
  if (!organizationId.success || !projectId.success || !questionId.success) return bffError(404, 'NOT_FOUND', 'Project or clarification question was not found.', requestId);
  const ifMatch = parseProjectIfMatch(request);
  const idempotencyKey = parseIdempotencyKey(request);
  const body = PlatformAnswerClarificationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!ifMatch.success || !ifMatch.data.startsWith(`"${projectId.data}:`) || !idempotencyKey.success || !body.success) return bffError(400, 'INVALID_REQUEST', 'A valid answer, current project ETag, and idempotency key are required.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const response = await requestPlatform(
    (client) => platformSdk.answerProjectClarification({
      client,
      path: { organizationId: organizationId.data, projectId: projectId.data, questionId: questionId.data },
      headers: { 'Idempotency-Key': idempotencyKey.data, 'If-Match': ifMatch.data },
      body: body.data,
    }),
    authentication.token,
    requestId,
  );
  if (response.status === 200 && !PlatformClarificationAnswerResponseSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected clarification response.', response.requestId);
  return forwardPlatformResponse(response, { etag: true, idempotencyReplayed: true });
}
