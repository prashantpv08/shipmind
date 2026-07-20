import { NextResponse } from 'next/server';

import { localAuthenticationEnabled } from '@/src/platform/config';
import { isLoopbackRequest, isSameOriginMutation, readLocalSessionToken } from '@/src/platform/local-session';
import { LOCAL_SESSION_COOKIE } from '@/src/platform/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  if (!localAuthenticationEnabled()) {
    return NextResponse.json(
      { error: { code: 'LOCAL_AUTH_DISABLED', message: 'Local authentication is disabled.' } },
      { status: 404 },
    );
  }

  if (!isLoopbackRequest(request) || !isSameOriginMutation(request)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'This local authentication request is not allowed.' } },
      { status: 403 },
    );
  }

  try {
    const token = await readLocalSessionToken();
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(LOCAL_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: false,
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    response.headers.set('cache-control', 'no-store');
    return response;
  } catch {
    return NextResponse.json(
      { error: { code: 'LOCAL_SESSION_UNAVAILABLE', message: 'The local session could not be installed.' } },
      { status: 503 },
    );
  }
}
