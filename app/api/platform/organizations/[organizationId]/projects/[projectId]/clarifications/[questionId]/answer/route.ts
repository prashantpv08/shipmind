import { NextResponse } from 'next/server';

import {
  OrganizationIdSchema,
  PlatformAnswerClarificationRequestSchema,
  PlatformClarificationAnswerResponseSchema,
  PlatformClarificationQuestionIdSchema,
  PlatformIdempotencyKeySchema,
  PlatformProjectEtagSchema,
  PlatformProjectIdSchema,
} from '@/src/platform/contracts';
import { isSameOriginMutation } from '@/src/platform/local-session';
import { requestPlatform, safeRequestId } from '@/src/platform/request';
import { currentSessionToken } from '@/src/platform/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; projectId: string; questionId: string }> }) {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'This clarification answer is not allowed.' } }, { status: 403, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const params = await context.params;
  const organizationId = OrganizationIdSchema.safeParse(params.organizationId);
  const projectId = PlatformProjectIdSchema.safeParse(params.projectId);
  const questionId = PlatformClarificationQuestionIdSchema.safeParse(params.questionId);
  if (!organizationId.success || !projectId.success || !questionId.success) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Project or clarification question was not found.' } }, { status: 404, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const ifMatch = PlatformProjectEtagSchema.safeParse(request.headers.get('if-match'));
  const idempotencyKey = PlatformIdempotencyKeySchema.safeParse(request.headers.get('idempotency-key'));
  const body = PlatformAnswerClarificationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!ifMatch.success || !ifMatch.data.startsWith(`"${projectId.data}:`) || !idempotencyKey.success || !body.success) return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'A valid answer, current project ETag, and idempotency key are required.' } }, { status: 400, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const token = await currentSessionToken();
  if (!token) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } }, { status: 401, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const response = await requestPlatform(
    `/api/v1/organizations/${encodeURIComponent(organizationId.data)}/projects/${encodeURIComponent(projectId.data)}/clarifications/${encodeURIComponent(questionId.data)}/answer`,
    token,
    requestId,
    { method: 'POST', body: body.data, ifMatch: ifMatch.data, idempotencyKey: idempotencyKey.data },
  );
  if (response.status === 200 && !PlatformClarificationAnswerResponseSchema.safeParse(response.body).success) return NextResponse.json({ error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an unexpected clarification response.' } }, { status: 502, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } });
  const headers: Record<string, string> = { 'cache-control': 'no-store', 'x-request-id': response.requestId };
  if (response.etag) headers.etag = response.etag;
  if (response.idempotencyReplayed) headers['idempotency-replayed'] = response.idempotencyReplayed;
  return NextResponse.json(response.body, { status: response.status, headers });
}
