import 'server-only';

import { platformBaseUrl } from './config';
import { createClient, type Client } from './generated/client';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

export type PlatformResponse = {
  status: number;
  body: unknown;
  requestId: string;
  etag: string | null;
  idempotencyReplayed: string | null;
};

type GeneratedOperationResult = {
  data?: unknown;
  error?: unknown;
  response?: Response;
};

export type PlatformOperation = (client: Client) => Promise<GeneratedOperationResult>;

export function safeRequestId(value: string | null): string {
  return value && REQUEST_ID_PATTERN.test(value) ? value : crypto.randomUUID();
}

export async function requestPlatform(
  operation: PlatformOperation,
  token: string,
  requestId = crypto.randomUUID(),
): Promise<PlatformResponse> {
  const safeId = safeRequestId(requestId);

  try {
    const client = createClient({
      baseUrl: platformBaseUrl().origin,
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
        'x-request-id': safeId,
      },
      responseStyle: 'fields',
      throwOnError: false,
      fetch: (input, init) => fetch(input, {
        ...init,
        cache: 'no-store',
        signal: AbortSignal.timeout(5_000),
      }),
    });
    const result = await operation(client);
    const response = result.response;
    if (!response) throw new Error('The generated platform client did not receive a response.');
    const body = result.data ?? result.error ?? {
      error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an invalid response.' },
    };

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
