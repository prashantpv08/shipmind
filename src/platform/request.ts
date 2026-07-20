import 'server-only';

import { platformBaseUrl } from './config';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

export type PlatformResponse = {
  status: number;
  body: unknown;
  requestId: string;
};

export function safeRequestId(value: string | null): string {
  return value && REQUEST_ID_PATTERN.test(value) ? value : crypto.randomUUID();
}

export async function requestPlatform(
  path: `/api/v1/${string}`,
  token: string,
  requestId = crypto.randomUUID(),
): Promise<PlatformResponse> {
  const safeId = safeRequestId(requestId);

  try {
    const response = await fetch(new URL(path, platformBaseUrl()), {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
        'x-request-id': safeId,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    const body = await response.json().catch(() => ({
      error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an invalid response.' },
    }));

    return {
      status: response.status,
      body,
      requestId: safeRequestId(response.headers.get('x-request-id')),
    };
  } catch {
    return {
      status: 503,
      body: { error: { code: 'PLATFORM_UNAVAILABLE', message: 'The platform service is unavailable.' } },
      requestId: safeId,
    };
  }
}
