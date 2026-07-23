import 'server-only';

import { NextResponse } from 'next/server';

import {
  OrganizationIdSchema,
  PlatformBudgetPolicyEtagSchema,
  PlatformBudgetPolicyIdSchema,
  PlatformBudgetPolicySchema,
  PlatformExpiredReservationRecoverySchema,
  PlatformIdempotencyKeySchema,
  PlatformUpdateBudgetPolicyRequestSchema,
} from './contracts';
import { isSameOriginMutation } from './local-session';
import { requestPlatform, safeRequestId } from './request';
import { currentSessionToken } from './session';

type BillingContext = { params: Promise<{ organizationId: string }> };
type PolicyContext = { params: Promise<{ organizationId: string; policyId: string }> };

function response(body: unknown, status: number, requestId: string, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { 'cache-control': 'no-store', 'x-request-id': requestId, ...extraHeaders },
  });
}

export async function handleBudgetPolicyUpdate(request: Request, context: PolicyContext): Promise<NextResponse> {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  if (!isSameOriginMutation(request)) {
    return response({ error: { code: 'FORBIDDEN', message: 'This budget policy request is not allowed.' } }, 403, requestId);
  }

  const params = await context.params;
  const organizationId = OrganizationIdSchema.safeParse(params.organizationId);
  const policyId = PlatformBudgetPolicyIdSchema.safeParse(params.policyId);
  const ifMatch = PlatformBudgetPolicyEtagSchema.safeParse(request.headers.get('if-match'));
  const idempotencyKey = PlatformIdempotencyKeySchema.safeParse(request.headers.get('idempotency-key'));
  const body = PlatformUpdateBudgetPolicyRequestSchema.safeParse(await request.json().catch(() => null));
  if (!organizationId.success || !policyId.success) {
    return response({ error: { code: 'NOT_FOUND', message: 'Budget policy was not found.' } }, 404, requestId);
  }
  if (
    !ifMatch.success
    || !ifMatch.data.startsWith(`"${policyId.data}:`)
    || !idempotencyKey.success
    || !body.success
  ) {
    return response({ error: { code: 'INVALID_REQUEST', message: 'Budget policy update is invalid.' } }, 400, requestId);
  }

  const token = await currentSessionToken();
  if (!token) {
    return response({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } }, 401, requestId);
  }

  const platformResponse = await requestPlatform(
    `/api/v1/organizations/${encodeURIComponent(organizationId.data)}/billing/policy/${encodeURIComponent(policyId.data)}`,
    token,
    requestId,
    {
      method: 'POST',
      body: body.data,
      ifMatch: ifMatch.data,
      idempotencyKey: idempotencyKey.data,
    },
  );
  if (platformResponse.status === 200 && !PlatformBudgetPolicySchema.safeParse(platformResponse.body).success) {
    return response({ error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an unexpected response.' } }, 502, platformResponse.requestId);
  }
  const headers: Record<string, string> = {};
  if (platformResponse.etag !== null) headers.etag = platformResponse.etag;
  if (platformResponse.idempotencyReplayed !== null) headers['idempotency-replayed'] = platformResponse.idempotencyReplayed;
  return response(platformResponse.body, platformResponse.status, platformResponse.requestId, headers);
}

export async function handleExpiredReservationRecovery(request: Request, context: BillingContext): Promise<NextResponse> {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  if (!isSameOriginMutation(request)) {
    return response({ error: { code: 'FORBIDDEN', message: 'This reservation recovery request is not allowed.' } }, 403, requestId);
  }

  const { organizationId: rawOrganizationId } = await context.params;
  const organizationId = OrganizationIdSchema.safeParse(rawOrganizationId);
  if (!organizationId.success) {
    return response({ error: { code: 'NOT_FOUND', message: 'Organization was not found.' } }, 404, requestId);
  }
  const token = await currentSessionToken();
  if (!token) {
    return response({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } }, 401, requestId);
  }

  const platformResponse = await requestPlatform(
    `/api/v1/organizations/${encodeURIComponent(organizationId.data)}/billing/reservations/recover-expired`,
    token,
    requestId,
    { method: 'POST' },
  );
  if (platformResponse.status === 200 && !PlatformExpiredReservationRecoverySchema.safeParse(platformResponse.body).success) {
    return response({ error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an unexpected response.' } }, 502, platformResponse.requestId);
  }
  return response(platformResponse.body, platformResponse.status, platformResponse.requestId);
}
