import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse, parseIdempotencyKey, parseOrganizationProjectIds, rejectCrossOriginMutation } from '@/src/platform/bff';
import { PlatformSourceListSchema, PlatformSourceSchema, PlatformUploadSourceRequestSchema } from '@/src/platform/contracts';
import * as platformSdk from '@/src/platform/generated/sdk.gen';
import { requestPlatform } from '@/src/platform/request';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; projectId: string }> }) {
  const requestId = bffRequestId(request);
  const parsed = parseOrganizationProjectIds(await context.params);
  if (!parsed.organizationId.success || !parsed.projectId.success) return bffError(404, 'NOT_FOUND', 'Project was not found.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const path = { organizationId: parsed.organizationId.data, projectId: parsed.projectId.data };
  const response = await requestPlatform(
    (client) => platformSdk.listProjectSources({ client, path }),
    authentication.token,
    requestId,
  );
  if (response.status === 200 && !PlatformSourceListSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected source list.', response.requestId);
  return forwardPlatformResponse(response);
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; projectId: string }> }) {
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This source upload is not allowed.');
  if (originError) return originError;
  const parsed = parseOrganizationProjectIds(await context.params);
  const idempotencyKey = parseIdempotencyKey(request);
  const body = PlatformUploadSourceRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.organizationId.success || !parsed.projectId.success) return bffError(404, 'NOT_FOUND', 'Project was not found.', requestId);
  if (!idempotencyKey.success || !body.success) return bffError(400, 'INVALID_REQUEST', 'Source upload request is invalid.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const path = { organizationId: parsed.organizationId.data, projectId: parsed.projectId.data };
  const response = await requestPlatform(
    (client) => platformSdk.uploadProjectSource({
      client,
      path,
      headers: { 'Idempotency-Key': idempotencyKey.data },
      body: body.data,
    }),
    authentication.token,
    requestId,
  );
  if (response.status === 201 && !PlatformSourceSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected source.', response.requestId);
  return forwardPlatformResponse(response, { idempotencyReplayed: true });
}
