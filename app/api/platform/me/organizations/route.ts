import { NextResponse } from 'next/server';

import { CurrentUserOrganizationsSchema } from '@/src/platform/contracts';
import { requestPlatform, safeRequestId } from '@/src/platform/request';
import { currentSessionToken } from '@/src/platform/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  const token = await currentSessionToken();

  if (!token) {
    return NextResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } },
      { status: 401, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } },
    );
  }

  const platformResponse = await requestPlatform('/api/v1/me/organizations', token, requestId);

  if (platformResponse.status === 200 && !CurrentUserOrganizationsSchema.safeParse(platformResponse.body).success) {
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
