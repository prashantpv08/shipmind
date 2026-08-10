import 'server-only';

import { NextResponse } from 'next/server';

import {
  OrganizationIdSchema,
  PlatformIdempotencyKeySchema,
  PlatformProjectEtagSchema,
  PlatformProjectIdSchema,
} from './contracts';
import { isSameOriginMutation } from './local-session';
import { safeRequestId, type PlatformResponse } from './request';
import { currentSessionToken } from './session';

type ForwardedPlatformHeaders = {
  etag?: boolean;
  idempotencyReplayed?: boolean | 'boolean-value';
};

export function bffRequestId(request: Request): string {
  return safeRequestId(request.headers.get('x-request-id'));
}

export function bffJson(
  body: unknown,
  status: number,
  requestId: string,
  extraHeaders: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'cache-control': 'no-store', 'x-request-id': requestId, ...extraHeaders },
  });
}

export function bffError(status: number, code: string, message: string, requestId: string): NextResponse {
  return bffJson({ error: { code, message } }, status, requestId);
}

export function forwardPlatformResponse(
  response: PlatformResponse,
  headers: ForwardedPlatformHeaders = {},
): NextResponse {
  const forwarded: Record<string, string> = {};
  if (headers.etag && response.etag) forwarded.etag = response.etag;
  const replayed = response.idempotencyReplayed;
  if (headers.idempotencyReplayed === 'boolean-value' && (replayed === 'true' || replayed === 'false')) {
    forwarded['idempotency-replayed'] = replayed;
  } else if (headers.idempotencyReplayed === true && replayed) {
    forwarded['idempotency-replayed'] = replayed;
  }
  return bffJson(response.body, response.status, response.requestId, forwarded);
}

export function rejectCrossOriginMutation(
  request: Request,
  requestId: string,
  message: string,
): NextResponse | null {
  return isSameOriginMutation(request) ? null : bffError(403, 'FORBIDDEN', message, requestId);
}

export async function authenticateBff(requestId: string): Promise<
  | { success: true; token: string }
  | { success: false; response: NextResponse }
> {
  const token = await currentSessionToken();
  return token
    ? { success: true, token }
    : { success: false, response: bffError(401, 'UNAUTHENTICATED', 'Authentication is required.', requestId) };
}

export function parseOrganizationId(value: string) {
  return OrganizationIdSchema.safeParse(value);
}

export function parseOrganizationProjectIds(params: { organizationId: string; projectId: string }) {
  return {
    organizationId: parseOrganizationId(params.organizationId),
    projectId: PlatformProjectIdSchema.safeParse(params.projectId),
  };
}

export function parseIdempotencyKey(request: Request) {
  return PlatformIdempotencyKeySchema.safeParse(request.headers.get('idempotency-key'));
}

export function parseProjectIfMatch(request: Request) {
  return PlatformProjectEtagSchema.safeParse(request.headers.get('if-match'));
}
