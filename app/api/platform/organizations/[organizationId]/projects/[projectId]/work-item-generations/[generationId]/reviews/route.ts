import { NextResponse } from 'next/server';

import {
  OrganizationIdSchema,
  PlatformIdempotencyKeySchema,
  PlatformProjectIdSchema,
  PlatformSubmitWorkItemReviewRequestSchema,
  PlatformWorkItemGenerationIdSchema,
  PlatformWorkItemGenerationPreviewSchema,
  PlatformWorkItemReviewEtagSchema,
} from '@/src/platform/contracts';
import { isSameOriginMutation } from '@/src/platform/local-session';
import { requestPlatform, safeRequestId } from '@/src/platform/request';
import { currentSessionToken } from '@/src/platform/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; projectId: string; generationId: string }> }) {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'This backlog review request is not allowed.' } }, { status: 403, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const params = await context.params;
  const organizationId = OrganizationIdSchema.safeParse(params.organizationId);
  const projectId = PlatformProjectIdSchema.safeParse(params.projectId);
  const generationId = PlatformWorkItemGenerationIdSchema.safeParse(params.generationId);
  const idempotencyKey = PlatformIdempotencyKeySchema.safeParse(request.headers.get('idempotency-key'));
  const ifMatch = PlatformWorkItemReviewEtagSchema.safeParse(request.headers.get('if-match'));
  const body = PlatformSubmitWorkItemReviewRequestSchema.safeParse(await request.json().catch(() => null));
  if (!organizationId.success || !projectId.success || !generationId.success) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Work-item generation was not found.' } }, { status: 404, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  if (!idempotencyKey.success || !ifMatch.success || !ifMatch.data.startsWith(`"${generationId.data}:`) || !body.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Backlog review request is invalid.' } }, { status: 400, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const token = await currentSessionToken();
  if (!token) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } }, { status: 401, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const response = await requestPlatform(`/api/v1/organizations/${encodeURIComponent(organizationId.data)}/projects/${encodeURIComponent(projectId.data)}/work-item-generations/${encodeURIComponent(generationId.data)}/reviews`, token, requestId, { method: 'POST', body: body.data, idempotencyKey: idempotencyKey.data, ifMatch: ifMatch.data });
  if (response.status === 201 && !PlatformWorkItemGenerationPreviewSchema.safeParse(response.body).success) return NextResponse.json({ error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an unexpected response.' } }, { status: 502, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } });
  const headers: Record<string, string> = { 'cache-control': 'no-store', 'x-request-id': response.requestId };
  if (response.etag) headers.etag = response.etag;
  if (response.idempotencyReplayed) headers['idempotency-replayed'] = response.idempotencyReplayed;
  return NextResponse.json(response.body, { status: response.status, headers });
}
