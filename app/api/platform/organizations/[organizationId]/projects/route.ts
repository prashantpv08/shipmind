import {
  PlatformCreateProjectRequestSchema,
  PlatformProjectListQuerySchema,
  PlatformProjectListSchema,
  PlatformProjectSchema,
} from '@/src/platform/contracts';
import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse, parseIdempotencyKey, parseOrganizationId, rejectCrossOriginMutation } from '@/src/platform/bff';
import * as platformSdk from '@/src/platform/generated/sdk.gen';
import { requestPlatform } from '@/src/platform/request';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
){
  const requestId = bffRequestId(request);
  const { organizationId: rawOrganizationId } = await context.params;
  const organizationId = parseOrganizationId(rawOrganizationId);
  const query = PlatformProjectListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));

  if (!organizationId.success) {
    return bffError(404, 'NOT_FOUND', 'Organization was not found.', requestId);
  }
  if (!query.success) {
    return bffError(400, 'INVALID_REQUEST', 'Project list query is invalid.', requestId);
  }

  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;

  const platformResponse = await requestPlatform(
    (client) => platformSdk.listProjects({ client, path: { organizationId: organizationId.data }, query: query.data }),
    authentication.token,
    requestId,
  );

  if (platformResponse.status === 200 && !PlatformProjectListSchema.safeParse(platformResponse.body).success) {
    return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected response.', platformResponse.requestId);
  }
  return forwardPlatformResponse(platformResponse);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
){
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This project creation request is not allowed.');
  if (originError) return originError;

  const { organizationId: rawOrganizationId } = await context.params;
  const organizationId = parseOrganizationId(rawOrganizationId);
  const idempotencyKey = parseIdempotencyKey(request);
  const body = await request.json().catch(() => null);
  const creation = PlatformCreateProjectRequestSchema.safeParse(body);

  if (!organizationId.success) {
    return bffError(404, 'NOT_FOUND', 'Organization was not found.', requestId);
  }
  if (!idempotencyKey.success || !creation.success) {
    return bffError(400, 'INVALID_REQUEST', 'Project creation request is invalid.', requestId);
  }

  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;

  const platformResponse = await requestPlatform(
    (client) => platformSdk.createProject({
      client,
      path: { organizationId: organizationId.data },
      headers: { 'Idempotency-Key': idempotencyKey.data },
      body: creation.data,
    }),
    authentication.token,
    requestId,
  );

  if (platformResponse.status === 201 && !PlatformProjectSchema.safeParse(platformResponse.body).success) {
    return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected response.', platformResponse.requestId);
  }
  return forwardPlatformResponse(platformResponse, { etag: true, idempotencyReplayed: 'boolean-value' });
}
