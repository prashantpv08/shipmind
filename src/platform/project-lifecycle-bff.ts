import 'server-only';

import { PlatformProjectSchema } from './contracts';
import {
  authenticateBff,
  bffError,
  bffRequestId,
  forwardPlatformResponse,
  parseOrganizationProjectIds,
  parseProjectIfMatch,
  rejectCrossOriginMutation,
} from './bff';
import { requestPlatform } from './request';
import * as platformSdk from './generated/sdk.gen';

export async function handleProjectLifecycleMutation(
  request: Request,
  context: { params: Promise<{ organizationId: string; projectId: string }> },
  action: 'archive' | 'restore',
){
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This project lifecycle request is not allowed.');
  if (originError) return originError;

  const { organizationId, projectId } = parseOrganizationProjectIds(await context.params);
  const ifMatch = parseProjectIfMatch(request);

  if (!organizationId.success || !projectId.success) {
    return bffError(404, 'NOT_FOUND', 'Project was not found.', requestId);
  }
  if (!ifMatch.success || !ifMatch.data.startsWith(`"${projectId.data}:`)) {
    return bffError(400, 'INVALID_REQUEST', 'A current project ETag is required.', requestId);
  }

  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;

  const path = { organizationId: organizationId.data, projectId: projectId.data };
  const headers = { 'If-Match': ifMatch.data };
  const platformResponse = action === 'archive'
    ? await requestPlatform((client) => platformSdk.archiveProject({ client, path, headers }), authentication.token, requestId)
    : await requestPlatform((client) => platformSdk.restoreProject({ client, path, headers }), authentication.token, requestId);
  if (platformResponse.status === 200 && !PlatformProjectSchema.safeParse(platformResponse.body).success) {
    return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected response.', platformResponse.requestId);
  }
  return forwardPlatformResponse(platformResponse, { etag: true });
}
