import 'server-only';

import { platformBaseUrl } from './config';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

export type PlatformResponse = {
  status: number;
  body: unknown;
  requestId: string;
  etag: string | null;
  idempotencyReplayed: string | null;
};

export type PlatformRequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  idempotencyKey?: string;
};

export function safeRequestId(value: string | null): string {
  return value && REQUEST_ID_PATTERN.test(value) ? value : crypto.randomUUID();
}

export async function requestPlatform(
  path: `/api/v1/${string}`,
  token: string,
  requestId = crypto.randomUUID(),
  options: PlatformRequestOptions = {},
): Promise<PlatformResponse> {
  const safeId = safeRequestId(requestId);

  try {
    const headers: Record<string, string> = {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      'x-request-id': safeId,
    };
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (options.idempotencyKey !== undefined) headers['idempotency-key'] = options.idempotencyKey;
    const response = await fetch(new URL(path, platformBaseUrl()), {
      method: options.method ?? 'GET',
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
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
      etag: response.headers.get('etag'),
      idempotencyReplayed: response.headers.get('idempotency-replayed'),
    };
  } catch {
    return {
      status: 503,
      body: { error: { code: 'PLATFORM_UNAVAILABLE', message: 'The platform service is unavailable.' } },
      requestId: safeId,
      etag: null,
      idempotencyReplayed: null,
    };
  }
}
