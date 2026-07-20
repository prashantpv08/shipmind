import { NextResponse } from 'next/server';

import { OrganizationIdSchema, PlatformWorkspaceListSchema } from '@/src/platform/contracts';
import { requestPlatform, safeRequestId } from '@/src/platform/request';
import { currentSessionToken } from '@/src/platform/session';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ organizationId: string }> },
): Promise<NextResponse> {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  const { organizationId: rawOrganizationId } = await context.params;
  const organizationId = OrganizationIdSchema.safeParse(rawOrganizationId);
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');

  if (!organizationId.success || (cursor !== null && (cursor.length < 1 || cursor.length > 512))) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Workspace list request is invalid.' } },
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

  const query = new URLSearchParams({ limit: '100' });
  if (cursor !== null) query.set('cursor', cursor);
  const platformResponse = await requestPlatform(
    `/api/v1/organizations/${encodeURIComponent(organizationId.data)}/workspaces?${query.toString()}`,
    token,
    requestId,
  );

  if (platformResponse.status === 200 && !PlatformWorkspaceListSchema.safeParse(platformResponse.body).success) {
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
