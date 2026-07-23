import { NextResponse } from 'next/server';

import { OrganizationIdSchema, PlatformBillingOverviewSchema } from '@/src/platform/contracts';
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
  if (!organizationId.success) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Organization was not found.' } },
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

  const response = await requestPlatform(
    `/api/v1/organizations/${encodeURIComponent(organizationId.data)}/billing/overview`,
    token,
    requestId,
  );
  if (response.status === 200 && !PlatformBillingOverviewSchema.safeParse(response.body).success) {
    return NextResponse.json(
      { error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an unexpected response.' } },
      { status: 502, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } },
    );
  }
  return NextResponse.json(response.body, {
    status: response.status,
    headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId },
  });
}
