import 'server-only';

import {
  PlatformBudgetPolicyEtagSchema,
  PlatformBudgetPolicyIdSchema,
  PlatformBudgetPolicySchema,
  PlatformExpiredReservationRecoverySchema,
  PlatformUpdateBudgetPolicyRequestSchema,
} from './contracts';
import {
  authenticateBff,
  bffError,
  bffRequestId,
  forwardPlatformResponse,
  parseIdempotencyKey,
  parseOrganizationId,
  rejectCrossOriginMutation,
} from './bff';
import { requestPlatform } from './request';
import * as platformSdk from './generated/sdk.gen';

type BillingContext = { params: Promise<{ organizationId: string }> };
type PolicyContext = { params: Promise<{ organizationId: string; policyId: string }> };

export async function handleBudgetPolicyUpdate(request: Request, context: PolicyContext) {
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This budget policy request is not allowed.');
  if (originError) return originError;

  const params = await context.params;
  const organizationId = parseOrganizationId(params.organizationId);
  const policyId = PlatformBudgetPolicyIdSchema.safeParse(params.policyId);
  const ifMatch = PlatformBudgetPolicyEtagSchema.safeParse(request.headers.get('if-match'));
  const idempotencyKey = parseIdempotencyKey(request);
  const body = PlatformUpdateBudgetPolicyRequestSchema.safeParse(await request.json().catch(() => null));
  if (!organizationId.success || !policyId.success) {
    return bffError(404, 'NOT_FOUND', 'Budget policy was not found.', requestId);
  }
  if (
    !ifMatch.success
    || !ifMatch.data.startsWith(`"${policyId.data}:`)
    || !idempotencyKey.success
    || !body.success
  ) {
    return bffError(400, 'INVALID_REQUEST', 'Budget policy update is invalid.', requestId);
  }

  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;

  const platformResponse = await requestPlatform(
    (client) => platformSdk.updateBudgetPolicy({
      client,
      path: { organizationId: organizationId.data, policyId: policyId.data },
      headers: { 'Idempotency-Key': idempotencyKey.data, 'If-Match': ifMatch.data },
      body: body.data,
    }),
    authentication.token,
    requestId,
  );
  if (platformResponse.status === 200 && !PlatformBudgetPolicySchema.safeParse(platformResponse.body).success) {
    return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected response.', platformResponse.requestId);
  }
  return forwardPlatformResponse(platformResponse, { etag: true, idempotencyReplayed: true });
}

export async function handleExpiredReservationRecovery(request: Request, context: BillingContext) {
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This reservation recovery request is not allowed.');
  if (originError) return originError;

  const { organizationId: rawOrganizationId } = await context.params;
  const organizationId = parseOrganizationId(rawOrganizationId);
  if (!organizationId.success) {
    return bffError(404, 'NOT_FOUND', 'Organization was not found.', requestId);
  }
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;

  const platformResponse = await requestPlatform(
    (client) => platformSdk.recoverExpiredUsageReservations({ client, path: { organizationId: organizationId.data } }),
    authentication.token,
    requestId,
  );
  if (platformResponse.status === 200 && !PlatformExpiredReservationRecoverySchema.safeParse(platformResponse.body).success) {
    return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected response.', platformResponse.requestId);
  }
  return forwardPlatformResponse(platformResponse);
}
