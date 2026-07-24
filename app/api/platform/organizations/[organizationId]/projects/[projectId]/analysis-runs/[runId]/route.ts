import { NextResponse } from 'next/server';

import { OrganizationIdSchema, PlatformAnalysisRunIdSchema, PlatformAnalysisRunSchema, PlatformProjectIdSchema } from '@/src/platform/contracts';
import { requestPlatform, safeRequestId } from '@/src/platform/request';
import { currentSessionToken } from '@/src/platform/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; projectId: string; runId: string }> }) {
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  const params = await context.params;
  const organizationId = OrganizationIdSchema.safeParse(params.organizationId);
  const projectId = PlatformProjectIdSchema.safeParse(params.projectId);
  const runId = PlatformAnalysisRunIdSchema.safeParse(params.runId);
  if (!organizationId.success || !projectId.success || !runId.success) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Analysis run was not found.' } }, { status: 404, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const token = await currentSessionToken();
  if (!token) return NextResponse.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } }, { status: 401, headers: { 'cache-control': 'no-store', 'x-request-id': requestId } });
  const response = await requestPlatform(`/api/v1/organizations/${encodeURIComponent(organizationId.data)}/projects/${encodeURIComponent(projectId.data)}/analysis-runs/${encodeURIComponent(runId.data)}`, token, requestId);
  if (response.status === 200 && !PlatformAnalysisRunSchema.safeParse(response.body).success) return NextResponse.json({ error: { code: 'INVALID_PLATFORM_RESPONSE', message: 'The platform returned an unexpected analysis run.' } }, { status: 502, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } });
  return NextResponse.json(response.body, { status: response.status, headers: { 'cache-control': 'no-store', 'x-request-id': response.requestId } });
}
