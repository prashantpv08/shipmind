import { NextResponse } from 'next/server';
import { OrganizationIdSchema, PlatformGovernanceListQuerySchema, PlatformMemberListSchema } from '@/src/platform/contracts';
import { requestPlatform, safeRequestId } from '@/src/platform/request';
import { currentSessionToken } from '@/src/platform/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  const { organizationId: rawId } = await context.params;
  const organizationId = OrganizationIdSchema.safeParse(rawId);
  const query = PlatformGovernanceListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!organizationId.success) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Organization was not found.' } }, { status: 404, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  if (!query.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Member list query is invalid.' } }, { status: 400, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const token = await currentSessionToken();
  if (!token) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } }, { status: 401, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const search = new URLSearchParams({ limit: String(query.data.limit) });
  if (query.data.cursor) search.set('cursor', query.data.cursor);
  const response = await requestPlatform(`/api/v1/organizations/${encodeURIComponent(organizationId.data)}/members?${search}`, token, requestId);
  if (response.status === 200 && !PlatformMemberListSchema.safeParse(response.body).success) return NextResponse.json({ error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an unexpected response.' } }, { status: 502, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } });
  return NextResponse.json(response.body, { status: response.status, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } });
}
