import { NextResponse } from 'next/server';

import { OrganizationIdSchema, PlatformProjectIdSchema, PlatformProjectSchema } from '@/src/platform/contracts';
import { requestPlatform, safeRequestId } from '@/src/platform/request';
import { currentSessionToken } from '@/src/platform/session';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ organizationId: string; projectId: string }> },
): Promise<NextResponse> {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  const params = await context.params;
  const organizationId = OrganizationIdSchema.safeParse(params.organizationId);
  const projectId = PlatformProjectIdSchema.safeParse(params.projectId);

  if (!organizationId.success || !projectId.success) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Project was not found.' } },
      { status: 404, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } },
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
    `/api/v1/organizations/${encodeURIComponent(organizationId.data)}/projects/${encodeURIComponent(projectId.data)}`,
    token,
    requestId,
  );

  if (platformResponse.status === 200 && !PlatformProjectSchema.safeParse(platformResponse.body).success) {
    return NextResponse.json(
      { error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an unexpected response.' } },
      { status: 502, headers: { 'cache-control': 'no-store', 'x-request-id': platformResponse.requestId } },
    );
  }

  return NextResponse.json(platformResponse.body, {
    status: platformResponse.status,
    headers: { 'cache-control': 'no-store', 'x-request-id': platformResponse.requestId },
  });
}
