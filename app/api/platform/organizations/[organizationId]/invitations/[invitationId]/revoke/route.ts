import { NextResponse } from 'next/server';
import { OrganizationIdSchema, PlatformInvitationEtagSchema, PlatformInvitationIdSchema, PlatformInvitationSchema } from '@/src/platform/contracts';
import { isSameOriginMutation } from '@/src/platform/local-session';
import { requestPlatform, safeRequestId } from '@/src/platform/request';
import { currentSessionToken } from '@/src/platform/session';

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; invitationId: string }> }) {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'This revocation request is not allowed.' } }, { status: 403, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const params = await context.params;
  const organizationId = OrganizationIdSchema.safeParse(params.organizationId);
  const invitationId = PlatformInvitationIdSchema.safeParse(params.invitationId);
  const ifMatch = PlatformInvitationEtagSchema.safeParse(request.headers.get('if-match'));
  if (!organizationId.success || !invitationId.success) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Invitation was not found.' } }, { status: 404, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  if (!ifMatch.success || !ifMatch.data.startsWith(`"${invitationId.data}:`)) return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'A current invitation ETag is required.' } }, { status: 400, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const token = await currentSessionToken();
  if (!token) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } }, { status: 401, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const response = await requestPlatform(`/api/v1/organizations/${encodeURIComponent(organizationId.data)}/invitations/${encodeURIComponent(invitationId.data)}/revoke`, token, requestId, { method: 'POST', ifMatch: ifMatch.data });
  if (response.status === 200 && !PlatformInvitationSchema.safeParse(response.body).success) return NextResponse.json({ error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an unexpected response.' } }, { status: 502, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } });
  const headers: Record<string, string> = { 'cache-control': 'no-store', 'x-request-id': response.requestId };
  if (response.etag) headers.etag = response.etag;
  return NextResponse.json(response.body, { status: response.status, headers });
}
