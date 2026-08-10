import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse, parseIdempotencyKey, parseOrganizationProjectIds, rejectCrossOriginMutation } from '@/src/platform/bff';
import { PlatformAnalysisRunSchema, PlatformCreateAnalysisRunRequestSchema, PlatformLatestAnalysisRunSchema } from '@/src/platform/contracts';
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
    (client) => platformSdk.getLatestProjectAnalysisRun({ client, path }),
    authentication.token,
    requestId,
  );
  if (response.status === 200 && !PlatformLatestAnalysisRunSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected analysis state.', response.requestId);
  return forwardPlatformResponse(response);
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; projectId: string }> }) {
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This analysis request is not allowed.');
  if (originError) return originError;
  const parsed = parseOrganizationProjectIds(await context.params);
  const idempotencyKey = parseIdempotencyKey(request);
  const body = PlatformCreateAnalysisRunRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.organizationId.success || !parsed.projectId.success) return bffError(404, 'NOT_FOUND', 'Project was not found.', requestId);
  if (!idempotencyKey.success || !body.success) return bffError(400, 'INVALID_REQUEST', 'Analysis request is invalid.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const path = { organizationId: parsed.organizationId.data, projectId: parsed.projectId.data };
  const response = await requestPlatform(
    (client) => platformSdk.queueProjectAnalysis({
      client,
      path,
      headers: { 'Idempotency-Key': idempotencyKey.data },
      body: body.data,
    }),
    authentication.token,
    requestId,
  );
  if (response.status === 202 && !PlatformAnalysisRunSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected analysis run.', response.requestId);
  return forwardPlatformResponse(response, { idempotencyReplayed: true });
}
