import { handleArchitectureMutation } from '@/src/platform/architecture-bff';

export const dynamic = 'force-dynamic';

export function POST(request: Request, context: { params: Promise<{ organizationId: string; projectId: string }> }) {
  return handleArchitectureMutation(request, context, 'generate');
}
