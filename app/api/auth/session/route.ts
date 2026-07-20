import { NextResponse } from 'next/server';

import { isSameOriginMutation } from '@/src/platform/local-session';
import { LOCAL_SESSION_COOKIE, PRODUCTION_SESSION_COOKIE } from '@/src/platform/session';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'This session request is not allowed.' } },
      { status: 403 },
    );
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(LOCAL_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: false,
    path: '/',
    maxAge: 0,
  });
  response.cookies.set(PRODUCTION_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 0,
  });
  response.headers.set('cache-control', 'no-store');
  return response;
}
