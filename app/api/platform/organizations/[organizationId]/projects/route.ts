import { NextResponse } from 'next/server';

import {
  OrganizationIdSchema,
  PlatformProjectListQuerySchema,
  PlatformProjectListSchema,
} from '@/src/platform/contracts';
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
  const query = PlatformProjectListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));

  if (!organizationId.success) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Organization was not found.' } },
      { status: 404, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } },
    );
  }
  if (!query.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Project list query is invalid.' } },
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

  const search = new URLSearchParams({ limit: String(query.data.limit) });
  if (query.data.cursor !== undefined) search.set('cursor', query.data.cursor);
  if (query.data.workspaceId !== undefined) search.set('workspaceId', query.data.workspaceId);
  const platformResponse = await requestPlatform(
    `/api/v1/organizations/${encodeURIComponent(organizationId.data)}/projects?${search.toString()}`,
    token,
    requestId,
  );

  if (platformResponse.status === 200 && !PlatformProjectListSchema.safeParse(platformResponse.body).success) {
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
