import { authenticateBff, bffError, bffRequestId, forwardPlatformResponse, parseOrganizationProjectIds, rejectCrossOriginMutation } from '@/src/platform/bff';
import { PlatformAnalysisRunIdSchema, PlatformAnalysisRunSchema } from '@/src/platform/contracts';
import * as platformSdk from '@/src/platform/generated/sdk.gen';
import { requestPlatform } from '@/src/platform/request';

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; projectId: string; runId: string }> }) {
  const requestId = bffRequestId(request);
  const originError = rejectCrossOriginMutation(request, requestId, 'This cancellation is not allowed.');
  if (originError) return originError;
  const params = await context.params;
  const { organizationId, projectId } = parseOrganizationProjectIds(params);
  const runId = PlatformAnalysisRunIdSchema.safeParse(params.runId);
  if (!organizationId.success || !projectId.success || !runId.success) return bffError(404, 'NOT_FOUND', 'Analysis run was not found.', requestId);
  const authentication = await authenticateBff(requestId);
  if (!authentication.success) return authentication.response;
  const response = await requestPlatform(
    (client) => platformSdk.cancelProjectAnalysisRun({ client, path: { organizationId: organizationId.data, projectId: projectId.data, runId: runId.data } }),
    authentication.token,
    requestId,
  );
  if (response.status === 200 && !PlatformAnalysisRunSchema.safeParse(response.body).success) return bffError(502, 'INVALID_PLATFORM_RESPONSE', 'The platform returned an unexpected cancellation state.', response.requestId);
  return forwardPlatformResponse(response);
}
