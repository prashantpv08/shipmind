import 'server-only';

import { NextResponse } from 'next/server';

import {
  OrganizationIdSchema,
  PlatformProjectEtagSchema,
  PlatformProjectIdSchema,
  PlatformProjectSchema,
} from './contracts';
import { isSameOriginMutation } from './local-session';
import { requestPlatform, safeRequestId } from './request';
import { currentSessionToken } from './session';

export async function handleProjectLifecycleMutation(
  request: Request,
  context: { params: Promise<{ organizationId: string; projectId: string }> },
  action: 'archive' | 'restore',
): Promise<NextResponse> {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'This project lifecycle request is not allowed.' } },
      { status: 403, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } },
    );
  }

  const params = await context.params;
  const organizationId = OrganizationIdSchema.safeParse(params.organizationId);
  const projectId = PlatformProjectIdSchema.safeParse(params.projectId);
  const ifMatch = PlatformProjectEtagSchema.safeParse(request.headers.get('if-match'));

  if (!organizationId.success || !projectId.success) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Project was not found.' } },
      { status: 404, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } },
    );
  }
  if (!ifMatch.success || !ifMatch.data.startsWith(`"${projectId.data}:`)) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'A current project ETag is required.' } },
      { status: 400, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } },
    );
  }

  const token = await currentSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } },
      { status: 401, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } },
    );
  }

  const platformResponse = await requestPlatform(
    `/api/v1/organizations/${encodeURIComponent(organizationId.data)}/projects/${encodeURIComponent(projectId.data)}/${action}`,
    token,
    requestId,
    { method: 'POST', ifMatch: ifMatch.data },
  );
  if (platformResponse.status === 200 && !PlatformProjectSchema.safeParse(platformResponse.body).success) {
    return NextResponse.json(
      { error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an unexpected response.' } },
      { status: 502, headers: { 'cache-control': 'no-store', 'x-request-id': platformResponse.requestId } },
    );
  }

  const headers: Record<string, string> = {
    'cache-control': 'no-store',
    'x-request-id': platformResponse.requestId,
  };
  if (platformResponse.etag !== null) headers.etag = platformResponse.etag;
  return NextResponse.json(platformResponse.body, { status: platformResponse.status, headers });
}
