import { NextResponse } from 'next/server';

import {
  OrganizationIdSchema,
  PlatformApproveArtifactsRequestSchema,
  PlatformArtifactApprovalResponseSchema,
  PlatformArtifactGenerationResponseSchema,
  PlatformGenerateArtifactsRequestSchema,
  PlatformIdempotencyKeySchema,
  PlatformProjectEtagSchema,
  PlatformProjectIdSchema,
} from './contracts';
import { isSameOriginMutation } from './local-session';
import { requestPlatform, safeRequestId } from './request';
import { currentSessionToken } from './session';

type ArtifactAction = 'generate' | 'approve';
type ArtifactContext = { params: Promise<{ organizationId: string; projectId: string }> };

function errorResponse(status: number, code: string, message: string, requestId: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
}

export async function handleArtifactMutation(request: Request, context: ArtifactContext, action: ArtifactAction) {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  if (!isSameOriginMutation(request)) return errorResponse(403, 'FORBIDDEN', 'This artifact request is not allowed.', requestId);
  const params = await context.params;
  const organizationId = OrganizationIdSchema.safeParse(params.organizationId);
  const projectId = PlatformProjectIdSchema.safeParse(params.projectId);
  const idempotencyKey = PlatformIdempotencyKeySchema.safeParse(request.headers.get('idempotency-key'));
  const ifMatch = PlatformProjectEtagSchema.safeParse(request.headers.get('if-match'));
  const rawBody = await request.json().catch(() => null);
  const body = action === 'generate'
    ? PlatformGenerateArtifactsRequestSchema.safeParse(rawBody)
    : PlatformApproveArtifactsRequestSchema.safeParse(rawBody);
  if (!organizationId.success || !projectId.success) return errorResponse(404, 'NOT_FOUND', 'Project was not found.', requestId);
  if (!idempotencyKey.success || !ifMatch.success || !body.success) return errorResponse(400, 'INVALID_REQUEST', 'Artifact request is invalid.', requestId);
  const token = await currentSessionToken();
  if (!token) return errorResponse(401, 'UNAUTHENTICATED', 'Authentication is required.', requestId);
  const operation = action === 'generate' ? 'generations' : 'approvals';
  const response = await requestPlatform(
    `/api/v1/organizations/${encodeURIComponent(organizationId.data)}/projects/${encodeURIComponent(projectId.data)}/artifacts/${operation}`,
    token,
    requestId,
    { method: 'POST', body: body.data, idempotencyKey: idempotencyKey.data, ifMatch: ifMatch.data },
  );
  const responseSchema = action === 'generate' ? PlatformArtifactGenerationResponseSchema : PlatformArtifactApprovalResponseSchema;
  if (response.status === 201 && !responseSchema.safeParse(response.body).success) return errorResponse(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected artifact response.', response.requestId);
  const headers: Record<string, string> = { 'cache-control': 'no-store', 'x-request-id': response.requestId };
  if (response.etag) headers.etag = response.etag;
  if (response.idempotencyReplayed) headers['idempotency-replayed'] = response.idempotencyReplayed;
  return NextResponse.json(response.body, { status: response.status, headers });
}
