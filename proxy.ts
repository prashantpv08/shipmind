import { type NextRequest, NextResponse } from 'next/server';

import { decideLegacyRoute } from '@/src/legacy/route-policy';

export function proxy(request: NextRequest): NextResponse {
  const decision = decideLegacyRoute(request);

  if (decision === 'ALLOW') return NextResponse.next();
  if (decision === 'REDIRECT_ACCOUNT') {
    const response = NextResponse.redirect(new URL('/account', request.url), 307);
    response.headers.set('cache-control', 'no-store');
    return response;
  }

  return new NextResponse(null, {
    status: 404,
    headers: { 'cache-control': 'no-store' },
  });
}

export const config = {
  matcher: ['/', '/prototype/:path*', '/api/:path*'],
};
