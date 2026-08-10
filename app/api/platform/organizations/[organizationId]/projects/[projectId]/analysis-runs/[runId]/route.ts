import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse, parseOrganizationProjectIds } from '@/src/platform/bff';
import { PlatformAnalysisRunIdSchema, PlatformAnalysisRunSchema } from '@/src/platform/contracts';
import * as platformSdk from '@/src/platform/generated/sdk.gen';
import { requestPlatform } from '@/src/platform/request';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ organizationId: string; projectId: string; runId: string }> }) {
  const requestId = bffRequestId(request);
  const params = await context.params;
  const { organizationId, projectId } = parseOrganizationProjectIds(params);
  const runId = PlatformAnalysisRunIdSchema.safeParse(params.runId);
  if (!organizationId.success || !projectId.success || !runId.success) return bffError(404, 'NOT_FOUND', 'Analysis run was not found.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const response = await requestPlatform(
    (client) => platformSdk.getProjectAnalysisRun({ client, path: { organizationId: organizationId.data, projectId: projectId.data, runId: runId.data } }),
    authentication.token,
    requestId,
  );
  if (response.status === 200 && !PlatformAnalysisRunSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected analysis run.', response.requestId);
  return forwardPlatformResponse(response);
}
