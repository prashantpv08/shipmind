import { NextResponse } from 'next/server';

import { OrganizationIdSchema, PlatformIdempotencyKeySchema, PlatformProjectIdSchema, PlatformSourceListSchema, PlatformSourceSchema, PlatformUploadSourceRequestSchema } from '@/src/platform/contracts';
import { isSameOriginMutation } from '@/src/platform/local-session';
import { requestPlatform, safeRequestId } from '@/src/platform/request';
import { currentSessionToken } from '@/src/platform/session';

export const dynamic = 'force-dynamic';

function parseParams(params: { organizationId: string; projectId: string }) {
  return { organizationId: OrganizationIdSchema.safeParse(params.organizationId), projectId: PlatformProjectIdSchema.safeParse(params.projectId) };
}

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; projectId: string }> }) {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  const parsed = parseParams(await context.params);
  if (!parsed.organizationId.success || !parsed.projectId.success) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Project was not found.' } }, { status: 404, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const token = await currentSessionToken();
  if (!token) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } }, { status: 401, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const response = await requestPlatform(`/api/v1/organizations/${encodeURIComponent(parsed.organizationId.data)}/projects/${encodeURIComponent(parsed.projectId.data)}/sources`, token, requestId);
  if (response.status === 200 && !PlatformSourceListSchema.safeParse(response.body).success) return NextResponse.json({ error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an unexpected source list.' } }, { status: 502, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } });
  return NextResponse.json(response.body, { status: response.status, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } });
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; projectId: string }> }) {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'This source upload is not allowed.' } }, { status: 403, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const parsed = parseParams(await context.params);
  const idempotencyKey = PlatformIdempotencyKeySchema.safeParse(request.headers.get('idempotency-key'));
  const body = PlatformUploadSourceRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.organizationId.success || !parsed.projectId.success) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Project was not found.' } }, { status: 404, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  if (!idempotencyKey.success || !body.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Source upload request is invalid.' } }, { status: 400, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const token = await currentSessionToken();
  if (!token) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } }, { status: 401, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const response = await requestPlatform(`/api/v1/organizations/${encodeURIComponent(parsed.organizationId.data)}/projects/${encodeURIComponent(parsed.projectId.data)}/sources`, token, requestId, { method: 'POST', body: body.data, idempotencyKey: idempotencyKey.data });
  if (response.status === 201 && !PlatformSourceSchema.safeParse(response.body).success) return NextResponse.json({ error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an unexpected source.' } }, { status: 502, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } });
  const headers: Record<string, string> = { 'cache-control': 'no-store', 'x-request-id': response.requestId };
  if (response.idempotencyReplayed) headers['idempotency-replayed'] = response.idempotencyReplayed;
  return NextResponse.json(response.body, { status: response.status, headers });
}
