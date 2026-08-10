import {
  PlatformApproveArchitectureRequestSchema,
  PlatformArchitectureApprovalResponseSchema,
  PlatformArchitectureMutationResponseSchema,
  PlatformGenerateArchitectureRequestSchema,
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

type ArchitectureAction = 'generate' | 'approve';
type ArchitectureContext = { params: Promise<{ organizationId: string; projectId: string }> };

export async function handleArchitectureMutation(request: Request, context: ArchitectureContext, action: ArchitectureAction) {
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This architecture request is not allowed.');
  if (originError) return originError;
  const { organizationId, projectId } = parseOrganizationProjectIds(await context.params);
  const idempotencyKey = parseIdempotencyKey(request);
  const ifMatch = parseProjectIfMatch(request);
  const rawBody = await request.json().catch(() => null);
  const body = action === 'generate'
    ? PlatformGenerateArchitectureRequestSchema.safeParse(rawBody)
    : PlatformApproveArchitectureRequestSchema.safeParse(rawBody);
  if (!organizationId.success || !projectId.success) return bffError(404, 'NOT_FOUND', 'Project was not found.', requestId);
  if (!idempotencyKey.success || !ifMatch.success || !body.success) return bffError(400, 'INVALID_REQUEST', 'Architecture request is invalid.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const headers = { 'Idempotency-Key': idempotencyKey.data, 'If-Match': ifMatch.data };
  const path = { organizationId: organizationId.data, projectId: projectId.data };
  const response = action === 'generate'
    ? await requestPlatform(
      (client) => platformSdk.generateArchitectureOptions({ client, path, headers, body: PlatformGenerateArchitectureRequestSchema.parse(rawBody) }),
      authentication.token,
      requestId,
    )
    : await requestPlatform(
      (client) => platformSdk.approveArchitectureDecision({ client, path, headers, body: PlatformApproveArchitectureRequestSchema.parse(rawBody) }),
      authentication.token,
      requestId,
    );
  if (response.status === 201) {
    const responseSchema = action === 'generate' ? PlatformArchitectureMutationResponseSchema : PlatformArchitectureApprovalResponseSchema;
    const parsed = responseSchema.safeParse(response.body);
    const invalidApproval = parsed.success && action === 'approve' && (parsed.data.baseline.decision === null || parsed.data.baseline.artifacts.length !== 2);
    if (!parsed.success || parsed.data.baseline.generation === null || invalidApproval) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected architecture response.', response.requestId);
  }
  return forwardPlatformResponse(response, { etag: true, idempotencyReplayed: true });
}
