import { handleProjectLifecycleMutation } from '@/src/platform/project-lifecycle-bff';

export const dynamic = 'force-dynamic';

export function POST(
  request: Request,
  context: { params: Promise<{ organizationId: string; projectId: string }> },
) {
  return handleProjectLifecycleMutation(request, context, 'restore');
}
