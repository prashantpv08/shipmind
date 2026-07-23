import { NextResponse } from 'next/server';
import { OrganizationIdSchema, PlatformCreateInvitationRequestSchema, PlatformCreateInvitationResponseSchema, PlatformGovernanceListQuerySchema, PlatformIdempotencyKeySchema, PlatformInvitationListSchema } from '@/src/platform/contracts';
import { isSameOriginMutation } from '@/src/platform/local-session';
import { requestPlatform, safeRequestId } from '@/src/platform/request';
import { currentSessionToken } from '@/src/platform/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  const { organizationId: rawId } = await context.params;
  const organizationId = OrganizationIdSchema.safeParse(rawId);
  const query = PlatformGovernanceListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!organizationId.success) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Organization was not found.' } }, { status: 404, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  if (!query.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Invitation list query is invalid.' } }, { status: 400, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const token = await currentSessionToken();
  if (!token) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } }, { status: 401, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const search = new URLSearchParams({ limit: String(query.data.limit) });
  if (query.data.cursor) search.set('cursor', query.data.cursor);
  const response = await requestPlatform(`/api/v1/organizations/${encodeURIComponent(organizationId.data)}/invitations?${search}`, token, requestId);
  if (response.status === 200 && !PlatformInvitationListSchema.safeParse(response.body).success) return NextResponse.json({ error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an unexpected response.' } }, { status: 502, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } });
  return NextResponse.json(response.body, { status: response.status, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } });
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'This invitation request is not allowed.' } }, { status: 403, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const { organizationId: rawId } = await context.params;
  const organizationId = OrganizationIdSchema.safeParse(rawId);
  const idempotencyKey = PlatformIdempotencyKeySchema.safeParse(request.headers.get('idempotency-key'));
  const creation = PlatformCreateInvitationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!organizationId.success) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Organization was not found.' } }, { status: 404, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  if (!idempotencyKey.success || !creation.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Invitation request is invalid.' } }, { status: 400, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const token = await currentSessionToken();
  if (!token) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } }, { status: 401, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const response = await requestPlatform(`/api/v1/organizations/${encodeURIComponent(organizationId.data)}/invitations`, token, requestId, { method: 'POST', body: creation.data, idempotencyKey: idempotencyKey.data });
  if ((response.status === 200 || response.status === 201) && !PlatformCreateInvitationResponseSchema.safeParse(response.body).success) return NextResponse.json({ error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an unexpected response.' } }, { status: 502, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } });
  return NextResponse.json(response.body, { status: response.status, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } });
}
