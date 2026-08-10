import {
  PlatformApproveArtifactsRequestSchema,
  PlatformArtifactApprovalResponseSchema,
  PlatformArtifactGenerationResponseSchema,
  PlatformGenerateArtifactsRequestSchema,
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

type ArtifactAction = 'generate' | 'approve';
type ArtifactContext = { params: Promise<{ organizationId: string; projectId: string }> };

export async function handleArtifactMutation(request: Request, context: ArtifactContext, action: ArtifactAction) {
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This artifact request is not allowed.');
  if (originError) return originError;
  const { organizationId, projectId } = parseOrganizationProjectIds(await context.params);
  const idempotencyKey = parseIdempotencyKey(request);
  const ifMatch = parseProjectIfMatch(request);
  const rawBody = await request.json().catch(() => null);
  const body = action === 'generate'
    ? PlatformGenerateArtifactsRequestSchema.safeParse(rawBody)
    : PlatformApproveArtifactsRequestSchema.safeParse(rawBody);
  if (!organizationId.success || !projectId.success) return bffError(404, 'NOT_FOUND', 'Project was not found.', requestId);
  if (!idempotencyKey.success || !ifMatch.success || !body.success) return bffError(400, 'INVALID_REQUEST', 'Artifact request is invalid.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const headers = { 'Idempotency-Key': idempotencyKey.data, 'If-Match': ifMatch.data };
  const path = { organizationId: organizationId.data, projectId: projectId.data };
  const response = action === 'generate'
    ? await requestPlatform(
      (client) => platformSdk.generateRequirementBaseline({ client, path, headers, body: PlatformGenerateArtifactsRequestSchema.parse(rawBody) }),
      authentication.token,
      requestId,
    )
    : await requestPlatform(
      (client) => platformSdk.approveRequirementBaseline({ client, path, headers, body: PlatformApproveArtifactsRequestSchema.parse(rawBody) }),
      authentication.token,
      requestId,
    );
  const responseSchema = action === 'generate' ? PlatformArtifactGenerationResponseSchema : PlatformArtifactApprovalResponseSchema;
  if (response.status === 201 && !responseSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected artifact response.', response.requestId);
  return forwardPlatformResponse(response, { etag: true, idempotencyReplayed: true });
}
