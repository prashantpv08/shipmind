import {
  PlatformEngineeringPlanPreviewSchema,
  PlatformGenerateEngineeringPlanRequestSchema,
} from '@/src/platform/contracts';
import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse, parseIdempotencyKey, parseOrganizationProjectIds, rejectCrossOriginMutation } from '@/src/platform/bff';
import * as platformSdk from '@/src/platform/generated/sdk.gen';
import { requestPlatform } from '@/src/platform/request';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; projectId: string }> }) {
  const requestId = bffRequestId(request);
  const { organizationId, projectId } = parseOrganizationProjectIds(await context.params);
  if (!organizationId.success || !projectId.success) return bffError(404, 'NOT_FOUND', 'Engineering Plan was not found.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const response = await requestPlatform(
    (client) => platformSdk.getLatestEngineeringPlan({ client, path: { organizationId: organizationId.data, projectId: projectId.data } }),
    authentication.token,
    requestId,
  );
  if (response.status === 200 && !PlatformEngineeringPlanPreviewSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected Engineering Plan.', response.requestId);
  return forwardPlatformResponse(response);
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; projectId: string }> }) {
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This Engineering Plan request is not allowed.');
  if (originError) return originError;
  const { organizationId, projectId } = parseOrganizationProjectIds(await context.params);
  const idempotencyKey = parseIdempotencyKey(request);
  const body = PlatformGenerateEngineeringPlanRequestSchema.safeParse(await request.json().catch(() => null));
  if (!organizationId.success || !projectId.success) return bffError(404, 'NOT_FOUND', 'Project was not found.', requestId);
  if (!idempotencyKey.success || !body.success) return bffError(400, 'INVALID_REQUEST', 'Engineering Plan request is invalid.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const response = await requestPlatform(
    (client) => platformSdk.generateEngineeringPlan({
      client,
      path: { organizationId: organizationId.data, projectId: projectId.data },
      headers: { 'Idempotency-Key': idempotencyKey.data },
      body: body.data,
    }),
    authentication.token,
    requestId,
  );
  if (response.status === 201 && !PlatformEngineeringPlanPreviewSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected Engineering Plan.', response.requestId);
  return forwardPlatformResponse(response, { etag: true, idempotencyReplayed: true });
}
