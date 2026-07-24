import { handleArtifactMutation } from '@/src/platform/artifact-bff';

export const dynamic = 'force-dynamic';

export function POST(request: Request, context: { params: Promise<{ organizationId: string; projectId: string }> }) {
  return handleArtifactMutation(request, context, 'generate');
}
